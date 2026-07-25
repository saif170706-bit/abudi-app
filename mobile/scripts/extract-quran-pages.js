// One-off Phase 1 data extraction: pulls a handful of Mushaf pages (word text +
// line layout) out of the web app's public/quran.json + public/layout.json into a
// small bundle-friendly JSON for the RN Quran screen. Re-run manually if PAGES changes.
const fs = require('fs');
const path = require('path');

const PAGES = [1, 2, 3];
const WEB_PUBLIC = path.join(__dirname, '..', '..', 'public');
const OUT_DIR = path.join(__dirname, '..', 'src', 'shared', 'quran');

const layout = JSON.parse(fs.readFileSync(path.join(WEB_PUBLIC, 'layout.json'), 'utf8'));
const words = JSON.parse(fs.readFileSync(path.join(WEB_PUBLIC, 'quran.json'), 'utf8'));

const wordsById = new Map();
for (const key in words) {
  const w = words[key];
  wordsById.set(w.id, w);
}

const pages = PAGES.map((pageNumber) => {
  const lines = layout
    .filter((l) => l.page_number === pageNumber)
    .map((line) => {
      const lineWords = [];
      if (line.first_word_id && line.last_word_id) {
        for (let id = line.first_word_id; id <= line.last_word_id; id++) {
          const w = wordsById.get(id);
          if (w) lineWords.push({ id: w.id, text: w.text, location: w.location });
        }
      }
      return {
        lineNumber: line.line_number,
        lineType: line.line_type,
        isCentered: !!line.is_centered,
        surahNumber: line.surah_number || null,
        words: lineWords,
      };
    });
  return { pageNumber, lines };
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'pages.json'), JSON.stringify(pages, null, 2));
console.log(`Wrote ${pages.length} pages to ${path.join(OUT_DIR, 'pages.json')}`);
