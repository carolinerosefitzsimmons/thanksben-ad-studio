// Turn the (checkerboard-baked) hero PNG into a genuinely transparent wordmark.
// Light pixels (the checkerboard + near-white letter fill) -> transparent; darker letter
// edges/shadows -> opaque, keeping their original tone. Result: a clean embossed wordmark.
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "public/legora-hero.src.png"; // original (backup)
const OUT = "public/legora-hero.png";

// keep a one-time backup of the original on first run
try {
  readFileSync(SRC);
} catch {
  writeFileSync(SRC, readFileSync(OUT));
}

const THRESHOLD = 234; // below the checkerboard greys (~237+) so only the wordmark's ink is kept
const GAIN = 3.4; // contrast of the darkness->alpha ramp
const INK = { r: 0x6b, g: 0x6b, b: 0x73 }; // recolour the wordmark to a visible medium grey

const img = sharp(SRC).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const out = Buffer.from(data);
for (let i = 0; i < data.length; i += channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  let a = (THRESHOLD - lum) * GAIN;
  a = a < 0 ? 0 : a > 255 ? 255 : a;
  out[i] = INK.r;
  out[i + 1] = INK.g;
  out[i + 2] = INK.b;
  out[i + 3] = Math.round(a);
}
await sharp(out, { raw: { width, height, channels } })
  .png()
  .trim({ threshold: 6 }) // crop the transparent padding so we can overlap precisely
  .toFile(OUT);
const m = await sharp(OUT).metadata();
console.log(`cleaned ${width}x${height} -> ${OUT} (trimmed ${m.width}x${m.height})`);
