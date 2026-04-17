// src/lib/quran-recitation-maps.ts

export type QuranWord = {
  id: number | string;
  surah: string; // "2"
  ayah: string;  // "255"
  word?: string;
  location?: string;
  text?: string;
};

export type LayoutRow = {
  first_word_id: number | string | "" | null;
  last_word_id: number | string | "" | null;
  page_number: number | string;
  line_number?: number | string | "" | null;
  line_type: string; // "ayah" | "basmallah" | "surah_name" ...
};

function toInt(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const t = x.trim();
    if (!t) return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function buildWordById(quranJson: Record<string, QuranWord>): Map<number, QuranWord> {
  const map = new Map<number, QuranWord>();
  for (const w of Object.values(quranJson)) {
    const id = toInt((w as any).id);
    if (id !== null) map.set(id, w);
  }
  return map;
}

/**
 * Finder "første ayah på en side" ud fra layout:
 * - vælg rækker med page_number == page og line_type == "ayah"
 * - tag den med laveste line_number (fallback: original orden)
 * - slå first_word_id op i quranJson -> (surah, ayah) -> "surah:ayah"
 */
export function getStartKeyFromLayout(
  page: number,
  layoutRows: LayoutRow[],
  quranJson: Record<string, QuranWord>
): string | null {
  const wordById = buildWordById(quranJson);

  const candidates = layoutRows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => toInt(r.page_number) === page)
    .filter(({ r }) => r.line_type === "ayah")
    .filter(({ r }) => toInt(r.first_word_id) !== null);

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const la = toInt(a.r.line_number);
    const lb = toInt(b.r.line_number);
    if (la !== null && lb !== null && la !== lb) return la - lb;
    return a.idx - b.idx;
  });

  const firstWordId = toInt(candidates[0].r.first_word_id);
  if (firstWordId === null) return null;

  const w = wordById.get(firstWordId);
  if (!w) return null;

  const s = Number(w.surah);
  const a = Number(w.ayah);
  if (!Number.isFinite(s) || !Number.isFinite(a)) return null;

  return `${s}:${a}`;
}

/** Global rækkefølge (surah asc, ayah asc) baseret på dine ayah keys */
export function buildOrderedKeys(ayahsByKey?: Map<string, any>): string[] {
  if (!ayahsByKey) return [];
  const keys = Array.from(ayahsByKey.keys());

  keys.sort((x, y) => {
    const [xs, xa] = x.split(":").map(Number);
    const [ys, ya] = y.split(":").map(Number);
    if (xs !== ys) return xs - ys;
    return xa - ya;
  });

  return keys;
}

export function sortKeysByOrder(selected: string[], ordered: string[]): string[] {
  const idx = new Map<string, number>();
  ordered.forEach((k, i) => idx.set(k, i));
  return [...new Set(selected)].sort((a, b) => (idx.get(a) ?? 1e9) - (idx.get(b) ?? 1e9));
}
