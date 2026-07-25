import pageData from '@/shared/page-data.json';

function parseVerseKey(key: string): { surah: number; ayah: number } {
  const [surah, ayah] = key.split(':').map(Number);
  return { surah, ayah };
}

/** Finds which Mushaf page a given surah:ayah falls on, using the bundled page-boundary table. */
export function findPageForVerse(surahNum: number, ayahNum: number): number | null {
  for (const pageStr in pageData) {
    const page = parseInt(pageStr, 10);
    const pageInfo = (pageData as Record<string, { start: string; end: string }>)[pageStr];
    const start = parseVerseKey(pageInfo.start);
    const end = parseVerseKey(pageInfo.end);

    if (surahNum === start.surah && surahNum === end.surah) {
      if (ayahNum >= start.ayah && ayahNum <= end.ayah) return page;
    } else if (start.surah !== end.surah) {
      if (surahNum === start.surah && ayahNum >= start.ayah) return page;
      if (surahNum === end.surah && ayahNum <= end.ayah) return page;
      if (surahNum > start.surah && surahNum < end.surah) return page;
    }
  }
  return null;
}
