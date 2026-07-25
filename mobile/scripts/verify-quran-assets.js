// Read-only spot-check that the upload-quran-assets.js pipeline actually
// landed files in Storage at the expected paths.
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');

const ROOT = path.join(__dirname, '..', '..');

function loadRootEnv() {
  const text = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadRootEnv();

admin.initializeApp({
  credential: admin.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'studio-3085722089-f47ec.firebasestorage.app',
});
const bucket = getStorage().bucket();

const SAMPLES = [
  'quran-assets/fonts/p1.ttf',
  'quran-assets/fonts/p302.ttf',
  'quran-assets/fonts/p604.ttf',
  'quran-assets/pages/1.json',
  'quran-assets/pages/302.json',
  'quran-assets/pages/604.json',
  'quran-assets/audio-timing/10surah.json',
  'quran-assets/audio-timing/10segments.json',
];

async function main() {
  for (const p of SAMPLES) {
    const file = bucket.file(p);
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`MISSING: ${p}`);
      continue;
    }
    const [meta] = await file.getMetadata();
    console.log(`OK: ${p} (${meta.size} bytes)`);
  }

  const [pageFiles] = await bucket.getFiles({ prefix: 'quran-assets/pages/' });
  const [fontFiles] = await bucket.getFiles({ prefix: 'quran-assets/fonts/' });
  const [audioFiles] = await bucket.getFiles({ prefix: 'quran-assets/audio-timing/' });
  console.log(`Totals — pages: ${pageFiles.length}, fonts: ${fontFiles.length}, audio-timing: ${audioFiles.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
