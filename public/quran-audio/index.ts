import type { Reciter } from "@/lib/data";

import surah1 from "@/lib/QuranAudio/1surah.json";
import segments1 from "@/lib/QuranAudio/1segments.json";
import surah2 from "@/lib/QuranAudio/2surah.json";
import segments2 from "@/lib/QuranAudio/2segments.json";
import surah3 from "@/lib/QuranAudio/3surah.json";
import segments3 from "@/lib/QuranAudio/3segments.json";
import surah4 from "@/lib/QuranAudio/4surah.json";
import segments4 from "@/lib/QuranAudio/4segments.json";
import surah5 from "@/lib/QuranAudio/5surah.json";
import segments5 from "@/lib/QuranAudio/5segments.json";
import surah6 from "@/lib/QuranAudio/6surah.json";
import segments6 from "@/lib/QuranAudio/6segments.json";
import surah7 from "@/lib/QuranAudio/7surah.json";
import segments7 from "@/lib/QuranAudio/7segments.json";
import surah8 from "@/lib/QuranAudio/8surah.json";
import segments8 from "@/lib/QuranAudio/8segments.json";

import surah10 from "@/lib/QuranAudio/10surah.json";
import segments10 from "@/lib/QuranAudio/10segments.json";
import surah11 from "@/lib/QuranAudio/11surah.json";
import segments11 from "@/lib/QuranAudio/11segments.json";
import surah12 from "@/lib/QuranAudio/12surah.json";
import segments12 from "@/lib/QuranAudio/12segments.json";
import surah13 from "@/lib/QuranAudio/13surah.json";
import segments13 from "@/lib/QuranAudio/13segments.json";
import surah14 from "@/lib/QuranAudio/14surah.json";
import segments14 from "@/lib/QuranAudio/14segments.json";
import surah15 from "@/lib/QuranAudio/15surah.json";
import segments15 from "@/lib/QuranAudio/15segments.json";
import surah16 from "@/lib/QuranAudio/16surah.json";
import segments16 from "@/lib/QuranAudio/16segments.json";
import surah17 from "@/lib/QuranAudio/17surah.json";
import segments17 from "@/lib/QuranAudio/17segments.json";
import surah18 from "@/lib/QuranAudio/18surah.json";
import segments18 from "@/lib/QuranAudio/18segments.json";
import surah19 from "@/lib/QuranAudio/19surah.json";
import segments19 from "@/lib/QuranAudio/19segments.json";
import surah20 from "@/lib/QuranAudio/20surah.json";
import segments20 from "@/lib/QuranAudio/20segments.json";
import surah21 from "@/lib/QuranAudio/21surah.json";
import segments21 from "@/lib/QuranAudio/21segments.json";
import surah22 from "@/lib/QuranAudio/22surah.json";
import segments22 from "@/lib/QuranAudio/22segments.json";
import surah23 from "@/lib/QuranAudio/23surah.json";
import segments23 from "@/lib/QuranAudio/23segments.json";
import surah24 from "@/lib/QuranAudio/24surah.json";
import segments24 from "@/lib/QuranAudio/24segments.json";
import surah25 from "@/lib/QuranAudio/25surah.json";
import segments25 from "@/lib/QuranAudio/25segments.json";
import surah26 from "@/lib/QuranAudio/26surah.json";
import segments26 from "@/lib/QuranAudio/26segments.json";
import surah27 from "@/lib/QuranAudio/27surah.json";
import segments27 from "@/lib/QuranAudio/27segments.json";
import surah28 from "@/lib/QuranAudio/28surah.json";
import segments28 from "@/lib/QuranAudio/28segments.json";
import surah29 from "@/lib/QuranAudio/29surah.json";
import segments29 from "@/lib/QuranAudio/29segments.json";
import surah30 from "@/lib/QuranAudio/30surah.json";
import segments30 from "@/lib/QuranAudio/30segments.json";
import surah31 from "@/lib/QuranAudio/31surah.json";
import segments31 from "@/lib/QuranAudio/31segments.json";
import surah32 from "@/lib/QuranAudio/32surah.json";
import segments32 from "@/lib/QuranAudio/32segments.json";
import surah33 from "@/lib/QuranAudio/33surah.json";
import segments33 from "@/lib/QuranAudio/33segments.json";
import surah34 from "@/lib/QuranAudio/34surah.json";
import segments34 from "@/lib/QuranAudio/34segments.json";
import surah35 from "@/lib/QuranAudio/35surah.json";
import segments35 from "@/lib/QuranAudio/35segments.json";
import surah36 from "@/lib/QuranAudio/36surah.json";
import segments36 from "@/lib/QuranAudio/36segments.json";
import surah37 from "@/lib/QuranAudio/37surah.json";
import segments37 from "@/lib/QuranAudio/37segments.json";
import surah38 from "@/lib/QuranAudio/38surah.json";
import segments38 from "@/lib/QuranAudio/38segments.json";
import surah39 from "@/lib/QuranAudio/39surah.json";
import segments39 from "@/lib/QuranAudio/39segments.json";

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

const AUDIO_DATA_BY_INDEX: Record<
  number,
  { surahMap: RawSurahAudioMap; segmentMap: RawSegmentMap }
> = {
  1: { surahMap: surah1 as RawSurahAudioMap, segmentMap: segments1 as RawSegmentMap },
  2: { surahMap: surah2 as RawSurahAudioMap, segmentMap: segments2 as RawSegmentMap },
  3: { surahMap: surah3 as RawSurahAudioMap, segmentMap: segments3 as RawSegmentMap },
  4: { surahMap: surah4 as RawSurahAudioMap, segmentMap: segments4 as RawSegmentMap },
  5: { surahMap: surah5 as RawSurahAudioMap, segmentMap: segments5 as RawSegmentMap },
  6: { surahMap: surah6 as RawSurahAudioMap, segmentMap: segments6 as RawSegmentMap },
  7: { surahMap: surah7 as RawSurahAudioMap, segmentMap: segments7 as RawSegmentMap },
  8: { surahMap: surah8 as RawSurahAudioMap, segmentMap: segments8 as RawSegmentMap },

  10: { surahMap: surah10 as RawSurahAudioMap, segmentMap: segments10 as RawSegmentMap },
  11: { surahMap: surah11 as RawSurahAudioMap, segmentMap: segments11 as RawSegmentMap },
  12: { surahMap: surah12 as RawSurahAudioMap, segmentMap: segments12 as RawSegmentMap },
  13: { surahMap: surah13 as RawSurahAudioMap, segmentMap: segments13 as RawSegmentMap },
  14: { surahMap: surah14 as RawSurahAudioMap, segmentMap: segments14 as RawSegmentMap },
  15: { surahMap: surah15 as RawSurahAudioMap, segmentMap: segments15 as RawSegmentMap },
  16: { surahMap: surah16 as RawSurahAudioMap, segmentMap: segments16 as RawSegmentMap },
  17: { surahMap: surah17 as RawSurahAudioMap, segmentMap: segments17 as RawSegmentMap },
  18: { surahMap: surah18 as RawSurahAudioMap, segmentMap: segments18 as RawSegmentMap },
  19: { surahMap: surah19 as RawSurahAudioMap, segmentMap: segments19 as RawSegmentMap },
  20: { surahMap: surah20 as RawSurahAudioMap, segmentMap: segments20 as RawSegmentMap },
  21: { surahMap: surah21 as RawSurahAudioMap, segmentMap: segments21 as RawSegmentMap },
  22: { surahMap: surah22 as RawSurahAudioMap, segmentMap: segments22 as RawSegmentMap },
  23: { surahMap: surah23 as RawSurahAudioMap, segmentMap: segments23 as RawSegmentMap },
  24: { surahMap: surah24 as RawSurahAudioMap, segmentMap: segments24 as RawSegmentMap },
  25: { surahMap: surah25 as RawSurahAudioMap, segmentMap: segments25 as RawSegmentMap },
  26: { surahMap: surah26 as RawSurahAudioMap, segmentMap: segments26 as RawSegmentMap },
  27: { surahMap: surah27 as RawSurahAudioMap, segmentMap: segments27 as RawSegmentMap },
  28: { surahMap: surah28 as RawSurahAudioMap, segmentMap: segments28 as RawSegmentMap },
  29: { surahMap: surah29 as RawSurahAudioMap, segmentMap: segments29 as RawSegmentMap },
  30: { surahMap: surah30 as RawSurahAudioMap, segmentMap: segments30 as RawSegmentMap },
  31: { surahMap: surah31 as RawSurahAudioMap, segmentMap: segments31 as RawSegmentMap },
  32: { surahMap: surah32 as RawSurahAudioMap, segmentMap: segments32 as RawSegmentMap },
  33: { surahMap: surah33 as RawSurahAudioMap, segmentMap: segments33 as RawSegmentMap },
  34: { surahMap: surah34 as RawSurahAudioMap, segmentMap: segments34 as RawSegmentMap },
  35: { surahMap: surah35 as RawSurahAudioMap, segmentMap: segments35 as RawSegmentMap },
  36: { surahMap: surah36 as RawSurahAudioMap, segmentMap: segments36 as RawSegmentMap },
  37: { surahMap: surah37 as RawSurahAudioMap, segmentMap: segments37 as RawSegmentMap },
  38: { surahMap: surah38 as RawSurahAudioMap, segmentMap: segments38 as RawSegmentMap },
  39: { surahMap: surah39 as RawSurahAudioMap, segmentMap: segments39 as RawSegmentMap },
};

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

export function parseKey(key: string): { surah: number; ayah: number } | null {
  const [s, a] = String(key).split(":");
  const surah = Number(s);
  const ayah = Number(a);
  if (!Number.isFinite(surah) || !Number.isFinite(ayah)) return null;
  return { surah, ayah };
}

export function getReciterFileIndex(reciter: Reciter | undefined): number | null {
  if (!reciter) return 1; // Default fallback

  const fileIndex = Number(reciter.id);
  // If the ID isn't a valid number (e.g., an old string ID from localStorage),
  // we default to the first reciter index so the app doesn't crash.
  if (!Number.isFinite(fileIndex)) return 1;

  return AUDIO_DATA_BY_INDEX[fileIndex] ? fileIndex : 1;
}

export async function loadReciterAudioData(reciter: Reciter | undefined): Promise<{
  surahMap: RawSurahAudioMap;
  segmentMap: RawSegmentMap;
  fileIndex: number;
}> {
  let fileIndex = getReciterFileIndex(reciter);
  
  // Final safety check if index is valid in our static map
  if (!fileIndex || !AUDIO_DATA_BY_INDEX[fileIndex]) {
    fileIndex = 1; 
  }

  const data = AUDIO_DATA_BY_INDEX[fileIndex];

  return {
    surahMap: data.surahMap,
    segmentMap: data.segmentMap,
    fileIndex,
  };
}

export function getSurahAudioUrl(
  surahMap: RawSurahAudioMap,
  surahNumber: number
): string | null {
  return surahMap[String(surahNumber)]?.audio_url ?? null;
}

function toAyahTiming(key: string, raw: RawSegmentEntry): AyahTiming | null {
  const parsed = parseKey(key);
  if (!parsed) return null;

  // For the first ayah of any surah, we always start from 10ms to catch
  // any Basmalah that might be included in the audio file before the segment.
  const start = parsed.ayah === 1 ? 10 : raw.timestamp_from;
  const end = raw.timestamp_to;

  const durationMs =
    typeof raw.duration_ms === "number" && parsed.ayah !== 1
      ? raw.duration_ms
      : Math.max(0, end - start);

  const durationSec =
    typeof raw.duration_sec === "number" && parsed.ayah !== 1
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

function findNextExisting(
  map: Map<number, AyahTiming>,
  ayah: number,
  maxAyah: number
): AyahTiming | null {
  for (let i = ayah + 1; i <= maxAyah; i++) {
    const found = map.get(i);
    if (found) return found;
  }
  return null;
}

export function buildAyahTimingsForSurah(
  surahMap: RawSurahAudioMap,
  segmentMap: RawSegmentMap,
  surahNumber: number,
  reciterId?: string | number
): AyahTiming[] {
  const expectedAyahCount = SURAH_AYAH_COUNTS[surahNumber];
  if (!expectedAyahCount) return [];

  const existing: AyahTiming[] = [];
  for (let a = 1; a <= expectedAyahCount; a++) {
    const key = `${surahNumber}:${a}`;
    const raw = segmentMap[key];
    if (raw) {
      const timing = toAyahTiming(key, raw);
      if (timing) existing.push(timing);
    }
  }

  const byAyah = new Map<number, AyahTiming>();
  for (const item of existing) {
    byAyah.set(item.ayah, item);
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
      const end =
        ayah === missingEndAyah
          ? next.timestamp_from
          : Math.round(prev.timestamp_to + slot * (offsetIndex + 1));

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
      continue;
    }

    if (prev && !next) {
      const start = prev.timestamp_to;
      result.push({
        key: `${surahNumber}:${ayah}`,
        surah: surahNumber,
        ayah,
        timestamp_from: start,
        timestamp_to: start,
        duration_ms: 0,
        duration_sec: 0,
        segments: [],
        synthetic: true,
      });
      continue;
    }

    if (!prev && next) {
      const end = next.timestamp_from;
      result.push({
        key: `${surahNumber}:${ayah}`,
        surah: surahNumber,
        ayah,
        timestamp_from: 0,
        timestamp_to: end,
        duration_ms: Math.max(0, end),
        duration_sec: Math.max(0, Math.round(end / 1000)),
        segments: [],
        synthetic: true,
      });
      continue;
    }

    // No context at all (entire surah missing or just start/end missing with no anchors)
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

  result = result.sort((a, b) => a.ayah - b.ayah);

  // INJECT BASMALAH logic
  // These reciters already have Basmalah built into their surah audio files.
  const EXCLUDED_RECITER_IDS = [
    "12", "13", "14", "17", "18", "19", "21", "22", "23", "27", "29", "31", "33", "36", "37", "39"
  ];
  const isExcluded = EXCLUDED_RECITER_IDS.includes(String(reciterId));

  if (surahNumber > 1 && surahNumber !== 9 && !isExcluded) {
    const rawData = segmentMap[`${surahNumber}:1`];
    // If it starts very early (< 500ms) or is missing from segment map, it likely lacks Basmalah
    if (!rawData || rawData.timestamp_from < 500) {
      const raw11 = segmentMap["1:1"];
      const s1Url = getSurahAudioUrl(surahMap, 1);
      if (raw11 && s1Url) {
        const bismillah = toAyahTiming("1:1", raw11);
        if (bismillah) {
          bismillah.key = `${surahNumber}:0`; // Virtual key for Basmalah
          bismillah.surah = surahNumber; // Associate with current surah
          bismillah.ayah = 0;
          bismillah.custom_audio_url = s1Url;
          result.unshift(bismillah);
        }
      }
    }
  }

  return result;
}