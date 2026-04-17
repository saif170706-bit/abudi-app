'use client';

import { useCallback, useEffect, useRef, useState } from "react";

export type RecentQuranVisit = {
  page: number;
  surahName?: string;
  at: number; // epoch ms
};

const STORAGE_KEY = "recent_quran_visits_v1";
const MAX_ITEMS = 3;

function safeParse(json: string | null): RecentQuranVisit[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x.page === "number" && Number.isFinite(x.page))
      .map((x) => ({
        page: x.page,
        surahName: typeof x.surahName === "string" ? x.surahName : undefined,
        at: typeof x.at === "number" ? x.at : Date.now(),
      }))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

/**
 * Hook til at håndtere listen over nyligt besøgte sider/Surahs i Koranen.
 * Indeholder "smart" logik, der sikrer at:
 * 1. En Surah kun optræder én gang i listen (den seneste position).
 * 2. Browsing/scrolling i samme Surah ikke fylder listen op med flere sider.
 * 3. Den seneste aktivitet altid rykker øverst.
 */
export function useRecentQuranVisits() {
  const [visits, setVisits] = useState<RecentQuranVisit[]>([]);
  const loadedRef = useRef(false);

  // Load ONLY once on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const initial =
      typeof window !== "undefined" ? safeParse(localStorage.getItem(STORAGE_KEY)) : [];
    setVisits(initial);
  }, []);

  // Persist to local storage whenever visits change
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    } catch {
      // ignore errors in private mode etc.
    }
  }, [visits]);

  /**
   * Tilføjer et besøg til listen med intelligent filtrering.
   */
  const addVisit = useCallback((page: number, surahName?: string) => {
    setVisits((prev) => {
      // Vi ønsker at fjerne eksisterende entries der enten har samme sidenummer
      // ELLER samme Surah-navn. Dette sikrer at "Nyligt besøgt" fungerer som en 
      // liste over de seneste unikke steder/Surahs man har været i gang med.
      const filtered = prev.filter((v) => {
        const isSamePage = v.page === page;
        const isSameSurah = surahName && v.surahName === surahName;
        return !isSamePage && !isSameSurah;
      });

      // Tilføj det nye besøg øverst
      const next: RecentQuranVisit[] = [
        { page, surahName, at: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      
      return next;
    });
  }, []);

  const clearVisits = useCallback(() => {
    setVisits([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { visits, addVisit, clearVisits };
}
