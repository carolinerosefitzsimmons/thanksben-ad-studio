// Hyper-personalised ad copy per prospect + segment, in the vendor's brand voice.
// Every vendor- and market-specific noun comes from lib/brand.ts.
import type { Specialty } from "./types";
import { capabilityBrief } from "./capabilities";
import { vendor, market } from "./brand";

/** One attempt at the model call. Returns null (never a fallback) so the caller can retry. */
async function attemptCopy(
  firmName: string,
  specialty: Specialty,
  region: string | null,
  summary: string,
): Promise<{ headline: string; subhead: string } | null> {
  const key = process.env.ANTHROPIC_API_KEY ?? ""; // presence is checked by genCopy before we get here
  const V = vendor.name;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 3000,
        system:
          `You are a senior brand copywriter for ${V}, ${vendor.descriptor}. Voice: confident, elegant, specific, understated — echoing '${vendor.voiceLine}'. No hype, no exclamation marks, no emojis, no clichés like ${vendor.bannedWords.map((w) => `'${w}'`).join(" or ")}. ${V} is the VENDOR being advertised; the ${market.prospectNoun} you are writing for is a PROSPECT who does not use ${V} yet, so never imply they already have the capability being sold.`,
        messages: [
          {
            role: "user",
            content: `Write a HYPER-PERSONALISED ad for this specific ${market.prospectNoun} — it must read as written FOR them, not a generic tagline.

PROSPECT: ${firmName}
ABOUT: ${summary || `(${market.prospectNoun})`}
${market.segmentLabel.toUpperCase()} TO TARGET: ${specialty.name}${specialty.blurb ? ` — ${specialty.blurb}` : ""}
SECTORS THEY SERVE: ${specialty.industries.join(", ") || "various"}
REGION: ${region || "—"}

Reference the SPECIFIC nature of this ${market.segmentLabel} and the sectors/clients they actually work with (e.g. the real work a ${specialty.name} team does day-to-day, the documents/matters involved). Make it feel bespoke to ${firmName}.

CRITICAL — ${firmName} is a PROSPECT being pitched, NOT a ${V} customer. They do not use ${V} yet.
- Never make ${firmName} the subject of a capability or performance claim. WRONG: "${firmName} moves faster", "${firmName} reviews contracts in half the time" — that credits them with a result they have not bought.
- Write TO them, not about what they already achieve: address them in the second person ("your ${specialty.name.toLowerCase()} team") or speak about the work itself.
- ${V} is the subject of what is enabled; ${firmName} is the audience.
- NAME ${V.toUpperCase()}. The subhead must say "${V}" exactly once, as the thing doing the work, not an impersonal instruction. The reader must finish the ad knowing who does this.
- VARY THE FRAME. Do NOT default to "${V} cross-checks every X against your Y" — that construction is worn out. Vary the verb and the sentence shape ad to ad.
- STAY IN THE STATED ${market.segmentLabel.toUpperCase()}. Build the scenario from the ${market.segmentLabel} named above, not from a plausible-sounding adjacent one.

WHAT ${V.toUpperCase()} CHANGES — illustrative examples of the KIND of thing it does, NOT a menu to recite:
${capabilityBrief(specialty, firmName)}

Every ${market.segmentLabel} hurts differently. Work out what specifically costs ${specialty.name} ${market.practitionerNounPlural} acting for ${specialty.industries.join(", ") || "their"} clients their evenings (the volume, the deadline pressure, the exposure that surfaces too late) and speak to THAT. Do not reduce ${V} to one feature, and never let the ad collapse into "AI reads your documents".
Never name ${V} product, module or feature names — a prospect does not know those words yet.

Return STRICT JSON: {"headline":"MAX 10 words. Create tension a ${specialty.name} ${market.decisionMakerNoun} recognises instantly — the specific pressure, deadline or exposure in their world — and imply the resolution. Evocative, confident, with rhythm: this is brand advertising, not a feature line. It must NOT be generic enough to swap onto another ${market.prospectNoun} (avoid ${market.bannedHeadlines.map((h) => `'${h}'`).join(", ")}), must NOT use the template 'X. One question. Every Y.', and must NOT be a bare stack of noun fragments.","subhead":"One or two short sentences, MAX 22 words total. Must name ${V} exactly once, as the actor doing the work. Land ONE concrete thing that changes for this team, in their own language — specific enough that a rival vendor could not run the same line. Do NOT open with a subordinate clause ('When...', 'As...'), do NOT restate the headline, do NOT name a feature."}. No markdown.`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[copy] ${firmName}: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const j = (await res.json()) as { content?: { type?: string; text?: string }[] };
    // Reasoning models return a "thinking" block first, so take the first text block, not content[0].
    const raw = (j.content ?? []).find((c) => c.type === "text")?.text ?? "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) {
      console.error(`[copy] ${firmName}: no JSON in response (blocks: ${(j.content ?? []).map((c) => c.type).join(",")})`);
      return null;
    }
    const o = JSON.parse(m[0]) as { headline?: string; subhead?: string };
    if (!o.headline || !o.subhead) {
      console.error(`[copy] ${firmName}: incomplete JSON — ${m[0].slice(0, 200)}`);
      return null;
    }
    return { headline: o.headline, subhead: o.subhead };
  } catch (err) {
    console.error(`[copy] ${firmName}: threw — ${(err as Error).message}`);
    return null;
  }
}

/**
 * Ad copy for a prospect + segment. Retries once, and logs loudly if it ends up on the
 * generic fallback — silent degradation here ships placeholder copy into a real ad.
 */
export async function genCopy(
  firmName: string,
  specialty: Specialty,
  region: string | null,
  summary: string,
): Promise<{ headline: string; subhead: string }> {
  const fallback = {
    headline: `${specialty.name}, accelerated.`,
    subhead: `${vendor.name} helps ${specialty.name.toLowerCase()} teams move faster on the document work.`,
  };
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`[copy] ${firmName}: ANTHROPIC_API_KEY not set — using generic fallback copy.`);
    return fallback;
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    const out = await attemptCopy(firmName, specialty, region, summary);
    if (out) return out;
    if (attempt === 1) await new Promise((r) => setTimeout(r, 800));
  }
  console.error(`[copy] ${firmName}: FALLBACK COPY SHIPPED after 2 attempts — ad will read "${fallback.headline}".`);
  return fallback;
}
