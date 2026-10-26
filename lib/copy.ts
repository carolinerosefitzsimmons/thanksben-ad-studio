// Hyper-personalised ad copy per firm + specialty, in Legora's brand voice.
import type { Specialty } from "./types";
import { capabilityBrief } from "./capabilities";

/** One attempt at the model call. Returns null (never a fallback) so the caller can retry. */
async function attemptCopy(
  firmName: string,
  specialty: Specialty,
  region: string | null,
  summary: string,
): Promise<{ headline: string; subhead: string } | null> {
  const key = process.env.ANTHROPIC_API_KEY ?? ""; // presence is checked by genCopy before we get here
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 3000,
        system:
          "You are a senior brand copywriter for Legora, a premium collaborative legal-AI platform. Voice: confident, elegant, specific, understated — echoing 'Law just got more attractive.' No hype, no exclamation marks, no emojis, no clichés like 'velocity' or 'friction' or 'unlock' or 'supercharge'. Legora is the VENDOR being advertised; the firm you are writing for is a PROSPECT who does not use Legora yet, so never imply they already have the capability being sold.",
        messages: [
          {
            role: "user",
            content: `Write a HYPER-PERSONALISED ad for this specific firm — it must read as written FOR them, not a generic legal-AI tagline.

FIRM: ${firmName}
ABOUT: ${summary || "(law firm)"}
PRACTICE TO TARGET: ${specialty.name}${specialty.blurb ? ` — ${specialty.blurb}` : ""}
SECTORS THEY SERVE: ${specialty.industries.join(", ") || "various"}
REGION: ${region || "—"}

Reference the SPECIFIC nature of this practice and the sectors/clients they actually work with (e.g. the real work a ${specialty.name} team does day-to-day, the documents/matters involved). Make it feel bespoke to ${firmName}.

CRITICAL — ${firmName} is a PROSPECT being pitched, NOT a Legora customer. They do not use Legora yet.
- Never make ${firmName} the subject of a capability or performance claim. WRONG: "${firmName} moves faster", "${firmName} reviews contracts in half the time" — that credits them with a result they have not bought.
- Write TO them, not about what they already achieve: address them in the second person ("your ${specialty.name.toLowerCase()} team") or speak about the work itself.
- Legora is the subject of what is enabled; ${firmName} is the audience.
- NAME LEGORA. The subhead must say "Legora" exactly once, as the thing doing the work, not an impersonal instruction ("Cross-check every side letter..."). The reader must finish the ad knowing who does this.
- VARY THE FRAME. Do NOT default to "Legora cross-checks every X against your Y" — that construction is worn out. Vary the verb and the sentence shape ad to ad.
- STAY IN THE STATED PRACTICE. Build the scenario from PRACTICE TO TARGET above, not from a plausible-sounding adjacent practice: a buyouts team's documents are not a fund-formation team's.

WHAT LEGORA CHANGES — illustrative examples of the KIND of thing it does, NOT a menu to recite:
${capabilityBrief(specialty, firmName)}

Every practice hurts differently — a disputes team's problem is not a real-estate team's. Work out what specifically costs ${specialty.name} lawyers acting for ${specialty.industries.join(", ") || "their"} clients their evenings (the volume, the deadline pressure, the exposure that surfaces too late) and speak to THAT. Do not reduce Legora to one feature, and never let the ad collapse into "AI reads your documents".
Never name Legora product, module or feature names — a prospect does not know those words yet.

Return STRICT JSON: {"headline":"MAX 10 words. Create tension a ${specialty.name} partner recognises instantly — the specific pressure, deadline or exposure in their world — and imply the resolution. Evocative, confident, with rhythm: this is brand advertising, not a feature line. It must NOT be generic enough to swap onto another firm (avoid 'Due diligence. Faster.', 'Deal velocity'), must NOT use the template 'X. One question. Every Y.', and must NOT be a bare stack of noun fragments.","subhead":"One or two short sentences, MAX 22 words total. Must name Legora exactly once, as the actor doing the work. Land ONE concrete thing that changes for this team, in their own language — specific enough that a rival vendor could not run the same line. Do NOT open with a subordinate clause ('When...', 'As...'), do NOT restate the headline, do NOT name a feature."}. No markdown.`,
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
 * Ad copy for a firm + practice. Retries once, and logs loudly if it ends up on the
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
    subhead: `Legora helps ${specialty.name.toLowerCase()} teams move faster on the document work.`,
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
