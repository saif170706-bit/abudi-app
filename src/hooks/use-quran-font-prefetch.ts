'use client';

import { useEffect, useRef } from 'react';

/**
 * Task 20 — PWA Quran Offline Cache:
 * Prefetches Quran page fonts for the current page ± a window of adjacent pages
 * into the cache BEFORE the user swipes to them, ensuring zero-flash rendering.
 *
 * The service worker (sw-quran-cache.js) handles the actual caching.
 * This hook just triggers the fetches on page change.
 *
 * @param currentPage - 1-based Quran page number (1-604)
 * @param prefetchWindow - number of adjacent pages to prefetch (default: 2 ahead, 1 behind)
 */
export function useQuranFontPrefetch(currentPage: number, prefetchWindow = 2) {
  const prefetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!currentPage || currentPage < 1 || currentPage > 604) return;

    const pagesToPrefetch = new Set<number>();

    // Current page + next N + previous 1
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(604, currentPage + prefetchWindow); i++) {
      if (!prefetchedRef.current.has(i)) {
        pagesToPrefetch.add(i);
      }
    }

    if (pagesToPrefetch.size === 0) return;

    // Use requestIdleCallback to avoid blocking main thread
    const prefetch = () => {
      pagesToPrefetch.forEach((page) => {
        // Touch the font URL — the service worker intercepts and caches it
        fetch(`/fonts/p${page}.ttf`, {
          method: 'GET',
          cache: 'force-cache',
          // Priority hint (Chrome only, ignored elsewhere)
          // @ts-ignore
          priority: page === currentPage ? 'high' : 'low',
        })
          .then(() => prefetchedRef.current.add(page))
          .catch(() => { /* silent: offline or font missing */ });
      });
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const t = setTimeout(prefetch, 100);
      return () => clearTimeout(t);
    }
  }, [currentPage, prefetchWindow]);
}

/**
 * Task 20 — Send TRIM_CACHE message to service worker after every 50 page turns
 * to prevent unbounded cache growth.
 */
let pageViewCount = 0;

export function notifySwPageView() {
  pageViewCount++;
  if (pageViewCount % 50 === 0 && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'TRIM_CACHE' });
    });
  }
}
