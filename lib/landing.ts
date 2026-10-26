// Tailored landing-page content for a prospect. Cheap (one model call + a DB logo match) — the
// expensive hero image is generated once and reused (see assets.landingHero in lib/brand.ts).
import { matchLogos } from "./match";
import { vendor, market } from "./brand";
import type { FirmResearch, Specialty } from "./types";

export interface LandingData {
  headline: string; // hero headline, vendor voice, tailored to the prospect's challenge
  subhead: string; // hero subline
  /** The problem statement, in the prospect's own terms. Mirrors thanksben.com's
   *  "Running benefits shouldn't be this hard." but specific to them. */
  problem: string;
  /** Ben's three pillars, each tailored. Titles are fixed; bodies are not. */
  points: { title: string; body: string }[];
  logos: { name: string; domain: string; logoUrl: string | null }[]; // matched peers
}

/** Fixed on thanksben.com; only the body copy under each is tailored. */
export const PILLARS = ["Manage", "Experience", "Insights"] as const;

const FALLBACK = (firm: FirmResearch, sp: Specialty): Omit<LandingData, "logos"> => ({
  headline: `The AI-native benefits platform for ${firm.firmName}.`,
  subhead: `One platform, every market — built for teams carrying ${sp.name.toLowerCase()}.`,
  problem: "Running benefits shouldn't be this hard.",
  points: [
    { title: "Manage", body: "One eligibility engine across every entity and market, reconciled against payroll before it runs." },
    { title: "Experience", body: "One card, one app, and an assistant that answers your people instead of your inbox." },
    { title: "Insights", body: "Live spend and usage, so you can show which benefits earn their cost." },
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
{"headline":"5-10 words. Must make UNMISTAKABLY clear ${vendor.name} is AI SOFTWARE for running employee benefits — NOT ${firm.firmName}'s own slogan. It must contain 'AI'. The house pattern is 'The AI-native benefits platform for <who>'; vary it, but keep that clarity.","subhead":"One line, max 22 words. Echo the house structure 'One platform, every market — ...' and land what changes for ${firm.firmName} specifically.","problem":"ONE short sentence naming the pain in their words, in the register of 'Running benefits shouldn't be this hard.' Make it specific to ${sp.name} at an organisation like theirs. Max 10 words.","points":[{"title":"Manage","body":"max 22 words"},{"title":"Experience","body":"max 22 words"},{"title":"Insights","body":"max 22 words"}]}

The three points are ${vendor.name}'s fixed pillars and the titles MUST be exactly "Manage", "Experience" and "Insights", in that order. Tailor only the body of each to ${firm.firmName} and to ${sp.name}:
- Manage = the admin, eligibility rules, multi-entity and multi-country setup, payroll reconciliation
- Experience = what an employee at ${firm.firmName} actually gets: the card, the allowance, the assistant
- Insights = what their reward and finance teams can finally see and prove
No markdown.`,
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
    const fb = FALLBACK(firm, sp);
    // The pillar titles are Ben's, not the model's — keep them fixed and take only the bodies.
    const bodies = (Array.isArray(o.points) ? o.points : []).map((p) => (typeof p?.body === "string" ? p.body : ""));
    const points = PILLARS.map((title, i) => ({ title, body: bodies[i] || fb.points[i].body }));
    // Guard: the headline must read as software, not the prospect's own slogan.
    const headline = o.headline && market.landingHeadlineGuard.test(o.headline) ? o.headline : fb.headline;
    return {
      headline,
      subhead: o.subhead || fb.subhead,
      problem: typeof o.problem === "string" && o.problem.trim() ? o.problem : fb.problem,
      points,
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
