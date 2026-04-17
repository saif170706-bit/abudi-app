'use client';

import useSWR from 'swr';
import type { Reciter } from '@/lib/data';

export type RecitationTimestamp = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  segments: Array<[number, number, number]>;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    // Include status code in error (better than statusText alone)
    throw new Error(`Failed to fetch recitation data: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

export function useRecitationData(reciter: Reciter | null, chapterNumber?: number | string) {
  // This hook is now less critical as everyayah URLs are built client-side,
  // but we update the fetcher URL to be correct in case it's used elsewhere.
  const key =
    reciter && chapterNumber
      ? `https://www.everyayah.com/data/quran_words_timing/${reciter.id}/${chapterNumber}.json`
      : null;

  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    timestamps: data as RecitationTimestamp[] | undefined,
    error,
    isLoading,
  };
}
