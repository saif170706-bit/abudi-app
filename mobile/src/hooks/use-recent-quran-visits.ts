import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecentQuranVisit = {
  page: number;
  surahName?: string;
  at: number; // epoch ms
};

const STORAGE_KEY = 'recent_quran_visits_v1';
const MAX_ITEMS = 3;

function safeParse(json: string | null): RecentQuranVisit[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x.page === 'number' && Number.isFinite(x.page))
      .map((x) => ({
        page: x.page,
        surahName: typeof x.surahName === 'string' ? x.surahName : undefined,
        at: typeof x.at === 'number' ? x.at : Date.now(),
      }))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

/**
 * Tracks the last few unique pages/surahs the user visited in the Quran
 * reader (deduped by page and by surah so scrolling within one surah
 * doesn't flood the list, most recent first).
 */
export function useRecentQuranVisits() {
  const [visits, setVisits] = useState<RecentQuranVisit[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      loadedRef.current = true;
      setVisits(safeParse(raw));
    });
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(visits)).catch(() => {});
  }, [visits]);

  const addVisit = useCallback((page: number, surahName?: string) => {
    setVisits((prev) => {
      const filtered = prev.filter((v) => {
        const isSamePage = v.page === page;
        const isSameSurah = surahName && v.surahName === surahName;
        return !isSamePage && !isSameSurah;
      });
      return [{ page, surahName, at: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clearVisits = useCallback(() => {
    setVisits([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return { visits, addVisit, clearVisits };
}
