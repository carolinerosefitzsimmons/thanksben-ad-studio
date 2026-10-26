// Validation for what the research model returns. The model is asked to choose
// challenge names from a closed list; this makes sure it actually did.
//
// Without it, a free-text name like "Customer acquisition and retention" reaches
// the matcher, which token-matches "acquisition" against "Post-acquisition
// harmonisation" and returns confident nonsense. Pure, so a client component
// can import it.

import { market } from "./brand";
import type { Specialty, Office } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Words that are never a city. The model likes to answer "Europe" or "Multiple". */
const NOT_A_CITY = /^(europe|emea|apac|americas|global|multiple|various|worldwide|international|other|n\/?a|usa|uk)$/i;

/**
 * Snap a model-supplied challenge name onto the allowed list: exact match first,
 * then a normalised match, then a clear token overlap. Anything else is dropped.
 */
export function coerceSegmentName(raw: string): string | null {
  if (!raw) return null;
  const allowed = market.segmentExamples as readonly string[];

  const exact = allowed.find((a) => a === raw);
  if (exact) return exact;

  const n = norm(raw);
  const same = allowed.find((a) => norm(a) === n);
  if (same) return same;

  // Require a majority of the candidate's meaningful words to appear in the
  // allowed name, so "Payroll accuracy" matches but "acquisition" alone does not.
  const stop = new Set((market.taxonomyStopwords as readonly string[]).map((w) => w.toLowerCase()));
  const words = n.split(" ").filter((w) => w.length > 3 && !stop.has(w));
  if (!words.length) return null;

  let best: { name: string; hits: number } | null = null;
  for (const a of allowed) {
    const at = new Set(norm(a).split(" "));
    const hits = words.filter((w) => at.has(w)).length;
    if (hits >= 2 && hits / words.length >= 0.5 && (!best || hits > best.hits)) best = { name: a, hits };
  }
  return best?.name ?? null;
}

/** Keep only challenges on the allowed list, deduped and order-preserving. */
export function coerceSegments(raw: unknown): Specialty[] {
  const out: Specialty[] = [];
  const seen = new Set<string>();
  for (const s of Array.isArray(raw) ? raw : []) {
    const name = coerceSegmentName(typeof s?.name === "string" ? s.name : "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      industries: Array.isArray(s?.industries) ? s.industries.filter((i: unknown) => typeof i === "string") : [],
      blurb: typeof s?.blurb === "string" ? s.blurb : undefined,
    });
  }
  return out;
}

/** Drop entries that name a region or a country instead of a city. */
export function coerceOffices(raw: unknown, fallbackCity?: string, fallbackCountry?: string): Office[] {
  const out: Office[] = [];
  const seen = new Set<string>();
  for (const o of Array.isArray(raw) ? raw : []) {
    const city = typeof o?.city === "string" ? o.city.trim() : "";
    if (!city || NOT_A_CITY.test(city) || city.length > 40) continue;
    const key = city.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ city, country: typeof o?.country === "string" ? o.country.trim() : "" });
  }
  if (!out.length && fallbackCity) out.push({ city: fallbackCity, country: fallbackCountry ?? "" });
  return out.slice(0, 8);
}
