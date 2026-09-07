import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  loadReciterAudioData,
  buildAyahTimingsForSurah,
  getSurahAudioUrl,
  DEFAULT_RECITER_FILE_INDEX,
  type AyahTiming,
} from '@/lib/quran-audio-data';

/**
 * Foreground-only playback of a surah's continuous audio file, with per-ayah
 * seek/tracking derived from timing data, a selectable reciter, and
 * auto-advance to the next ayah when one finishes (so "read aloud" actually
 * continues through the surah instead of stopping after one verse). No
 * lock-screen/background controls and no word-level highlight yet (deferred,
 * matching the web app's own Phase 2 plan for those two).
 */
export function useQuranAudioPlayer(surahNumber: number, reciterFileIndex: number = DEFAULT_RECITER_FILE_INDEX) {
  const [timings, setTimings] = useState<AyahTiming[]>([]);
  const [mainAudioUrl, setMainAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const activeSourceRef = useRef<'main' | 'bismillah'>('main');
  const bismillahTimingRef = useRef<AyahTiming | null>(null);
  const timingsRef = useRef<AyahTiming[]>([]);
  const onSurahEndRef = useRef<(() => void) | null>(null);

  const player = useAudioPlayer(mainAudioUrl ?? undefined);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setActiveAyah(null);
    activeSourceRef.current = 'main';

    loadReciterAudioData(reciterFileIndex).then(({ surahMap, segmentMap }) => {
      if (cancelled) return;
      const t = buildAyahTimingsForSurah(surahMap, segmentMap, surahNumber, reciterFileIndex);
      bismillahTimingRef.current = t.find((x) => x.ayah === 0) ?? null;
      setTimings(t);
      timingsRef.current = t;
      setMainAudioUrl(getSurahAudioUrl(surahMap, surahNumber));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [surahNumber, reciterFileIndex]);

  const playFromAyah = useCallback(
    async (ayah: number) => {
      const timing = timingsRef.current.find((t) => t.ayah === ayah);
      if (!timing || !mainAudioUrl) return;

      if (timing.custom_audio_url) {
        activeSourceRef.current = 'bismillah';
        player.replace(timing.custom_audio_url);
        await player.seekTo(timing.timestamp_from / 1000);
      } else {
        if (activeSourceRef.current !== 'main') {
          activeSourceRef.current = 'main';
          player.replace(mainAudioUrl);
        }
        await player.seekTo(timing.timestamp_from / 1000);
      }
      player.play();
      setActiveAyah(ayah);
    },
    [mainAudioUrl, player]
  );

  // Track which ayah is currently sounding, hand off from the injected
  // Bismillah clip back to the main surah file, and auto-advance to the next
  // ayah (or notify the caller the surah has ended) once one finishes.
  useEffect(() => {
    const ms = status.currentTime * 1000;

    if (activeSourceRef.current === 'bismillah') {
      const bismillah = bismillahTimingRef.current;
      if (bismillah && status.playing && ms >= bismillah.timestamp_to - 150 && mainAudioUrl) {
        activeSourceRef.current = 'main';
        player.replace(mainAudioUrl);
        player.seekTo(0).then(() => player.play());
        setActiveAyah(1);
      }
      return;
    }

    const found = timingsRef.current.find((t) => t.ayah > 0 && ms >= t.timestamp_from && ms < t.timestamp_to);
    if (found && found.ayah !== activeAyah) setActiveAyah(found.ayah);

    if (status.didJustFinish) {
      const currentIdx = timingsRef.current.findIndex((t) => t.ayah === activeAyah);
      const next = currentIdx >= 0 ? timingsRef.current[currentIdx + 1] : undefined;
      if (next) {
        void playFromAyah(next.ayah);
      } else {
        onSurahEndRef.current?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.currentTime, status.didJustFinish]);

  const togglePlayPause = useCallback(() => {
    if (status.playing) player.pause();
    else player.play();
  }, [status.playing, player]);

  const nextAyah = useCallback(() => {
    if (activeAyah == null) return;
    const idx = timingsRef.current.findIndex((t) => t.ayah === activeAyah);
    const next = idx >= 0 ? timingsRef.current[idx + 1] : undefined;
    if (next) playFromAyah(next.ayah);
  }, [activeAyah, playFromAyah]);

  const prevAyah = useCallback(() => {
    if (activeAyah == null) return;
    const idx = timingsRef.current.findIndex((t) => t.ayah === activeAyah);
    const prev = idx > 0 ? timingsRef.current[idx - 1] : undefined;
    if (prev && prev.ayah > 0) playFromAyah(prev.ayah);
  }, [activeAyah, playFromAyah]);

  const isLastAyah = activeAyah != null && timings.length > 0 && activeAyah === timings[timings.length - 1]?.ayah;
  const isFirstAyah = activeAyah != null && (timings.find((t) => t.ayah > 0)?.ayah ?? 1) === activeAyah;

  /** Fires once the surah's last ayah finishes playing — the caller (which owns cross-surah navigation) hooks this to advance to the next surah. */
  const setOnSurahEnd = useCallback((cb: (() => void) | null) => {
    onSurahEndRef.current = cb;
  }, []);

  return {
    isLoading,
    activeAyah,
    playing: status.playing,
    playFromAyah,
    togglePlayPause,
    pause: player.pause,
    nextAyah,
    prevAyah,
    isFirstAyah,
    isLastAyah,
    setOnSurahEnd,
  };
}
