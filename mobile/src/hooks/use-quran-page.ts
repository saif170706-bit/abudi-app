import { useEffect, useState } from 'react';
import { ensurePageAssets, prefetchPage, type QuranPageData } from '@/lib/quran-asset-cache';

interface UseQuranPageResult {
  data: QuranPageData | null;
  isLoading: boolean;
  error: Error | null;
}

/** Downloads/caches a page's font+data on demand and prefetches its neighbors. */
export function useQuranPage(pageNumber: number): UseQuranPageResult {
  const [data, setData] = useState<QuranPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    ensurePageAssets(pageNumber)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    prefetchPage(pageNumber - 1);
    prefetchPage(pageNumber + 1);

    return () => {
      cancelled = true;
    };
  }, [pageNumber]);

  return { data, isLoading, error };
}
