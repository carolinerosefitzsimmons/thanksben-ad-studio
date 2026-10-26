// Key the grey background out of the green Legora star mark, recolour to brand green, trim, square it.
import sharp from "sharp";

const SRC = "public/legora-mark.src.png";
const OUT = "public/legora-mark.png";
const GREEN = { r: 0x00, g: 0x52, b: 0x30 }; // #005230

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const out = Buffer.from(data);
for (let i = 0; i < data.length; i += channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const greenness = g - Math.max(r, b); // grey -> ~0, green star -> large positive
  let a = (greenness - 6) * 16;
  a = a < 0 ? 0 : a > 255 ? 255 : a;
  // Recolour kept pixels to the crisp brand green (drops the muddy gradient/halo tint).
  out[i] = GREEN.r;
  out[i + 1] = GREEN.g;
  out[i + 2] = GREEN.b;
  out[i + 3] = Math.round(a);
}
await sharp(out, { raw: { width, height, channels } })
  .png()
  .trim({ threshold: 10 }) // crop transparent border
  .toFile(OUT);
const meta = await sharp(OUT).metadata();
console.log(`mark -> ${OUT} (${meta.width}x${meta.height})`);
