import fs from "node:fs";
import path from "node:path";
import { getPageMeta, getListsOfRiwaya } from "quran-meta";

const hafsData = getListsOfRiwaya("Hafs");
const pageStarts: Record<number, string> = {};

for (let page = 1; page <= 604; page++) {
  const meta = getPageMeta(page as any, hafsData);
  pageStarts[page] = `${meta.first[0]}:${meta.first[1]}`;
}

const out = `// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
// Mushaf Al Madinah (Madani) page starts.
// Format: page number (1..604) -> first verse key on that page in "surah:ayah" format.

export const PAGE_START_KEY_BY_PAGE: Record<number, string> = ${JSON.stringify(pageStarts, null, 2)};
`;

const targetFile = path.join(process.cwd(), "src/lib/page-start-keys.generated.ts");
fs.writeFileSync(targetFile, out);

console.log("Generated:", targetFile);
