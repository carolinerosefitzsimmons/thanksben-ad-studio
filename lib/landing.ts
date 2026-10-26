// Tailored landing-page content for a prospect. Cheap (one model call + a DB logo match) — the
// expensive hero image is generated once and reused (see assets.landingHero in lib/brand.ts).
import { matchLogos } from "./match";
import { vendor, market } from "./brand";
import type { FirmResearch, Specialty } from "./types";

export interface LandingData {
  headline: string; // hero headline, vendor voice, tailored to the prospect's segment
  subhead: string; // hero subline
  points: { title: string; body: string }[]; // 3 tailored value props (currently unused in the page)
  logos: { name: string; domain: string; logoUrl: string | null }[]; // social-proof peer firms
}

const FALLBACK = (firm: FirmResearch, sp: Specialty): Omit<LandingData, "logos"> => ({
  headline: `AI built for ${sp.name.toLowerCase()}.`,
  subhead: `The AI benefits platform built for ${firm.firmName}'s ${sp.name.toLowerCase()}.`,
  points: [
    { title: "One programme", body: "The same benefits programme everywhere, with each country's rules built in." },
    { title: "Clean payroll", body: "Benefits data is checked as it moves, so errors surface before payday." },
    { title: "Real usage", body: "See what people actually use, not what the brochure said they would." },
  ],
});

async function genCopy(firm: FirmResearch, sp: Specialty): Promise<Omit<LandingData, "logos">> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return FALLBACK(firm, sp);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 3000,
        system:
          `You write landing-page copy for ${vendor.name}, ${vendor.descriptor} — SOFTWARE that ${market.prospectNounPlural} buy to help their ${market.practitionerNounPlural} work faster. ${vendor.name} is a VENDOR/TOOL, never a ${market.prospectNoun}. Voice: confident, elegant, understated (echoing '${vendor.landingVoiceLine}'). No hype, no exclamation marks, no emojis, no clichés.`,
        messages: [
          {
            role: "user",
            content: `Write a tailored landing page for ${firm.firmName}${firm.location && firm.location !== "Unknown" ? ` (${firm.location})` : ""}.
ABOUT: ${firm.summary || market.prospectNoun}
LEAD ${market.segmentLabel.toUpperCase()}: ${sp.name}${sp.blurb ? ` — ${sp.blurb}` : ""}
SECTORS: ${sp.industries.join(", ") || "various"}

Return STRICT JSON (no markdown):
{"headline":"4-8 words. Must make UNMISTAKABLY clear ${vendor.name} is AI SOFTWARE that helps with ${sp.name} work — NOT the prospect's own slogan. It must contain the word 'AI'. Good patterns: 'AI built for ${sp.name.toLowerCase()} teams', 'The AI workspace for ${sp.name.toLowerCase()}'. BAD (sounds like their own tagline): '${sp.name}, without compromise.'","subhead":"one line (max 14 words) positioning ${vendor.name} as the platform that takes ${sp.name} off ${firm.firmName}'s people team","points":[{"title":"2-3 words","body":"max 16 words, concrete to how ${sp.name} teams would use ${vendor.name}"}]}
Return exactly 3 points. No markdown.`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[landing] ${firm.firmName}: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
      return FALLBACK(firm, sp);
    }
    const j = (await res.json()) as { content?: { type?: string; text?: string }[] };
    // Reasoning models return a "thinking" block first, so take the first text block, not content[0].
    const raw = (j.content ?? []).find((c) => c.type === "text")?.text ?? "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) {
      console.error(`[landing] ${firm.firmName}: no JSON in response — using fallback copy.`);
      return FALLBACK(firm, sp);
    }
    const o = JSON.parse(m[0]) as Partial<Omit<LandingData, "logos">>;
    const points = Array.isArray(o.points) ? o.points.filter((p) => p?.title && p?.body).slice(0, 3) : [];
    const fb = FALLBACK(firm, sp);
    // Guard: the headline must read as software, not the prospect's own slogan.
    const headline = o.headline && market.landingHeadlineGuard.test(o.headline) ? o.headline : fb.headline;
    return {
      headline,
      subhead: o.subhead || fb.subhead,
      points: points.length === 3 ? points : fb.points,
    };
  } catch (err) {
    console.error(`[landing] ${firm.firmName}: threw — ${(err as Error).message}`);
    return FALLBACK(firm, sp);
  }
}

/** Build the full tailored landing dataset (copy + social-proof logos) — cheap. */
export async function buildLanding(firm: FirmResearch, primary: Specialty, country: string | null): Promise<LandingData> {
  const [copy, logos] = await Promise.all([genCopy(firm, primary), matchLogos(primary, firm.region, country, 6, firm.firmDomain)]);
  return { ...copy, logos: logos.map((l) => ({ name: l.name, domain: l.domain, logoUrl: l.logoUrl })) };
}
