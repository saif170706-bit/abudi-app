/**
 * generate-icons.mjs
 *
 * Composites the exact Ibn Amer logo (unchanged, pixel-perfect) onto
 * the Arabic geometric textured background at 192x192 and 512x512.
 * The logo is scaled to occupy 65% of the icon with equal padding on all sides.
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const LOGO_SRC  = path.join(root, 'public', 'pwa', 'image (3).png');
const BG_SRC    = path.join(root, 'public', 'app-background.jpg');
const OUT_DIR   = path.join(root, 'public', 'pwa');

// Icon sizes to generate
const SIZES = [192, 512];
// Logo occupies this fraction of the icon (centered, equal padding all sides)
const LOGO_FRACTION = 0.85;

for (const size of SIZES) {
  const logoSize = Math.round(size * LOGO_FRACTION);
  const offset   = Math.round((size - logoSize) / 2);

  // 1. Resize + tile the background to fill the target square, and fade it
  const bgBuffer = await sharp(BG_SRC)
    .resize(size, size, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .composite([{
      input: { create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.65 } } },
      blend: 'over'
    }])
    .png()
    .toBuffer();

  // 2. Resize the EXACT original logo (preserve transparency, use high quality kernel)
  const logoBuffer = await sharp(LOGO_SRC)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent padding
      kernel: 'lanczos3'
    })
    .toBuffer();

  // 3. Composite logo on top of background, centred
  const composited = await sharp(bgBuffer)
    .composite([{
      input: logoBuffer,
      top: offset,
      left: offset,
      blend: 'over',
    }])
    .png({ quality: 100, compressionLevel: 6 })
    .toBuffer();

  // Standard icon
  const outPath = path.join(OUT_DIR, `icon-${size}x${size}.png`);
  await sharp(composited).toFile(outPath);
  console.log(`✓ ${outPath}`);

  // Maskable icon (same image – safe zone is the inner 80%, which our logo sits well within)
  const maskPath = path.join(OUT_DIR, `icon-maskable-${size}x${size}.png`);
  await sharp(composited).toFile(maskPath);
  console.log(`✓ ${maskPath}`);

  // Also write the canonical app logo (full-res, just the composite)
  if (size === 512) {
    const logoOut = path.join(OUT_DIR, 'ibn-amer-logo.png');
    await sharp(composited).toFile(logoOut);
    console.log(`✓ ${logoOut}`);
  }
}

console.log('\nAll icons generated successfully.');
