import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  loadReciterAudioData,
  buildAyahTimingsForSurah,
  getSurahAudioUrl,
  type AyahTiming,
} from '@/lib/quran-audio-data';

/**
 * Foreground-only playback of a surah's continuous audio file, with per-ayah
 * seek/tracking derived from timing data. No lock-screen/background controls
 * and no word-level highlight yet (see Phase 2 plan — both deferred).
 */
export function useQuranAudioPlayer(surahNumber: number) {
  const [timings, setTimings] = useState<AyahTiming[]>([]);
  const [mainAudioUrl, setMainAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const activeSourceRef = useRef<'main' | 'bismillah'>('main');
  const bismillahTimingRef = useRef<AyahTiming | null>(null);

  const player = useAudioPlayer(mainAudioUrl ?? undefined);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setActiveAyah(null);
    activeSourceRef.current = 'main';

    loadReciterAudioData().then(({ surahMap, segmentMap }) => {
      if (cancelled) return;
      const t = buildAyahTimingsForSurah(surahMap, segmentMap, surahNumber);
      bismillahTimingRef.current = t.find((x) => x.ayah === 0) ?? null;
      setTimings(t);
      setMainAudioUrl(getSurahAudioUrl(surahMap, surahNumber));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [surahNumber]);

  // Track which ayah is currently sounding, and hand off from the injected
  // Bismillah clip (a different audio source) back to the main surah file.
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

    const found = timings.find((t) => t.ayah > 0 && ms >= t.timestamp_from && ms < t.timestamp_to);
    if (found && found.ayah !== activeAyah) setActiveAyah(found.ayah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.currentTime]);

  const playFromAyah = useCallback(
    async (ayah: number) => {
      const timing = timings.find((t) => t.ayah === ayah);
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
    [timings, mainAudioUrl, player]
  );

  const togglePlayPause = useCallback(() => {
    if (status.playing) player.pause();
    else player.play();
  }, [status.playing, player]);

  return {
    isLoading,
    activeAyah,
    playing: status.playing,
    playFromAyah,
    togglePlayPause,
    pause: player.pause,
  };
}
