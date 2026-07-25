// Ported from src/lib/QuranAudio/index.ts (web app) — pure timing-computation
// logic, unchanged except for where the surah/segment JSON is fetched from
// (Firebase Storage instead of the web app's /public/quran-audio/).
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/client';

export type SegmentTuple = [number, number, number];

export type RawSegmentEntry = {
  segments?: SegmentTuple[];
  duration_sec?: number;
  duration_ms?: number;
  timestamp_from: number;
  timestamp_to: number;
};

export type RawSegmentMap = Record<string, RawSegmentEntry>;

export type RawSurahAudioEntry = {
  surah_number: number;
  audio_url: string;
  duration?: number;
};

export type RawSurahAudioMap = Record<string, RawSurahAudioEntry>;

export type AyahTiming = {
  key: string;
  surah: number;
  ayah: number;
  timestamp_from: number;
  timestamp_to: number;
  duration_ms: number;
  duration_sec: number;
  segments: SegmentTuple[];
  synthetic?: boolean;
  custom_audio_url?: string;
};

// Default reciter (Mishari Rashid al-`Afasy) — Phase 2 ships one fixed
// reciter; a picker UI is deferred, matching the web app's `reciters.ts`
// file-index scheme (`quran-audio/{fileIndex}{surah|segments}.json`).
export const DEFAULT_RECITER_FILE_INDEX = 10;

const SURAH_AYAH_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
  21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
  31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
  41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
  51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
  61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
  71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
  81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
  91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
  101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
  111: 5, 112: 4, 113: 5, 114: 6,
};

const audioDataCache = new Map<number, { surahMap: RawSurahAudioMap; segmentMap: RawSegmentMap }>();

export function parseKey(key: string): { surah: number; ayah: number } | null {
  const [s, a] = String(key).split(':');
  const surah = Number(s);
  const ayah = Number(a);
  if (!Number.isFinite(surah) || !Number.isFinite(ayah)) return null;
  return { surah, ayah };
}

/** Fetches surah + segment timing data for a reciter from Firebase Storage. Cached in-memory per session. */
export async function loadReciterAudioData(
  fileIndex: number = DEFAULT_RECITER_FILE_INDEX
): Promise<{ surahMap: RawSurahAudioMap; segmentMap: RawSegmentMap }> {
  const cached = audioDataCache.get(fileIndex);
  if (cached) return cached;

  const [surahUrl, segmentUrl] = await Promise.all([
    getDownloadURL(ref(storage, `quran-assets/audio-timing/${fileIndex}surah.json`)),
    getDownloadURL(ref(storage, `quran-assets/audio-timing/${fileIndex}segments.json`)),
  ]);
  const [surahRes, segmentRes] = await Promise.all([fetch(surahUrl), fetch(segmentUrl)]);
  const [surahMap, segmentMap] = await Promise.all([
    surahRes.json() as Promise<RawSurahAudioMap>,
    segmentRes.json() as Promise<RawSegmentMap>,
  ]);

  const result = { surahMap, segmentMap };
  audioDataCache.set(fileIndex, result);
  return result;
}

export function getSurahAudioUrl(surahMap: RawSurahAudioMap, surahNumber: number): string | null {
  return surahMap[String(surahNumber)]?.audio_url ?? null;
}

function toAyahTiming(key: string, raw: RawSegmentEntry): AyahTiming | null {
  const parsed = parseKey(key);
  if (!parsed) return null;

  const start = parsed.ayah === 1 ? 10 : raw.timestamp_from;
  const end = raw.timestamp_to;

  const durationMs =
    typeof raw.duration_ms === 'number' && parsed.ayah !== 1 ? raw.duration_ms : Math.max(0, end - start);
  const durationSec =
    typeof raw.duration_sec === 'number' && parsed.ayah !== 1
      ? raw.duration_sec
      : Math.max(0, Math.round(durationMs / 1000));

  return {
    key,
    surah: parsed.surah,
    ayah: parsed.ayah,
    timestamp_from: start,
    timestamp_to: end,
    duration_ms: durationMs,
    duration_sec: durationSec,
    segments: raw.segments ?? [],
  };
}

function findPreviousExisting(map: Map<number, AyahTiming>, ayah: number): AyahTiming | null {
  for (let i = ayah - 1; i >= 1; i--) {
    const found = map.get(i);
    if (found) return found;
  }
  return null;
}

function findNextExisting(map: Map<number, AyahTiming>, ayah: number, maxAyah: number): AyahTiming | null {
  for (let i = ayah + 1; i <= maxAyah; i++) {
    const found = map.get(i);
    if (found) return found;
  }
  return null;
}

const EXCLUDED_BASMALAH_RECITER_IDS = new Set([
  '12', '13', '14', '17', '18', '19', '21', '22', '23', '27', '29', '31', '33', '36', '37', '39',
]);

/** Builds a continuous, gap-filled ayah timing list for a surah, with a synthesized Bismillah lead-in. */
export function buildAyahTimingsForSurah(
  surahMap: RawSurahAudioMap,
  segmentMap: RawSegmentMap,
  surahNumber: number,
  reciterFileIndex: number = DEFAULT_RECITER_FILE_INDEX
): AyahTiming[] {
  const expectedAyahCount = SURAH_AYAH_COUNTS[surahNumber];
  if (!expectedAyahCount) return [];

  const byAyah = new Map<number, AyahTiming>();
  for (let a = 1; a <= expectedAyahCount; a++) {
    const raw = segmentMap[`${surahNumber}:${a}`];
    if (raw) {
      const timing = toAyahTiming(`${surahNumber}:${a}`, raw);
      if (timing) byAyah.set(a, timing);
    }
  }

  let result: AyahTiming[] = [];
  for (let ayah = 1; ayah <= expectedAyahCount; ayah++) {
    const present = byAyah.get(ayah);
    if (present) {
      result.push(present);
      continue;
    }

    const prev = findPreviousExisting(byAyah, ayah);
    const next = findNextExisting(byAyah, ayah, expectedAyahCount);

    if (prev && next) {
      const missingStartAyah = prev.ayah + 1;
      const missingEndAyah = next.ayah - 1;
      const missingCount = missingEndAyah - missingStartAyah + 1;
      const totalGap = Math.max(0, next.timestamp_from - prev.timestamp_to);
      const slot = missingCount > 0 ? totalGap / missingCount : 0;
      const offsetIndex = ayah - missingStartAyah;
      const start = Math.round(prev.timestamp_to + slot * offsetIndex);
      const end = ayah === missingEndAyah ? next.timestamp_from : Math.round(prev.timestamp_to + slot * (offsetIndex + 1));
      result.push({
        key: `${surahNumber}:${ayah}`,
        surah: surahNumber,
        ayah,
        timestamp_from: start,
        timestamp_to: end,
        duration_ms: Math.max(0, end - start),
        duration_sec: Math.max(0, Math.round((end - start) / 1000)),
        segments: [],
        synthetic: true,
      });
    } else if (prev && !next) {
      result.push({
        key: `${surahNumber}:${ayah}`,
        surah: surahNumber,
        ayah,
        timestamp_from: prev.timestamp_to,
        timestamp_to: prev.timestamp_to,
        duration_ms: 0,
        duration_sec: 0,
        segments: [],
        synthetic: true,
      });
    } else if (!prev && next) {
      result.push({
        key: `${surahNumber}:${ayah}`,
        surah: surahNumber,
        ayah,
        timestamp_from: 0,
        timestamp_to: next.timestamp_from,
        duration_ms: Math.max(0, next.timestamp_from),
        duration_sec: Math.max(0, Math.round(next.timestamp_from / 1000)),
        segments: [],
        synthetic: true,
      });
    } else {
      result.push({
        key: `${surahNumber}:${ayah}`,
        surah: surahNumber,
        ayah,
        timestamp_from: 0,
        timestamp_to: 0,
        duration_ms: 0,
        duration_sec: 0,
        segments: [],
        synthetic: true,
      });
    }
  }

  result = result.sort((a, b) => a.ayah - b.ayah);

  const isExcluded = EXCLUDED_BASMALAH_RECITER_IDS.has(String(reciterFileIndex));
  if (surahNumber > 1 && surahNumber !== 9 && !isExcluded) {
    const rawData = segmentMap[`${surahNumber}:1`];
    if (!rawData || rawData.timestamp_from < 500) {
      const raw11 = segmentMap['1:1'];
      const s1Url = getSurahAudioUrl(surahMap, 1);
      if (raw11 && s1Url) {
        const bismillah = toAyahTiming('1:1', raw11);
        if (bismillah) {
          bismillah.key = `${surahNumber}:0`;
          bismillah.surah = surahNumber;
          bismillah.ayah = 0;
          bismillah.custom_audio_url = s1Url;
          result.unshift(bismillah);
        }
      }
    }
  }

  return result;
}
