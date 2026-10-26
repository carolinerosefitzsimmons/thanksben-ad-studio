// One-off: pre-fetch a logo for every row in data/clients.json and bake it into a uniform, grey,
// transparent wordmark PNG for the landing-page trusted-by row. Run once; the landing
// pages just drop in public/logos/<slug>.png — no per-request logo search.
//
//   node scripts/fetch-client-logos.mjs
//
// Source order per domain: logo.dev (if LOGO_DEV_TOKEN, best transparent wordmarks) ->
// the customer's own site (prefer an <img> whose src says "logo", incl. SVG) -> Google favicon.
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "logos");
mkdirSync(OUT, { recursive: true });

// Load LOGO_DEV_TOKEN from .env.local if present.
try {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const TOKEN = process.env.LOGO_DEV_TOKEN;
const UA = "Mozilla/5.0 (compatible; Ben-AdStudio/1.0)";
const GREY = { r: 0, g: 41, b: 35 }; // Ben dark green #002923
const slug = (d) => d.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function get(url, ms = 12000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { "user-agent": UA, accept: "*/*" } });
    if (!r.ok) return null;
    return { buf: Buffer.from(await r.arrayBuffer()), ct: (r.headers.get("content-type") || "").toLowerCase() };
  } catch {
    return null;
  }
}

const abs = (src, domain) =>
  src.startsWith("//") ? "https:" + src : src.startsWith("http") ? src : src.startsWith("/") ? `https://${domain}${src}` : `https://${domain}/${src}`;

async function fromSite(domain) {
  const page = await get(`https://${domain}`);
  if (!page) return null;
  const html = page.buf.toString("utf8");
  const cands = [];
  for (const m of Array.from(html.matchAll(/<img[^>]+>/gi))) {
    if (!/logo/i.test(m[0])) continue;
    const src = m[0].match(/src=["']([^"']+)["']/i)?.[1] || m[0].match(/srcSet=["']([^"'\s]+)/i)?.[1];
    if (src) cands.push(src);
  }
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const apple = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1];
  cands.sort((a, b) => (/\.svg/i.test(b) ? 1 : 0) - (/\.svg/i.test(a) ? 1 : 0));
  if (apple) cands.push(apple);
  if (og) cands.push(og);
  for (const c of cands.slice(0, 5)) {
    const r = await get(abs(c, domain));
    if (r && /image\/(png|jpe?g|webp|svg)/i.test(r.ct) && r.buf.byteLength > 200) return r;
  }
  return null;
}

async function rawLogo(domain) {
  if (TOKEN) {
    const r = await get(`https://img.logo.dev/${domain}?token=${TOKEN}&format=png&size=512&retina=true`);
    if (r && r.buf.byteLength > 500) return r;
  }
  return (await fromSite(domain)) || (await get(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`));
}

// Recolour any logo into a single uniform grey silhouette on a transparent bg, so the
// strip reads as a cohesive set regardless of the source's colour / white-on-dark / favicon.
async function toGreyMark(buf) {
  const { data, info } = await sharp(buf, { density: 300 })
    .resize(600, 600, { fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 245) transparent++;
  const useAlpha = transparent > total * 0.03; // logo already has a transparent bg
  const out = Buffer.alloc(total * 4);
  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    let a;
    if (useAlpha) a = data[i + 3];
    else {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      a = Math.max(0, Math.round(255 - lum) - 12); // dark ink -> opaque, white paper -> clear
    }
    out[p * 4] = GREY.r;
    out[p * 4 + 1] = GREY.g;
    out[p * 4 + 2] = GREY.b;
    out[p * 4 + 3] = a;
  }
  // Reject "solid block" results (a favicon square / white-on-dark logo whose background
  // got filled) — measure how much of the ink's bounding box is actually filled.
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0, opaque = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      if (out[(y * info.width + x) * 4 + 3] > 40) {
        opaque++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  if (opaque === 0) return null;
  const bboxArea = (maxX - minX + 1) * (maxY - minY + 1);
  if (opaque / bboxArea > 0.62) return null; // too filled -> it's a block, not a wordmark

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 8 })
    .resize({ height: 140, fit: "inside" })
    .png()
    .toBuffer();
}

const clients = JSON.parse(readFileSync(join(ROOT, "data", "clients.json"), "utf8")).filter((c) => c.domain);
let ok = 0,
  fail = 0;

async function run(c) {
  try {
    const raw = await rawLogo(c.domain);
    if (!raw) throw new Error("no source");
    const png = await toGreyMark(raw.buf);
    if (!png) throw new Error("unusable (block/blank)");
    if (png.byteLength < 300) throw new Error("tiny");
    writeFileSync(join(OUT, `${slug(c.domain)}.png`), png);
    ok++;
    process.stdout.write(`✓ ${c.name}\n`);
  } catch (e) {
    fail++;
    process.stdout.write(`✗ ${c.name} (${c.domain}) — ${e.message}\n`);
  }
}

// small concurrency
const Q = 8;
for (let i = 0; i < clients.length; i += Q) await Promise.all(clients.slice(i, i + Q).map(run));
console.log(`\nDone. ${ok} ok, ${fail} failed. Source: ${TOKEN ? "logo.dev" : "site/favicon (no LOGO_DEV_TOKEN)"}. -> public/logos/`);
