
// src/app/lib/quran-service.ts

// Using a simple cache to avoid re-fetching the entire Quran on every component mount.
let quranCache: QuranData | null = null;

// --- TypeScript Interfaces for the Quran API Data Structure ---

export interface Ayah {
  number: number; // The overall number of the Ayah in the Quran (1 to 6236)
  audio: string; // URL for the audio of this Ayah
  audioSecondary: string[]; // Array of alternative audio URLs
  text: string; // The Ayah text in Arabic
  numberInSurah: number; // The number of the Ayah within its Surah
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: "Meccan" | "Medinan";
    numberOfAyahs: number;
  }
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  ayahs: Ayah[];
}

export interface QuranData {
  surahs: Surah[];
}

export interface Edition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: 'text' | 'audio';
  type: 'quran' | 'translation' | 'tafsir' | 'versebyverse';
  direction: 'ltr' | 'rtl';
}

/**
 * Fetches the complete Quran data from the API.
 * Uses a simple in-memory cache to prevent redundant fetches.
 * @returns {Promise<QuranData>} A promise that resolves to the structured Quran data.
 */
export async function getQuranData(): Promise<QuranData> {
  if (quranCache) {
    return quranCache;
  }

  // Use the API route which serves the JSON file.
  const API_URL = '/api/quran';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const json = await response.json();
    
    // The structure from the API is { code, status, data: { surahs: [...] } }
    if (!json.data || !Array.isArray(json.data.surahs)) {
        throw new Error('Quran JSON is not in the expected format.');
    }

    quranCache = json.data as QuranData;
    return quranCache!;
  } catch (error) {
    console.error('Failed to fetch Quran data:', error);
    // In production, this error might not be fatal if the PWA has cached the file.
    // For development, it's a critical error.
    throw new Error('Could not load the Quran. Please check your internet connection and that quran.json is being served correctly.');
  }
}


/**
 * Groups all Ayahs by their page number.
 * This is useful for building a page-by-page Quran reader.
 * @param {QuranData} quranData - The complete structured Quran data.
 * @returns {Map<number, Ayah[]>} A map where the key is the page number and the value is an array of Ayahs on that page.
 */
export function getPages(quranData: QuranData): Map<number, Ayah[]> {
    const pages = new Map<number, Ayah[]>();
    for (const surah of quranData.surahs) {
        for (const ayah of surah.ayahs) {
            if (!pages.has(ayah.page)) {
                pages.set(ayah.page, []);
            }
            pages.get(ayah.page)?.push(ayah);
        }
    }
    return pages;
}

/**
 * Retrieves a specific page of Ayahs from the Quran data.
 * @param {number} pageNumber - The page number to retrieve.
 * @returns {Promise<Ayah[] | undefined>} A promise that resolves to an array of Ayahs for the requested page, or undefined if not found.
 */
export async function getPage(pageNumber: number): Promise<Ayah[] | undefined> {
    const quranData = await getQuranData();
    const pages = getPages(quranData);
    return pages.get(pageNumber);
}

