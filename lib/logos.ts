// Fetch a usable logo image (PNG buffer) for a firm domain, to PASS INTO the image-gen API.
// Source order: logo.dev (best, real wordmarks — needs LOGO_DEV_TOKEN) -> the firm's own site
// (og:image / apple-touch-icon / an <img> whose src says "logo", incl. SVG) -> Google favicon.
// Everything is normalised to a square PNG on white via sharp so gpt-image-2 gets clean inputs.
import sharp from "sharp";
import { vendor } from "./brand";

const UA = `Mozilla/5.0 (compatible; ${vendor.name}-AdStudio/1.0)`;

async function get(url: string, ms = 9000): Promise<{ buf: Buffer; ct: string } | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { "user-agent": UA, accept: "*/*" } });
    if (!r.ok) return null;
    return { buf: Buffer.from(await r.arrayBuffer()), ct: (r.headers.get("content-type") || "").toLowerCase() };
  } catch {
    return null;
  }
}

function abs(src: string, domain: string): string | null {
  try {
    if (src.startsWith("//")) return "https:" + src;
    if (src.startsWith("http")) return src;
    if (src.startsWith("/")) return `https://${domain}${src}`;
    return `https://${domain}/${src}`;
  } catch {
    return null;
  }
}

/** Best-effort logo source URL from the firm's homepage. */
async function fromSite(domain: string): Promise<{ buf: Buffer; ct: string } | null> {
  const page = await get(`https://${domain}`);
  if (!page) return null;
  const html = page.buf.toString("utf8");
  const candidates: string[] = [];
  // an <img> that looks like a logo (prefer svg)
  for (const m of Array.from(html.matchAll(/<img[^>]+>/gi))) {
    const tag = m[0];
    if (!/logo/i.test(tag)) continue;
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    if (src) candidates.push(src);
  }
  // og:image + apple-touch-icon
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const apple = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1];
  // prefer: svg logo > other logo img > apple-touch-icon > og:image
  candidates.sort((a, b) => (/\.svg/i.test(b) ? 1 : 0) - (/\.svg/i.test(a) ? 1 : 0));
  if (apple) candidates.push(apple);
  if (og) candidates.push(og);

  for (const c of candidates.slice(0, 4)) {
    const u = abs(c, domain);
    if (!u) continue;
    const r = await get(u);
    if (r && /image\/(png|jpe?g|webp|svg)/i.test(r.ct) && r.buf.byteLength > 200) return r;
  }
  return null;
}

/** Returns a normalised square PNG buffer for the firm, or null if nothing usable was found. */
export async function fetchLogoPng(domain: string): Promise<Buffer | null> {
  const token = process.env.LOGO_DEV_TOKEN;
  const sources: (() => Promise<{ buf: Buffer; ct: string } | null>)[] = [];
  if (token) sources.push(() => get(`https://img.logo.dev/${domain}?token=${token}&format=png&size=400&retina=true`));
  sources.push(() => fromSite(domain));
  sources.push(() => get(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`));

  for (const src of sources) {
    const r = await src();
    if (!r) continue;
    try {
      // Rasterise (handles SVG too) onto a white square so the model sees a clean logo.
      const png = await sharp(r.buf, { density: 300 })
        .resize(360, 360, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();
      if (png.byteLength > 500) return png;
    } catch {
      /* try next source */
    }
  }
  return null;
}
