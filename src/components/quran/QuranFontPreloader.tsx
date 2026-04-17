'use client';

import { useEffect, useState } from 'react';
import { useQuranData } from '@/context/QuranDataContext';
import { findPageForVerse } from '@/lib/utils';
import type { Assignment } from '@/types';

interface QuranFontPreloaderProps {
  assignments?: Assignment[];
  lastReadPage?: number;
}

export default function QuranFontPreloader({ assignments, lastReadPage }: QuranFontPreloaderProps) {
  const { quranData } = useQuranData();
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!quranData || typeof document === 'undefined') return;

    // 1. Determine which pages we want to "warm up"
    const pagesToLoad = new Set<number>();

    // Current page and next 2 pages (for smoothness)
    if (lastReadPage) {
      pagesToLoad.add(lastReadPage);
      if (lastReadPage < 604) pagesToLoad.add(lastReadPage + 1);
      if (lastReadPage < 603) pagesToLoad.add(lastReadPage + 2);
    } else {
      // Default to Page 1 and 2 if no history
      pagesToLoad.add(1);
      pagesToLoad.add(2);
    }

    // Assignments pages
    if (assignments && assignments.length > 0) {
      assignments.slice(0, 3).forEach(a => {
         const surahNum = quranData.allSurahs.find(s => s.name === a.hifz.surahName)?.number;
         if (surahNum) {
            const startPage = findPageForVerse(surahNum, a.hifz.fromAyah);
            if (startPage) {
              pagesToLoad.add(startPage);
              if (startPage < 604) pagesToLoad.add(startPage + 1);
            }
         }
      });
    }

    // 2. Load the fonts in the background
    const loadNextPage = async (page: number) => {
      if (preloadedPages.has(page)) return;
      const fontName = `1em QuranPage${page}`;
      try {
        // This triggers the browser to download the font file quietly
        await document.fonts.load(fontName);
        setPreloadedPages(prev => new Set(prev).add(page));
      } catch (e) {
        // Ignore errors, it's just a prefetch
      }
    };

    // We process them one by one to avoid network congestion
    const processQueue = async () => {
      for (const page of Array.from(pagesToLoad)) {
        await loadNextPage(page);
      }
    };

    // Use a multi-stage delay: 
    // 1. Wait for a generous 5 seconds after dashboard mount
    // 2. Use requestIdleCallback to wait for the browser to be truly 'free'
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          processQueue();
        }, { timeout: 10000 });
      } else {
        processQueue();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [quranData, lastReadPage, assignments]);

  return null; // Invisible component
}
