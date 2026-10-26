import type { FirmResearch } from "./types";
import { vendor, market } from "./brand";

export function normalizeUrl(input: string): { url: string; domain: string } {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  let domain = "";
  try {
    domain = new URL(u).hostname.replace(/^www\./, "");
  } catch {
    domain = input.trim().toLowerCase();
  }
  return { url: u, domain };
}

/** Firecrawl scrape → markdown (falls back to a plain fetch of the HTML, stripped). */
export async function scrapeSite(url: string): Promise<string> {
  const key = process.env.FIRECRAWL_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: false, // keep nav/footer — practice-area lists live there
          waitFor: 1500,
          timeout: 25000,
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { data?: { markdown?: string } };
        const md = j.data?.markdown ?? "";
        if (md.trim().length > 200) return md.slice(0, 14000);
      }
    } catch {
      /* fall through */
    }
  }
  // Fallback: plain fetch + crude tag strip.
  try {
    const res = await fetch(url, { headers: { "user-agent": `Mozilla/5.0 (${vendor.name}-AdStudio/0.1)` } });
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 14000);
  } catch {
    return "";
  }
}

const SYSTEM = `You analyse a ${market.prospectNoun}'s website text and extract a structured profile for a marketing tool. Return STRICT JSON only, no prose.`;

function prompt(domain: string, siteText: string): string {
  return `${market.prospectNoun.toUpperCase()} DOMAIN: ${domain}
WEBSITE TEXT:
${siteText}

Extract this JSON (no markdown, no commentary):
{
  "firmName": "the firm's name",
  "location": "primary HQ as 'City, Country' (best guess if needed)",
  "region": one of ${JSON.stringify(market.regions)} (closest bucket for the HQ),
  "summary": "one sentence on what the firm is known for",
  "specialties": [
    { "name": "a ${market.segmentLabel} they are known for (e.g. ${market.segmentExamples.map((e) => `'${e}'`).join(", ")})",
      "industries": ["client sectors this ${market.segmentLabel} serves, e.g. ${market.sectorExamples.map((e) => `'${e}'`).join(", ")}"],
      "blurb": "a few words on their strength here" }
  ]
}
Rules: return 2-6 of their MOST prominent ${market.segmentLabelPlural} (the ones they lead with), most important first. If the text is thin, infer sensibly from the name and what is visible. Always return at least one.`;
}

export async function researchFirm(rawUrl: string): Promise<FirmResearch> {
  const { url, domain } = normalizeUrl(rawUrl);
  const siteText = await scrapeSite(url);
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    // Degraded fallback with no LLM: a single generic specialty.
    return {
      firmName: domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      firmDomain: domain,
      location: "Unknown",
      region: null,
      summary: "Law firm (ANTHROPIC_API_KEY not set — research limited).",
      specialties: [{ name: "Legal Services", industries: [], blurb: "general practice" }],
      offices: [],
    };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt(domain, siteText) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const j = (await res.json()) as { content?: { text?: string }[] };
  const text = j.content?.[0]?.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("research: no JSON in model output");
  const o = JSON.parse(m[0]) as Partial<FirmResearch>;

  const specialties = (Array.isArray(o.specialties) ? o.specialties : [])
    .filter((s) => s && typeof s.name === "string")
    .map((s) => ({ name: s.name, industries: Array.isArray(s.industries) ? s.industries : [], blurb: s.blurb }));

  return {
    firmName: o.firmName || domain,
    firmDomain: domain,
    location: o.location || "Unknown",
    region: (o.region as string) || null,
    summary: o.summary || "",
    specialties: specialties.length ? specialties : [{ name: "General", industries: [], blurb: "" }],
    offices: Array.isArray(o.offices) ? o.offices : [],
  };
}
