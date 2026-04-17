
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import pageData from './page-data.json';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string | null | undefined = ''): string {
  if (!name) return '??';
  const nameParts = name.trim().split(' ');
  if (nameParts.length > 1) {
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }
  if (nameParts.length === 1 && nameParts[0].length > 1) {
    return (nameParts[0][0] + nameParts[0][1]).toUpperCase();
  }
  return name[0]?.toUpperCase() || '??';
}


export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

export function padNumber(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

function parseVerseKey(key: string): { surah: number; ayah: number } {
    const [surah, ayah] = key.split(':').map(Number);
    return { surah, ayah };
}

export function findPageForVerse(surahNum: number, ayahNum: number): number | null {
    if (!pageData) return null;

    for (const pageStr in pageData) {
        const page = parseInt(pageStr, 10);
        const pageInfo = (pageData as any)[pageStr];
        
        const start = parseVerseKey(pageInfo.start);
        const end = parseVerseKey(pageInfo.end);

        // Simple case: verse is within a page that contains only one surah
        if (surahNum === start.surah && surahNum === end.surah) {
            if (ayahNum >= start.ayah && ayahNum <= end.ayah) {
                return page;
            }
        }
        // Case where page contains the end of one surah and the start of another
        else if (start.surah !== end.surah) {
            if (surahNum === start.surah && ayahNum >= start.ayah) {
                return page;
            }
            if (surahNum === end.surah && ayahNum <= end.ayah) {
                return page;
            }
            // Case where the surah is entirely contained within this page range (e.g. short surahs)
            if (surahNum > start.surah && surahNum < end.surah) {
                return page;
            }
        }
    }
    return null; // Return null if no page is found
}
  