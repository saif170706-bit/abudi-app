// One-off Phase 2 pipeline: uploads the Mushaf font files, per-page word/line
// data, and audio timing data (203MB + ~10MB + 63MB) from the web app's
// public/ folder to Firebase Storage, so the RN app can fetch pages on
// demand instead of bundling ~270MB into the app binary.
//
// Usage: node scripts/upload-quran-assets.js
// Safe to re-run — skips files that already exist in the bucket.
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');

const ROOT = path.join(__dirname, '..', '..'); // D:\Ibn Amerr
const WEB_PUBLIC = path.join(ROOT, 'public');
const CONCURRENCY = 12;

function loadRootEnv() {
  const envPath = path.join(ROOT, '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadRootEnv();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.cert({ projectId, clientEmail, privateKey }),
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'studio-3085722089-f47ec.firebasestorage.app',
});
const bucket = getStorage().bucket();

async function withConcurrency(items, limit, worker) {
  let index = 0;
  let done = 0;
  const total = items.length;
  async function runOne() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
      done++;
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`  ${done}/${total}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runOne));
}

async function uploadIfMissing(localPath, destPath, contentType) {
  const file = bucket.file(destPath);
  const [exists] = await file.exists();
  if (exists) return;
  await bucket.upload(localPath, { destination: destPath, metadata: { contentType } });
}

async function uploadFonts() {
  console.log('Uploading fonts (quran-assets/fonts/)...');
  const pages = Array.from({ length: 604 }, (_, i) => i + 1);
  await withConcurrency(pages, CONCURRENCY, async (page) => {
    const local = path.join(WEB_PUBLIC, 'fonts', `p${page}.ttf`);
    if (!fs.existsSync(local)) return;
    await uploadIfMissing(local, `quran-assets/fonts/p${page}.ttf`, 'font/ttf');
  });
}

async function uploadAudioTiming() {
  console.log('Uploading audio timing JSON (quran-assets/audio-timing/)...');
  const dir = path.join(WEB_PUBLIC, 'quran-audio');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  await withConcurrency(files, CONCURRENCY, async (name) => {
    await uploadIfMissing(path.join(dir, name), `quran-assets/audio-timing/${name}`, 'application/json');
  });
}

function buildPageData(layout, wordsById, pageNumber) {
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
}

async function uploadPageData() {
  console.log('Building + uploading per-page word/line data (quran-assets/pages/)...');
  const layout = JSON.parse(fs.readFileSync(path.join(WEB_PUBLIC, 'layout.json'), 'utf8'));
  const words = JSON.parse(fs.readFileSync(path.join(WEB_PUBLIC, 'quran.json'), 'utf8'));
  const wordsById = new Map();
  for (const key in words) {
    const w = words[key];
    wordsById.set(w.id, w);
  }

  const pages = Array.from({ length: 604 }, (_, i) => i + 1);
  await withConcurrency(pages, CONCURRENCY, async (page) => {
    const destPath = `quran-assets/pages/${page}.json`;
    const file = bucket.file(destPath);
    const [exists] = await file.exists();
    if (exists) return;
    const data = buildPageData(layout, wordsById, page);
    await file.save(JSON.stringify(data), { contentType: 'application/json' });
  });
}

async function main() {
  const started = Date.now();
  await uploadFonts();
  await uploadAudioTiming();
  await uploadPageData();
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
