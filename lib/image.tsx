import OpenAI, { toFile } from "openai";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Reference ads (real Legora creative) used to steer gpt-image-2 toward the brand's visual language.
const REF_FILES = ["ad-announcement.png", "ad-testimonial.png", "ad-portrait.png"];

export interface AdInput {
  firmName: string;
  location: string;
  specialty: string;
  headline: string;
  subhead: string;
  logos: { name: string; png: Buffer }[]; // real peer-firm logos to place in the ad
  market?: { city: string; country: string }; // skyline + local person tailored to this office
}

/**
 * Generate a full, on-brand 16:9 Legora ad with gpt-image-2, using the reference ads as style guides,
 * rendering the supplied copy, and compositing the ACTUAL peer-firm logos passed in. Returns base64 PNG.
 */
export async function generateAd(opts: AdInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set — add it to .env.local to generate ads.");
  const openai = new OpenAI({ apiKey });

  const refs = await Promise.all(
    REF_FILES.map((f) => toFile(readFileSync(join(process.cwd(), "assets", "refs", f)), f, { type: "image/png" })),
  );
  const logoFiles = await Promise.all(
    opts.logos.map((l, i) => toFile(l.png, `logo-${i}.png`, { type: "image/png" })),
  );
  const logoNames = opts.logos.map((l) => l.name);

  const proof =
    logoFiles.length > 0
      ? `\n\nAfter the 3 style references, the next ${logoFiles.length} image(s) are the ACTUAL logos of peer firms that already use Legora (${logoNames.join(
          ", ",
        )}). Place these real logos — reproduced FAITHFULLY, not redrawn, recoloured, renamed or distorted — in a single tasteful "Trusted by" row near the bottom, evenly spaced, sized consistently. Do NOT write the firm names as text; use the supplied logos.`
      : "";

  const prompt = `Create ONE premium 16:9 landscape advertisement for "Legora" — a collaborative legal-AI platform for law firms — in the EXACT visual language of the first 3 reference images: cinematic, editorial, sophisticated; muted elegant tones; generous negative space; a clean top bar with the wordmark "LEGORA" on the left and a small four-point star icon on the right; refined restrained typography.

Personalise it for the law firm "${opts.firmName}"${
    opts.location && opts.location !== "Unknown" ? ` in ${opts.location}` : ""
  }, speaking to their ${opts.specialty} practice.

Render this copy crisply, spelled EXACTLY and legibly:
- Headline (large): "${opts.headline}"
- Supporting line (smaller): "${opts.subhead}"

Background: a cinematic, photoreal scene set in ${
    opts.market ? `${opts.market.city}, ${opts.market.country}` : opts.location
  } — feature that city's recognisable skyline / architecture, moody, premium, in the Legora campaign style. ${
    opts.market
      ? `Feature a real, dignified legal professional who authentically reflects the local ${opts.market.city} (${opts.market.country}) business community and demographics. `
      : ""
  }The ONLY typographic brand mark is the LEGORA wordmark + the four-point star.${proof}

Keep every provided word accurate; do not invent text. 16:9 composition.`;

  const r = await openai.images.edit({
    model: "gpt-image-2", // latest OpenAI image model
    image: [...refs, ...logoFiles] as any,
    prompt,
    size: "1792x1024" as any, // 16:9 landscape (valid for gpt-image-2 at runtime)
    quality: "high",
  });
  const b64 = r.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt-image-2 returned no image");
  return b64;
}
