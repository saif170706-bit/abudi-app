'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { LayoutLine } from '@/components/quran/QuranReader';
import { surahs as allSurahs, type Surah } from '@/app/lib/surahs';

// --- Simple IndexedDB Helper ---
const DB_NAME = 'QuranDataCache';
const DB_VERSION = 8; // Incremented to 8 to fix VersionError on mobile devices
const STORE_NAME = 'processed_data';
const CACHE_KEY = 'quran_v5'; 

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        const error = request.error;
        if (error?.name === 'VersionError') {
          console.error("IndexedDB VersionError: The database version on this device is higher than the code version. Deleting database to reset...");
          indexedDB.deleteDatabase(DB_NAME);
          // We reject here, but the next reload will work because the DB will be gone.
        }
        reject(new Error("Error opening IndexedDB: " + error));
      };
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains(STORE_NAME)) {
            db.deleteObjectStore(STORE_NAME);
        }
        db.createObjectStore(STORE_NAME);
      };
    } catch (e) {
      reject(e);
    }
  });
}

async function getCachedData<T>(db: IDBDatabase): Promise<T | null> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(CACHE_KEY);
        request.onerror = () => reject(new Error("Error reading from cache: " + request.error));
        request.onsuccess = () => resolve(request.result || null);
    });
}

async function setCachedData<T>(db: IDBDatabase, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data, CACHE_KEY);
        request.onerror = () => reject(new Error("Error writing to cache: " + request.error));
        request.onsuccess = () => resolve();
    });
}


// --- Quran Data Context ---

export interface QuranData {
  allLines: LayoutLine[];
  allWords: Map<number, string>;
  allSurahs: Surah[];
  surahLigatures: Record<string, string>;
  versePageMap: Map<string, number>;
  ayahsByKey: Map<string, any>;
  wordVerseKeys: Map<number, string>; // Maps a word_id to a verse_key (e.g., "1:1")
  verseOrderMap: Record<string, number>; // "1:1" -> 0, "1:2" -> 1...
  globalIdByVerseKey: Map<string, number>; // "1:1" -> 1, "1:2" -> 2 ...
}

interface QuranDataContextType {
  quranData: QuranData | null;
  isLoading: boolean;
  error: string | null;
}

const QuranDataContext = createContext<QuranDataContextType | undefined>(undefined);

export const QuranDataProvider = ({ children }: { children: ReactNode }) => {
  const [quranData, setQuranData] = useState<QuranData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuranData() {
      setIsLoading(true);
      let db: IDBDatabase | null = null;

      try {
        db = await openDB();
        const cached = await getCachedData<any>(db);
        
        if (cached) {
            const restoredData: QuranData = {
              ...cached,
              allWords: new Map(Object.entries(cached.allWords).map(([k, v]) => [parseInt(k), v as string])),
              versePageMap: new Map(Object.entries(cached.versePageMap)),
              ayahsByKey: new Map(Object.entries(cached.ayahsByKey)),
              wordVerseKeys: new Map(Object.entries(cached.wordVerseKeys).map(([k, v]) => [parseInt(k), v as string])),
              globalIdByVerseKey: new Map(Object.entries(cached.globalIdByVerseKey)),
              verseOrderMap: cached.verseOrderMap || {},
            };
            setQuranData(restoredData);
            setIsLoading(false);
            return;
        }

        // If not in cache, fetch one by one to avoid network congestion on mobile
        const layoutRes = await fetch('/layout.json');
        if (!layoutRes.ok) throw new Error('Failed to fetch /layout.json');
        
        const wordsRes = await fetch('/quran.json');
        if (!wordsRes.ok) throw new Error('Failed to fetch /quran.json');
        
        const ligaturesRes = await fetch('/surah-ligatures.json').catch(() => new Response('{}'));
        
        const ayahMetaRes = await fetch('/quran-ayah-metadata.json');
        if (!ayahMetaRes.ok) throw new Error('Failed to fetch /quran-ayah-metadata.json');

        const layoutData = await layoutRes.json();
        const wordsData = await wordsRes.json();
        const ligaturesData = await ligaturesRes.json();
        const ayahMetaData = await ayahMetaRes.json();

        const wordsMap = new Map<number, string>();
        const wordVerseKeysMap = new Map<number, string>();
        const versePageMap = new Map<string, number>();

        for (const key in wordsData) {
            const word = wordsData[key];
            if (word && typeof word.id === 'number' && typeof word.text === 'string') {
                wordsMap.set(word.id, word.text);
                wordVerseKeysMap.set(word.id, `${word.surah}:${word.ayah}`);
            }
        }
        
        for (const line of layoutData) {
            if (typeof line.first_word_id === 'number') {
                const verseKey = wordVerseKeysMap.get(line.first_word_id);
                if (verseKey && !versePageMap.has(verseKey)) {
                    versePageMap.set(verseKey, line.page_number);
                }
            }
        }
         if (!versePageMap.has("1:1")) {
            versePageMap.set("1:1", 1);
        }

        const ayahsByKey = new Map<string, any>();
        const verseOrderMap: Record<string, number> = {};
        const globalIdByVerseKey = new Map<string, number>();
        
        const ayahMetaDataArray = Object.values(ayahMetaData);
        ayahMetaDataArray.forEach((ayah: any, idx) => {
          ayahsByKey.set(ayah.verse_key, ayah);
          verseOrderMap[ayah.verse_key] = idx;
          if (ayah.verse_key && typeof ayah.id === 'number') {
            globalIdByVerseKey.set(ayah.verse_key, ayah.id);
          }
        });


        const processedData: QuranData = {
          allLines: layoutData,
          allWords: wordsMap,
          allSurahs: allSurahs,
          surahLigatures: ligaturesData,
          versePageMap,
          ayahsByKey,
          wordVerseKeys: wordVerseKeysMap,
          verseOrderMap,
          globalIdByVerseKey
        };
        
        setQuranData(processedData);

        const storableData = {
            ...processedData,
            allWords: Object.fromEntries(processedData.allWords),
            versePageMap: Object.fromEntries(processedData.versePageMap),
            ayahsByKey: Object.fromEntries(processedData.ayahsByKey),
            wordVerseKeys: Object.fromEntries(processedData.wordVerseKeys),
            globalIdByVerseKey: Object.fromEntries(processedData.globalIdByVerseKey),
            verseOrderMap: processedData.verseOrderMap,
        };
        await setCachedData(db, storableData);
        

      } catch (err: any) {
        setError(err.message || "Kunne ikke indlæse Koranen data.");
        console.error(err);
      } finally {
        setIsLoading(false);
        db?.close();
      }
    }

    loadQuranData();
  }, []);

  const value = { quranData, isLoading, error };

  return (
    <QuranDataContext.Provider value={value}>
      {children}
    </QuranDataContext.Provider>
  );
};

export const useQuranData = () => {
  const context = useContext(QuranDataContext);
  if (context === undefined) {
    throw new Error('useQuranData must be used within a QuranDataProvider');
  }
  return context;
};
