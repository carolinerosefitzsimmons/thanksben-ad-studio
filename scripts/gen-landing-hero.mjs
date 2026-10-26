// One-off: generate the single reusable landing-page hero image (London / glass architecture,
// golden hour) in the Legora brand vibe. Saved to public/landing-hero.png and reused for every
// tailored landing page — so the expensive image gen happens ONCE.
import OpenAI from "openai";
import { readFileSync } from "node:fs";

// load OPENAI_API_KEY from .env.local
const env = readFileSync(".env.local", "utf8");
const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("OPENAI_API_KEY not found in .env.local");
const openai = new OpenAI({ apiKey: key });

const prompt = `A cinematic, photoreal wide hero image for a premium legal-technology brand: a modern glass skyscraper façade in the London financial district at golden hour (sunset). Warm amber and gold reflections across the glass curtain wall, with deep blue and charcoal shadows and a faint reflected city skyline in the windows. Sophisticated, editorial, architectural, moody yet luminous. Absolutely NO text, NO logos, NO watermarks, NO people. Ultra-high quality, 16:9 composition, shallow atmospheric depth.`;

const r = await openai.images.generate({ model: "gpt-image-2", prompt, size: "1792x1024", quality: "high", n: 1 });
const b64 = r.data?.[0]?.b64_json;
if (!b64) throw new Error("no image returned");
const { writeFileSync } = await import("node:fs");
writeFileSync("public/landing-hero.png", Buffer.from(b64, "base64"));
console.log("saved public/landing-hero.png", Math.round((b64.length * 3) / 4 / 1024), "KB");
