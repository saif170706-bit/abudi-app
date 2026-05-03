"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { reciters } from "@/app/lib/reciters";
import type { Reciter } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Rewind, FastForward, ListMusic, Star, Timer, X } from "lucide-react";

import surahData from "@/lib/surah-data.json";
import { PAGE_START_KEY_BY_PAGE as PAGE_START_KEY } from "@/lib/page-start-keys.generated";
import { useLanguage, type Language } from "@/context/LanguageContext";
import {
  buildAyahTimingsForSurah,
  getSurahAudioUrl,
  loadReciterAudioData,
  parseKey,
  type AyahTiming,
  type RawSegmentMap,
  type RawSurahAudioMap,
} from "@/lib/QuranAudio";

type Mode = "continuous" | "selectionOnce" | "selectionLoop";

export type AudioPlayerHandle = {
  playFromVerseKey: (verseKey: string) => void;
  playSelectionOnce: (verseKeys: string[]) => void;
  playSelectionLoop: (verseKeys: string[]) => void;
  clearSelectionMode: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  nextAyah: () => void;
  prevAyah: () => void;
};

type Props = {
  orderedKeys: string[];
  onVersePlay: (verseKey: string | null) => void;
  onTimeUpdate?: (timeSeconds: number, verseKey: string) => void;
  currentPageNumber: number;
};

const translations: Record<string, Record<Language, string>> = {
  audioSettings: { da: "Lydindstillinger", en: "Audio Settings", ar: "إعدادات الصوت", so: "Settings-ka Codka" },
  reciter: { da: "Oplæser", en: "Reciter", ar: "القارئ", so: "Akhriye" },
  selectReciter: { da: "Vælg oplæser", en: "Select reciter", ar: "اختر القارئ", so: "Doorashada Akhriye" },
  speed: { da: "Hastighed", en: "Speed", ar: "السرعة", so: "Xawaaraha" },
  selectSpeed: { da: "Vælg hastighed", en: "Select speed", ar: "اختر السرعة", so: "Dooro Xawaaraha" },
  loading: { da: "Indlæser reciter-data...", en: "Loading reciter audio data...", ar: "جاري تحميل بيانات القارئ...", so: "Soo dejinta xogta codka akhriyaha..." },
  sleepTimer: { da: "Sluk-timer", en: "Sleep Timer", ar: "مؤقت النوم", so: "Tiimaarka Hurdada" },
  timerOff: { da: "Slukket", en: "Off", ar: "إيقاف", so: "Dami" },
  favourites: { da: "Favoritter", en: "Favourites", ar: "المفضلة", so: "Jecelaalaha" },
  allReciters: { da: "Alle oplæsere", en: "All Reciters", ar: "جميع القراء", so: "Dhammaan" },
};

const SLEEP_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 time', minutes: 60 },
];




function normalizeKeys(keys: string[]): string[] {
  const clean = keys
    .map((k) => String(k).trim())
    .filter((k) => !!parseKey(k));
  return Array.from(new Set(clean));
}

const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(
  ({ orderedKeys, onVersePlay, onTimeUpdate, currentPageNumber }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const rafRef = useRef<number | null>(null);
    const ayahIndexRef = useRef(0);
    const reciterChangePendingRef = useRef(false);
    const isSeekingRef = useRef(false);

    const surahMapRef = useRef<RawSurahAudioMap | null>(null);
    const segmentMapRef = useRef<RawSegmentMap | null>(null);

    const { language } = useLanguage();
    const t = (key: string) => translations[key]?.[language] || translations[key]?.en;

    const DEFAULT_RECITER_ID = reciters[0]?.id ?? "";

    const [reciterId, setReciterId] = useState<string>(() => {
      if (typeof window === "undefined") return DEFAULT_RECITER_ID;
      return localStorage.getItem("selected_reciter_id") ?? DEFAULT_RECITER_ID;
    });

    // ── Task 17: Reciter Favourites ──────────────────────────────────────
    const [favouriteIds, setFavouriteIds] = useState<string[]>(() => {
      if (typeof window === "undefined") return [];
      try { return JSON.parse(localStorage.getItem("reciter_favourites") ?? "[]"); }
      catch { return []; }
    });

    const toggleFavourite = useCallback((id: string) => {
      setFavouriteIds(prev => {
        const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
        localStorage.setItem("reciter_favourites", JSON.stringify(next));
        return next;
      });
    }, []);

    // ── Task 16: Sleep Timer ─────────────────────────────────────────────
    const [sleepMinutes, setSleepMinutes] = useState(0);
    const [sleepSecondsLeft, setSleepSecondsLeft] = useState(0);
    const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearSleepTimer = useCallback(() => {
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      setSleepSecondsLeft(0);
      setSleepMinutes(0);
    }, []);

    const startSleepTimer = useCallback((minutes: number, stopFn: () => void) => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      if (minutes === 0) { clearSleepTimer(); return; }

      const totalSeconds = minutes * 60;
      setSleepSecondsLeft(totalSeconds);
      setSleepMinutes(minutes);

      sleepTimerRef.current = setInterval(() => {
        setSleepSecondsLeft(prev => {
          if (prev <= 1) {
            if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
            sleepTimerRef.current = null;
            setSleepMinutes(0);
            stopFn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, [clearSleepTimer]);

    // Cleanup on unmount
    useEffect(() => { return () => clearSleepTimer(); }, [clearSleepTimer]);


    useEffect(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("selected_reciter_id", reciterId);
      }
    }, [reciterId]);

    const selectedReciter = useMemo(
      () => reciters.find((r) => r.id === reciterId) ?? reciters[0],
      [reciterId]
    );

    const fallbackKey = useMemo(() => orderedKeys?.[0] ?? "1:1", [orderedKeys]);

    const [currentKey, setCurrentKey] = useState<string>(fallbackKey);
    const currentKeyRef = useRef(currentKey);
    useEffect(() => {
      currentKeyRef.current = currentKey;
    }, [currentKey]);

    const [mode, setMode] = useState<Mode>("continuous");
    const modeRef = useRef<Mode>("continuous");
    const [selection, setSelection] = useState<string[] | null>(null);
    const selectionRef = useRef<string[] | null>(null);

    const [sessionActive, setSessionActiveState] = useState(false);
    const sessionActiveRef = useRef(false);
    const setSessionActive = (val: boolean) => {
      sessionActiveRef.current = val;
      setSessionActiveState(val);
    };

    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    const [audioReady, setAudioReady] = useState(false);
    const [loadingAudioData, setLoadingAudioData] = useState(false);
    const [isChangingReciter, setIsChangingReciter] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);

    const ayahTimingsRef = useRef<AyahTiming[]>([]);
    const [surahAudioUrl, setSurahAudioUrl] = useState<string | null>(null);
    const [ayahTimings, setAyahTimings] = useState<AyahTiming[]>([]);

    const setModeBoth = useCallback((m: Mode) => {
      modeRef.current = m;
      setMode(m);
    }, []);

    const setSelectionBoth = useCallback((sel: string[] | null) => {
      selectionRef.current = sel;
      setSelection(sel);
    }, []);

    const startKey = PAGE_START_KEY[currentPageNumber] ?? "1:1";

    const currentSurah = useMemo(() => {
      const parsed = parseKey(currentKey);
      return parsed?.surah ?? 1;
    }, [currentKey]);

    const ayahIndexByKey = useMemo(() => {
      const map = new Map<string, number>();
      ayahTimings.forEach((ayah, index) => map.set(ayah.key, index));
      return map;
    }, [ayahTimings]);

    const getAyahByKey = useCallback(
      (key: string) => ayahTimings[ayahIndexByKey.get(key) ?? -1] ?? null,
      [ayahTimings, ayahIndexByKey]
    );

    const stopRaf = useCallback(() => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }, []);

    const ensureAudioDataLoaded = useCallback(
      async (reciter: Reciter | undefined) => {
        setLoadingAudioData(true);
        setAudioError(null);

        try {
          const { surahMap, segmentMap } = await loadReciterAudioData(reciter);
          surahMapRef.current = surahMap;
          segmentMapRef.current = segmentMap;
          setAudioReady(true);
          return { surahMap, segmentMap };
        } catch (error) {
          console.error(error);
          surahMapRef.current = null;
          segmentMapRef.current = null;
          setAudioReady(false);
          setAudioError(
            error instanceof Error ? error.message : "Failed to load Quran audio data."
          );
          return null;
        } finally {
          setLoadingAudioData(false);
        }
      },
      []
    );

    useEffect(() => {
      let cancelled = false;

      const handleReciterChange = async () => {
        reciterChangePendingRef.current = true;
        setIsChangingReciter(true);

        stopRaf();
        setIsPlaying(false);
        setSessionActive(false);
        setAudioReady(false);
        setAudioError(null);
        setAyahTimings([]);
        setSurahAudioUrl(null);
        ayahIndexRef.current = 0;

        const desired = PAGE_START_KEY[currentPageNumber] ?? fallbackKey;
        setCurrentKey(desired);
        currentKeyRef.current = desired;

        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        }

        const data = await ensureAudioDataLoaded(selectedReciter);

        if (cancelled) return;

        if (data) {
          // Immediately sync the state with the newly loaded reciter maps
          const url = getSurahAudioUrl(data.surahMap, currentSurah);
          const timings = buildAyahTimingsForSurah(data.surahMap, data.segmentMap, currentSurah, selectedReciter?.id);
          setSurahAudioUrl(url);
          setAyahTimings(timings);
          ayahTimingsRef.current = timings;
          
          const idx = timings.findIndex((a) => a.key === currentKeyRef.current);
          ayahIndexRef.current = idx >= 0 ? idx : 0;
        }

        reciterChangePendingRef.current = false;
        setIsChangingReciter(false);
      };

      handleReciterChange();

      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedReciter]);

    useEffect(() => {
      if (!audioReady || !surahMapRef.current || !segmentMapRef.current) {
        setSurahAudioUrl(null);
        setAyahTimings([]);
        return;
      }

      const url = getSurahAudioUrl(surahMapRef.current, currentSurah);
      const timings = buildAyahTimingsForSurah(surahMapRef.current, segmentMapRef.current, currentSurah, selectedReciter?.id);

      setSurahAudioUrl(url);
      setAyahTimings(timings);
      ayahTimingsRef.current = timings;

      const idx = timings.findIndex((a) => a.key === currentKeyRef.current);
      ayahIndexRef.current = idx >= 0 ? idx : 0;
    }, [audioReady, currentSurah]);

    // Important:
    // when the user manually changes page while NOT currently playing,
    // keep the player ready by updating the idle currentKey to that page start.
    // NOTE: We deliberately use sessionActiveRef.current (the ref, not state)
    // to avoid stale closure issues on Android where the state may lag the ref.
    useEffect(() => {
      // Use the REF here, not the state variable. On Android, the state update
      // from stop() can arrive asynchronously, so we trust the ref which is
      // set synchronously.
      if (!audioReady || sessionActiveRef.current || isChangingReciter) return;

      const desired = PAGE_START_KEY[currentPageNumber] ?? fallbackKey;
      if (!desired) return;

      // Extra safety: don't update if the session became active between the
      // check above and now (unlikely but possible on slow Android devices)
      if (sessionActiveRef.current) return;

      setCurrentKey(desired);
      currentKeyRef.current = desired;

      const parsed = parseKey(desired);
      if (!parsed || !segmentMapRef.current || !surahMapRef.current) return;

      const timings = buildAyahTimingsForSurah(surahMapRef.current, segmentMapRef.current, parsed.surah, selectedReciter?.id);
      setAyahTimings(timings);
      ayahTimingsRef.current = timings;
      setSurahAudioUrl(getSurahAudioUrl(surahMapRef.current, parsed.surah));

      const idx = timings.findIndex((a) => a.key === desired);
      ayahIndexRef.current = idx >= 0 ? idx : 0;
    }, [currentPageNumber, fallbackKey, audioReady, sessionActive, isChangingReciter]);

    const getActiveAyahIndex = useCallback(
      (currentMs: number) => {
        if (!ayahTimings.length) return -1;

        const time = currentMs + 20;
        const audio = audioRef.current;
        const currentSrc = audio?.getAttribute("src");

        let i = ayahIndexRef.current;
        if (i >= ayahTimings.length) i = ayahTimings.length - 1;
        if (i < 0) i = 0;

        // Verify if current ayah still matches time AND source URL
        const current = ayahTimings[i];
        if (current) {
          const expectedUrl = current.custom_audio_url || surahAudioUrl;
          if (
            currentSrc === expectedUrl &&
            time >= current.timestamp_from &&
            time < current.timestamp_to
          ) {
            return i;
          }
        }

        // If not valid, look for the first one that matches both source and time
        const bestIdx = ayahTimings.findIndex((a) => {
          const url = a.custom_audio_url || surahAudioUrl;
          return url === currentSrc && time >= a.timestamp_from && time < a.timestamp_to;
        });

        if (bestIdx !== -1) {
          ayahIndexRef.current = bestIdx;
          return bestIdx;
        }

        // Fallback: previous sequential logic if no URL match
        if (i < ayahTimings.length - 1 && time >= ayahTimings[i + 1].timestamp_from) {
          i++;
        } else if (i > 0 && time < ayahTimings[i].timestamp_from) {
          i--;
        }

        ayahIndexRef.current = i;
        return i;
      },
      [ayahTimings, surahAudioUrl]
    );

    const indexInOrder = useCallback(
      (k: string) => (orderedKeys || []).indexOf(k),
      [orderedKeys]
    );

    const nextContinuous = useCallback(
      (cur: string) => {
        const i = indexInOrder(cur);
        if (i < 0) return null;
        return orderedKeys[i + 1] ?? null;
      },
      [orderedKeys, indexInOrder]
    );

    const prevContinuous = useCallback(
      (cur: string) => {
        const i = indexInOrder(cur);
        if (i <= 0) return null;
        return orderedKeys[i - 1] ?? null;
      },
      [orderedKeys, indexInOrder]
    );

    const getNextKey = useCallback(
      (key: string): string | null => {
        const currentMode = modeRef.current;
        if (currentMode === "continuous") {
          const nk = nextContinuous(key);
          if (nk) return nk;

          const index = ayahIndexByKey.get(key);
          if (index == null) return null;
          if (ayahTimings[index + 1]) {
            return ayahTimings[index + 1].key;
          }

          const parsed = parseKey(key);
          if (parsed && parsed.surah < 114) {
            return `${parsed.surah + 1}:1`;
          }
          return null;
        }

        if (currentMode === "selectionOnce" || currentMode === "selectionLoop") {
          const sel = selectionRef.current;
          if (!sel) return null;
          const idx = sel.indexOf(key);
          if (idx > -1 && idx < sel.length - 1) return sel[idx + 1];
          if (currentMode === "selectionLoop") return sel[0] ?? null;
        }

        return null;
      },
      [nextContinuous, ayahIndexByKey, ayahTimings]
    );

    const getPrevKey = useCallback(
      (key: string): string | null => {
        const currentMode = modeRef.current;
        if (currentMode === "continuous") {
          const pk = prevContinuous(key);
          if (pk) return pk;

          const index = ayahIndexByKey.get(key);
          if (index == null || index < 0) return null;
          if (index > 0) return ayahTimings[index - 1].key;

          const parsed = parseKey(key);
          if (parsed && parsed.surah > 1) {
            return `${parsed.surah - 1}:1`;
          }
          return null;
        }

        if (currentMode === "selectionOnce" || currentMode === "selectionLoop") {
          const sel = selectionRef.current;
          if (!sel) return null;
          const idx = sel.indexOf(key);
          if (idx > 0) return sel[idx - 1];
        }

        return null;
      },
      [prevContinuous, ayahIndexByKey, ayahTimings]
    );

    const stop = useCallback(() => {
      const audio = audioRef.current;

      // 1. Kill the session state FIRST — this is critical on Android.
      // Any async audio callbacks (onEnded, timeupdate) that fire AFTER this
      // point will check sessionActiveRef.current and bail out early.
      sessionActiveRef.current = false;
      setSessionActiveState(false);

      stopRaf();
      // Clear isSeekingRef so we don't block future seeks
      isSeekingRef.current = false;
      setModeBoth("continuous");
      setSelectionBoth(null);
      setIsPlaying(false);
      onVersePlay(null);
      setAudioError(null);

      // 2. CLEAR MEDIA SESSION (Lock screen / notification area)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      }

      // 3. KILL THE AUDIO ELEMENT
      // On Android, calling audio.load() after removing src fires spurious
      // 'ended' and 'play' events. We only pause and clear currentTime.
      // The src is left intact — it will be replaced on the next seekToAyah call.
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        // Do NOT call audio.load() here — it triggers Android's media session
        // and can fire spurious 'ended' events causing unintended playback.
      }

      // 4. FORCE RESYNC TO CURRENT PAGE
      const idleStart = PAGE_START_KEY[currentPageNumber] || fallbackKey || "1:1";
      setCurrentKey(idleStart);
      currentKeyRef.current = idleStart;

      const parsed = parseKey(idleStart);
      if (parsed && segmentMapRef.current && surahMapRef.current) {
         const timings = buildAyahTimingsForSurah(surahMapRef.current, segmentMapRef.current, parsed.surah, selectedReciter?.id);
         setAyahTimings(timings);
         ayahTimingsRef.current = timings;
         const idx = timings.findIndex((a) => a.key === idleStart);
         ayahIndexRef.current = idx >= 0 ? idx : 0;
      }
    }, [currentPageNumber, onVersePlay, setModeBoth, setSelectionBoth, stopRaf, selectedReciter?.id, fallbackKey]);

    const ensureAudioUrlLoaded = useCallback(
      async (url: string) => {
        const audio = audioRef.current;
        if (!audio) return false;

        const currentSrcAttr = audio.getAttribute("src") || "";
        if (currentSrcAttr === url) {
          // Android: even if src matches, ensure it's truly ready
          if (audio.readyState >= 1) return true;
          // Wait for it to become ready
          await new Promise<void>((resolve, reject) => {
            const onReady = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); reject(new Error(`Audio not ready: ${url}`)); };
            const cleanup = () => {
              audio.removeEventListener("loadedmetadata", onReady);
              audio.removeEventListener("canplay", onReady);
              audio.removeEventListener("error", onError);
            };
            audio.addEventListener("loadedmetadata", onReady, { once: true });
            audio.addEventListener("canplay", onReady, { once: true });
            audio.addEventListener("error", onError, { once: true });
          });
          return true;
        }

        // Android requires both src assignment + load(), then we wait for canplay
        // (loadedmetadata alone is not enough to seek reliably on Android Chrome)
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error(`Failed to load audio URL: ${url}`));
          };
          const cleanup = () => {
            audio.removeEventListener("canplay", onLoaded);
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("error", onError);
          };

          // Listen for whichever fires first — canplay is more reliable on Android
          audio.addEventListener("canplay", onLoaded, { once: true });
          audio.addEventListener("loadedmetadata", onLoaded, { once: true });
          audio.addEventListener("error", onError, { once: true });
          audio.src = url;
          audio.load();
        });

        return true;
      },
      []
    );

    const seekToAyah = useCallback(
      async (verseKey: string, autoplay = true) => {
        const parsed = parseKey(verseKey);
        const audio = audioRef.current;
        const segmentMap = segmentMapRef.current;
        const surahMap = surahMapRef.current;

        if (!parsed || !audio || !segmentMap || !surahMap) return;

        // If the session has been killed while we were waiting (e.g. stop() was called),
        // do not continue. This is the primary Android race-condition guard.
        if (!sessionActiveRef.current && autoplay) return;

        isSeekingRef.current = true;

        let timingsForSurah = ayahTimingsRef.current;
        if (!timingsForSurah.length || (timingsForSurah[0].surah !== parsed.surah && timingsForSurah.every(a => a.surah !== parsed.surah))) {
            timingsForSurah = buildAyahTimingsForSurah(surahMap, segmentMap, parsed.surah, selectedReciter?.id);
            setAyahTimings(timingsForSurah);
            ayahTimingsRef.current = timingsForSurah;
        }
        const indexMap = new Map<string, number>();
        timingsForSurah.forEach((item, index) => indexMap.set(item.key, index));
        let targetIndex = indexMap.get(verseKey) ?? -1;
        
        // If the target is Verse 1 and we have an injected Basmalah, 
        // we should actually seek to the Basmalah first if it's the start of the surah session.
        if (parsed.ayah === 1 && !sessionActiveRef.current && timingsForSurah[0]?.ayah === 0) {
            targetIndex = 0;
            verseKey = timingsForSurah[0].key;
        }

        const target = timingsForSurah[targetIndex];

        if (!target) {
          setAudioError(`Missing timing for ayah ${verseKey}.`);
          isSeekingRef.current = false;
          return;
        }

        const targetUrl = target.custom_audio_url || getSurahAudioUrl(surahMap, parsed.surah);
        if (!targetUrl) {
            setAudioError(`Missing audio URL for ayah ${verseKey}.`);
            isSeekingRef.current = false;
            return;
        }

        try {
          const success = await ensureAudioUrlLoaded(targetUrl);
          if (!success) {
            isSeekingRef.current = false;
            return;
          }

          // Re-check session state after the async load — Android can take a while
          if (!sessionActiveRef.current && autoplay) {
            isSeekingRef.current = false;
            return;
          }

          setAyahTimings(timingsForSurah);
          setSurahAudioUrl(getSurahAudioUrl(surahMap, parsed.surah));
          ayahIndexRef.current = targetIndex >= 0 ? targetIndex : 0;
          setCurrentKey(verseKey);
          currentKeyRef.current = verseKey;

          // Use a promise-based seeked wait so isSeekingRef is cleared reliably on Android
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              isSeekingRef.current = false;
              audio.removeEventListener("seeked", onSeeked);
              resolve();
            };
            // Fallback: if seeked never fires (Android quirk), clear after 500ms
            const fallback = setTimeout(() => {
              isSeekingRef.current = false;
              audio.removeEventListener("seeked", onSeeked);
              resolve();
            }, 500);
            audio.addEventListener("seeked", onSeeked, { once: true });
            audio.currentTime = target.timestamp_from / 1000;
            // Clear fallback if seeked fired
            audio.addEventListener("seeked", () => clearTimeout(fallback), { once: true });
          });

          if (autoplay) {
            // Final session check before actually playing
            if (!sessionActiveRef.current) return;
            try {
              await audio.play();
            } catch (err: any) {
              if (err.name !== "AbortError") {
                console.error("Audio play error:", err);
              }
            }
          }
        } catch (err) {
          setAudioError(err instanceof Error ? err.message : String(err));
          isSeekingRef.current = false;
        }
      },
      [ensureAudioUrlLoaded, sessionActive]
    );

    const handlePlaybackSync = useCallback(() => {
      const audio = audioRef.current;
      if (!audio || !ayahTimings.length) return;
      if (isSeekingRef.current) return;

      const currentMs = audio.currentTime * 1000;
      const activeIndex = getActiveAyahIndex(currentMs);
      const activeAyah = ayahTimings[activeIndex] ?? null;

      if (activeAyah) {
        onTimeUpdate?.(audio.currentTime, activeAyah.key);

        const mode = modeRef.current;
        const sel = selectionRef.current;

        if (mode === "selectionLoop" && sel) {
          const isLastInSel = activeAyah.key === sel[sel.length - 1];
          // Use a larger 500ms window for background execution robustness
          if (isLastInSel && currentMs >= activeAyah.timestamp_to - 500) {
            void seekToAyah(sel[0], true);
            return;
          }
        } else if (mode === "selectionOnce" && sel) {
          const isLastInSel = activeAyah.key === sel[sel.length - 1];
          if (isLastInSel && currentMs >= activeAyah.timestamp_to - 200) {
            stop();
            return;
          }
        }
      }

      if (activeAyah && activeAyah.key !== currentKeyRef.current) {
        const desiredUrl = activeAyah.custom_audio_url || surahAudioUrl;
        const currentSrc = audio.getAttribute("src");
        
        if (desiredUrl && currentSrc !== desiredUrl) {
            void seekToAyah(activeAyah.key, true);
            return;
        }

        const mode = modeRef.current;
        const sel = selectionRef.current;

        if ((mode === "selectionLoop" || mode === "selectionOnce") && sel) {
          if (sel.includes(activeAyah.key)) {
            setCurrentKey(activeAyah.key);
            currentKeyRef.current = activeAyah.key;
          }
        } else {
          setCurrentKey(activeAyah.key);
          currentKeyRef.current = activeAyah.key;
        }
      }
    }, [ayahTimings, getActiveAyahIndex, onTimeUpdate, seekToAyah, stop, surahAudioUrl]);

    const syncActiveAyah = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(syncActiveAyah);
      }
      
      handlePlaybackSync();
    }, [handlePlaybackSync]);

    const onTimeUpdateEv = useCallback(() => {
        // On Android, both RAF (60fps) and timeupdate fire simultaneously,
        // which doubles the JS work on the main thread and causes audio buffer
        // underruns that sound like micro-pauses between ayahs.
        //
        // Rule: timeupdate only drives handlePlaybackSync when RAF is NOT running
        // (e.g. screen locked, tab backgrounded). When RAF is active it already
        // handles everything — the timeupdate path is only a background fallback.
        if (rafRef.current !== null) return;
        handlePlaybackSync();
    }, [handlePlaybackSync]);

    const startRaf = useCallback(() => {
      stopRaf();
      rafRef.current = requestAnimationFrame(syncActiveAyah);
    }, [stopRaf, syncActiveAyah]);

    const playFromVerseKey = useCallback(
      async (key: string) => {
        if (loadingAudioData || !audioReady || isChangingReciter) return;
        setSessionActive(true);
        setModeBoth("continuous");
        setSelectionBoth(null);
        await seekToAyah(key, true);
      },
      [loadingAudioData, audioReady, isChangingReciter, seekToAyah, setModeBoth, setSelectionBoth]
    );

    const playSelection = useCallback(
      async (keys: string[], loop: boolean) => {
        if (loadingAudioData || !audioReady || isChangingReciter) return;
        const sel = normalizeKeys(keys);
        if (!sel.length) return;
        setSessionActive(true);
        setModeBoth(loop ? "selectionLoop" : "selectionOnce");
        setSelectionBoth(sel);
        await seekToAyah(sel[0], true);
      },
      [loadingAudioData, audioReady, isChangingReciter, seekToAyah, setModeBoth, setSelectionBoth]
    );

    const pause = useCallback(() => {
      audioRef.current?.pause();
    }, []);

    const resume = useCallback(async () => {
      if (loadingAudioData || !audioReady || isChangingReciter) return;
      const audio = audioRef.current;
      if (!audio) return;

      if (!audio.getAttribute("src")) {
        await playFromVerseKey(currentKeyRef.current);
        return;
      }

      try {
        await audio.play();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Audio resume error:", err);
        }
      }
    }, [loadingAudioData, audioReady, isChangingReciter, playFromVerseKey]);

    const togglePlayPause = useCallback(async () => {
      if (loadingAudioData || !audioReady || isChangingReciter) return;
      const audio = audioRef.current;
      if (!sessionActiveRef.current) {
        // Ensure starting play ALWAYS syncs to the latest page start if we were idle
        const desired = PAGE_START_KEY[currentPageNumber] ?? currentKeyRef.current;
        await playFromVerseKey(desired);
        return;
      }
      if (audio?.paused) {
        await resume();
      } else {
        pause();
      }
    }, [loadingAudioData, audioReady, isChangingReciter, pause, resume, playFromVerseKey, currentPageNumber]);

    const nextAyah = useCallback(async () => {
      if (loadingAudioData || !audioReady || isChangingReciter) return;
      const nextKey = getNextKey(currentKeyRef.current);
      if (!nextKey) {
        stop();
        return;
      }
      await seekToAyah(nextKey, sessionActiveRef.current && !audioRef.current?.paused);
    }, [loadingAudioData, audioReady, isChangingReciter, getNextKey, seekToAyah, stop]);

    const prevAyah = useCallback(async () => {
      if (loadingAudioData || !audioReady || isChangingReciter) return;
      const prevKey = getPrevKey(currentKeyRef.current);
      if (!prevKey) return;
      await seekToAyah(prevKey, sessionActiveRef.current && !audioRef.current?.paused);
    }, [loadingAudioData, audioReady, isChangingReciter, getPrevKey, seekToAyah]);

    const onPlay = useCallback(() => {
      setIsPlaying(true);
      startRaf();
    }, [startRaf]);

    const onPauseEv = useCallback(() => {
      setIsPlaying(false);
      stopRaf();
    }, [stopRaf]);

    const onEnded = useCallback(async () => {
      if (loadingAudioData || !audioReady || isChangingReciter) return;

      // Android fires 'ended' asynchronously — by the time it arrives, stop()
      // may have already been called. Guard against this.
      if (!sessionActiveRef.current) return;

      const mode = modeRef.current;
      const sel = selectionRef.current;

      if (mode === "selectionLoop" && sel) {
        await seekToAyah(sel[0], true);
        return;
      } else if (mode === "selectionOnce" && sel) {
        stop();
        return;
      }

      const nextKey = getNextKey(currentKeyRef.current);
      if (!nextKey) {
        stop();
        return;
      }
      await seekToAyah(nextKey, true);
    }, [loadingAudioData, audioReady, isChangingReciter, getNextKey, seekToAyah, stop]);

    const onLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
      (e.target as HTMLAudioElement).playbackRate = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
      }
    }, [playbackRate]);

    useEffect(() => {
      onVersePlay(sessionActive ? currentKey : null);
    }, [sessionActive, currentKey, onVersePlay]);

    useEffect(() => {
      return () => stopRaf();
    }, [stopRaf]);

    useImperativeHandle(
      ref,
      () => ({
        playFromVerseKey,
        playSelectionOnce: (keys) => playSelection(keys, false),
        playSelectionLoop: (keys) => playSelection(keys, true),
        clearSelectionMode: () => {
          setModeBoth("continuous");
          setSelectionBoth(null);
        },
        stop,
        pause,
        resume,
        nextAyah,
        prevAyah,
      }),
      [playFromVerseKey, playSelection, setModeBoth, setSelectionBoth, stop, pause, resume, nextAyah, prevAyah]
    );

    // Important fix:
    // don't disable just because surahAudioUrl is temporarily out of state-sync during page changes.
    const canPlay = audioReady && !loadingAudioData && !isChangingReciter && !audioError;

    // High-level stable refs for Media Session handlers
    const resumeRef = useRef(resume);
    const pauseRef = useRef(pause);
    const prevAyahRef = useRef(prevAyah);
    const nextAyahRef = useRef(nextAyah);
    
    useEffect(() => {
      resumeRef.current = resume;
      pauseRef.current = pause;
      prevAyahRef.current = prevAyah;
      nextAyahRef.current = nextAyah;
    }, [resume, pause, prevAyah, nextAyah]);

    useEffect(() => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }, [isPlaying]);

    useEffect(() => {
      if (!('mediaSession' in navigator)) return;

      if (!sessionActive) {
        navigator.mediaSession.metadata = null;
        return;
      }

      const currentAyah = getAyahByKey(currentKey);
      const [sNumStr] = currentKey.split(':');
      const sNum = parseInt(sNumStr, 10);
      const surahInfo = surahData.find(s => s.number === sNum);

      const surahName = surahInfo ? surahInfo.name : `Surah ${sNum}`;
      const ayahNum = currentAyah ? currentAyah.ayah : '...';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${surahName} - Ayah ${ayahNum}`,
        artist: selectedReciter?.name || 'Quran',
        album: 'Ibn Amer Quran',
        artwork: [
          { src: '/pwa/ibn-amer-logo.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }, [currentKey, selectedReciter, getAyahByKey, sessionActive]);

    useEffect(() => {
      if (!('mediaSession' in navigator)) return;

      navigator.mediaSession.setActionHandler('play', () => resumeRef.current());
      navigator.mediaSession.setActionHandler('pause', () => pauseRef.current());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevAyahRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextAyahRef.current());
      navigator.mediaSession.setActionHandler('seekbackward', () => prevAyahRef.current());
      navigator.mediaSession.setActionHandler('seekforward', () => nextAyahRef.current());

      return () => {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      };
    }, []);

    return (
      <div className="w-full pb-4 pt-2">
        <audio
          ref={audioRef}
          preload="auto"
          onPlay={onPlay}
          onPause={onPauseEv}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdateEv}
          onLoadedMetadata={onLoadedMetadata}
        />

        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center justify-start flex-1 min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-16 h-16 sm:w-20 sm:h-20 relative">
                  <ListMusic className="w-8 h-8 sm:w-10 sm:h-10" />
                  {sleepSecondsLeft > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none">
                      {Math.ceil(sleepSecondsLeft / 60)}m
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuLabel>{t("audioSettings")}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* ── Reciter (with favourites) ── */}
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <div className="w-full space-y-2">
                    <Label>{t("reciter")}</Label>
                    <Select value={reciterId} onValueChange={setReciterId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectReciter")} />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Favourites section */}
                        {favouriteIds.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                              ★ {t("favourites")}
                            </div>
                            {reciters
                              .filter(r => favouriteIds.includes(r.id))
                              .map(r => (
                                <SelectItem key={`fav-${r.id}`} value={r.id}>
                                  <div className="flex items-center gap-2">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                                    <span className="truncate">{r.name}{r.style && ` (${r.style})`}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            <div className="h-px bg-border mx-2 my-1" />
                            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              {t("allReciters")}
                            </div>
                          </>
                        )}
                        {/* All reciters */}
                        {reciters.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2 w-full">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleFavourite(r.id); }}
                                className="shrink-0 p-0.5 rounded hover:bg-amber-50 transition-colors"
                                aria-label={favouriteIds.includes(r.id) ? "Remove from favourites" : "Add to favourites"}
                              >
                                <Star className={`h-3 w-3 ${favouriteIds.includes(r.id) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                              </button>
                              <span className="truncate">{r.name}{r.style && ` (${r.style})`}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuItem>

                {/* ── Playback speed ── */}
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <div className="w-full space-y-2">
                    <Label>{t("speed")}</Label>
                    <Select
                      value={String(playbackRate)}
                      onValueChange={(value) => setPlaybackRate(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectSpeed")} />
                      </SelectTrigger>
                      <SelectContent>
                        {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                          <SelectItem key={rate} value={String(rate)}>
                            {rate.toFixed(2)}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuItem>

                {/* ── Sleep Timer ── */}
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Timer className="h-3.5 w-3.5" />
                        {t("sleepTimer")}
                      </Label>
                      {sleepSecondsLeft > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-600">
                            {String(Math.floor(sleepSecondsLeft / 60)).padStart(2, '0')}:{String(sleepSecondsLeft % 60).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={clearSleepTimer}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SLEEP_OPTIONS.map(opt => (
                        <button
                          key={opt.minutes}
                          type="button"
                          onClick={() => opt.minutes === 0 ? clearSleepTimer() : startSleepTimer(opt.minutes, stop)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            (opt.minutes === 0 && sleepMinutes === 0) || (opt.minutes === sleepMinutes && sleepSecondsLeft > 0)
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>

          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-6">
            <Button variant="ghost" size="icon" className="w-16 h-16 sm:w-20 sm:h-20" onClick={prevAyah}>
              <Rewind className="w-10 h-10 sm:w-12 sm:h-12" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={togglePlayPause}
              className="w-20 h-20 sm:w-24 sm:h-24"
              disabled={!canPlay}
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 sm:w-12 sm:h-12" />
              ) : (
                <Play className="w-10 h-10 sm:w-12 sm:h-12" />
              )}
            </Button>

            <Button variant="ghost" size="icon" className="w-16 h-16 sm:w-20 sm:h-20" onClick={nextAyah}>
              <FastForward className="w-10 h-10 sm:w-12 sm:h-12" />
            </Button>
          </div>

          <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="w-16 h-16 sm:w-20 sm:h-20" onClick={stop}>
              <Square className="w-8 h-8 sm:w-10 sm:h-10" />
            </Button>
          </div>
        </div>

        {(loadingAudioData || audioError || isChangingReciter) && (
          <div className="text-center text-xs mt-1 text-muted-foreground">
            {loadingAudioData || isChangingReciter ? t("loading") : audioError}
          </div>
        )}
      </div>
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;