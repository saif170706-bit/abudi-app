// expo-file-system's SDK 57 default export is the new File/Directory API;
// this module still uses the classic path-string API, available at ./legacy.
import * as FileSystem from 'expo-file-system/legacy';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/client';

const CACHE_DIR = `${FileSystem.cacheDirectory}quran-assets/`;
const FONT_DIR = `${CACHE_DIR}fonts/`;
const PAGE_DIR = `${CACHE_DIR}pages/`;
const META_KEY = 'quran_asset_cache_meta_v1';
const MAX_CACHE_BYTES = 150 * 1024 * 1024;

export interface QuranPageWord {
  id: number;
  text: string;
  location: string;
}

export interface QuranPageLine {
  lineNumber: number;
  lineType: string;
  isCentered: boolean;
  surahNumber: number | null;
  words: QuranPageWord[];
}

export interface QuranPageData {
  pageNumber: number;
  lines: QuranPageLine[];
}

export function fontFamilyForPage(pageNumber: number) {
  return `QuranPage${pageNumber}`;
}

type CacheMeta = Record<string, { lastAccess: number; bytes: number }>;

async function readMeta(): Promise<CacheMeta> {
  const raw = await AsyncStorage.getItem(META_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CacheMeta;
  } catch {
    return {};
  }
}

async function writeMeta(meta: CacheMeta) {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

async function ensureDirs() {
  for (const dir of [CACHE_DIR, FONT_DIR, PAGE_DIR]) {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  }
}

async function downloadIfMissing(localUri: string, storagePath: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists && !info.isDirectory) {
    return info.size ?? 0;
  }
  const url = await getDownloadURL(ref(storage, storagePath));
  const result = await FileSystem.downloadAsync(url, localUri);
  const downloaded = await FileSystem.getInfoAsync(result.uri);
  return downloaded.exists && !downloaded.isDirectory ? downloaded.size ?? 0 : 0;
}

/**
 * Downloads (or reuses the cached copy of) a page's font + word/line data,
 * registers the font with expo-font, and returns the parsed page data.
 */
export async function ensurePageAssets(pageNumber: number): Promise<QuranPageData> {
  await ensureDirs();

  const fontUri = `${FONT_DIR}p${pageNumber}.ttf`;
  const dataUri = `${PAGE_DIR}${pageNumber}.json`;

  const [fontBytes, dataBytes] = await Promise.all([
    downloadIfMissing(fontUri, `quran-assets/fonts/p${pageNumber}.ttf`),
    downloadIfMissing(dataUri, `quran-assets/pages/${pageNumber}.json`),
  ]);

  const fontFamily = fontFamilyForPage(pageNumber);
  if (!Font.isLoaded(fontFamily)) {
    await Font.loadAsync({ [fontFamily]: fontUri });
  }

  const raw = await FileSystem.readAsStringAsync(dataUri);
  const data = JSON.parse(raw) as QuranPageData;

  const meta = await readMeta();
  meta[String(pageNumber)] = { lastAccess: Date.now(), bytes: fontBytes + dataBytes };
  await writeMeta(meta);
  evictIfNeeded(pageNumber).catch(() => {});

  return data;
}

/** Fire-and-forget prefetch for adjacent pages — swallows errors. */
export function prefetchPage(pageNumber: number) {
  if (pageNumber < 1 || pageNumber > 604) return;
  ensurePageAssets(pageNumber).catch(() => {});
}

async function evictIfNeeded(protectedPage: number) {
  const meta = await readMeta();
  const total = Object.values(meta).reduce((sum, m) => sum + m.bytes, 0);
  if (total <= MAX_CACHE_BYTES) return;

  const protectedPages = new Set([protectedPage - 1, protectedPage, protectedPage + 1]);
  const entries = Object.entries(meta)
    .filter(([page]) => !protectedPages.has(Number(page)))
    .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

  let remaining = total;
  for (const [page, info] of entries) {
    if (remaining <= MAX_CACHE_BYTES) break;
    await FileSystem.deleteAsync(`${FONT_DIR}p${page}.ttf`, { idempotent: true });
    await FileSystem.deleteAsync(`${PAGE_DIR}${page}.json`, { idempotent: true });
    delete meta[page];
    remaining -= info.bytes;
  }
  await writeMeta(meta);
}
