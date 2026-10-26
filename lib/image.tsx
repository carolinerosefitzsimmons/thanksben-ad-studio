import OpenAI, { toFile } from "openai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vendor, market, assets, palette } from "./brand";

// Reference ads (real Ben creative, cropped from the brand sheet) used to steer
// gpt-image-2 toward the brand's visual language. These do more work than the
// prompt text does — replacing them changes the output more than any wording here.

export interface AdInput {
  firmName: string;
  location: string;
  specialty: string;
  headline: string;
  subhead: string;
  logos: { name: string; png: Buffer }[]; // real peer-employer logos to place in the ad
  market?: { city: string; country: string }; // setting tailored to this office
}

/**
 * Generate a full, on-brand 16:9 ad with gpt-image-2, using the reference ads as
 * style guides, rendering the supplied copy, and compositing the ACTUAL peer logos
 * passed in. Returns base64 PNG.
 */
export async function generateAd(opts: AdInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set — add it to .env.local to generate ads.");
  const openai = new OpenAI({ apiKey });

  const refs = await Promise.all(
    assets.referenceAds.map((f) =>
      toFile(readFileSync(join(process.cwd(), "assets", "refs", f)), f, { type: "image/png" }),
    ),
  );
  const logoFiles = await Promise.all(
    opts.logos.map((l, i) => toFile(l.png, `logo-${i}.png`, { type: "image/png" })),
  );
  const logoNames = opts.logos.map((l) => l.name);

  const proof =
    logoFiles.length > 0
      ? `\n\nAfter the ${refs.length} style references, the next ${logoFiles.length} image(s) are the ACTUAL logos of employers that already use ${vendor.name} (${logoNames.join(
          ", ",
        )}). Place these real logos — reproduced FAITHFULLY, not redrawn, recoloured, renamed or distorted — in one restrained row along the bottom, evenly spaced and sized consistently, under a small "Trusted by" label in ${palette.primary}. Do NOT write the company names as text; use the supplied logos.`
      : "";

  const setting = opts.market
    ? `Place the character in an everyday setting that reads unmistakably as ${opts.market.city}, ${opts.market.country} — one or two recognisable local cues (architecture, transport, street furniture, weather), drawn in the same flat illustrated style, never photographic and never a postcard skyline.`
    : "";

  const prompt = `Create ONE premium 16:9 landscape advertisement for "${vendor.name}" — ${vendor.descriptor} for ${market.prospectNounPlural} — in the EXACT visual language of the first ${refs.length} reference images: ${vendor.visualLanguage}.

This is an illustrated, graphic brand. Do NOT produce a photograph, a photoreal scene, stock photography, or a composite of photographic elements.

Layout, following the references:
- The ${vendor.markDescription}, small, in the top-left corner, in ${palette.primary}.
- The headline set very large on the left, in ${palette.primary}, ranged left, in a heavy geometric grotesque with tight leading. It is the dominant element on the canvas.
- The supporting line beneath it, much smaller, same colour, generous space between them.
- ${vendor.characterStyle} — occupying the right-hand third, at a comfortable scale, not cropped awkwardly.
${setting ? `- ${setting}` : ""}

Personalise it for "${opts.firmName}"${
    opts.location && opts.location !== "Unknown" ? ` in ${opts.location}` : ""
  }, speaking to ${opts.specialty}.

Render this copy crisply, spelled EXACTLY and legibly:
- Headline (large): "${opts.headline}"
- Supporting line (smaller): "${opts.subhead}"

Background: the soft off-white ${palette.onPrimary}, with the brand's flowing gradient (coral ${palette.coral} → peach ${palette.peach} → sand ${palette.sand} → mint ${palette.mint}) used as one soft organic shape behind or beside the character — not as a rectangular block and not across the whole canvas, so the headline stays on clean ground.

The ONLY brand mark is the ${vendor.name} logo. Do not invent any other logo, badge, icon set or watermark.${proof}

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
