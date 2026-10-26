import { query } from "./db";
import type { LegoraClient, Specialty } from "./types";

interface ClientRow {
  name: string;
  domain: string;
  logo_url: string | null;
  practice_areas: string[];
  industries: string[];
  geo_country: string | null;
  geo_region: string | null;
  tier: string | null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2));
function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

const MARQUEE = /magic circle|amlaw|white & case|cleary|linklaters|dentons|goodwin|bird & bird|herbert smith/i;

/**
 * Pick the best social-proof logos for a given specialty + firm region.
 * Prefers peer firms whose practice areas / served industries / geography match.
 */
export async function matchLogos(
  specialty: Specialty,
  region: string | null,
  country: string | null,
  limit = 4,
  excludeDomain?: string | null,
): Promise<LegoraClient[]> {
  const { rows } = await query<ClientRow>(
    `select name, domain, logo_url, practice_areas, industries, geo_country, geo_region, tier
       from legora_clients where logo_url is not null`,
  );
  if (!rows.length) return [];

  // Never show the firm we are pitching in its own "Trusted by" row — they are a prospect,
  // and several targets (Linklaters, Cleary, ...) are themselves Legora customers in this table.
  const bare = (d: string) => d.toLowerCase().replace(/^www\./, "").trim();
  const exclude = excludeDomain ? bare(excludeDomain) : null;
  const pool = exclude ? rows.filter((r) => bare(r.domain) !== exclude) : rows;
  if (!pool.length) return [];

  const specTok = toks(specialty.name);
  const indTok = toks(specialty.industries.join(" "));
  const regionN = region ? norm(region) : "";
  const countryN = country ? norm(country) : "";

  const scored = pool.map((r) => {
    const paTok = toks(r.practice_areas.join(" "));
    const riTok = toks(r.industries.join(" "));
    let score = 0;
    score += overlap(specTok, paTok) * 3; // practice-area match (strongest)
    score += overlap(indTok, riTok) * 2; // served-industry match
    if (regionN && r.geo_region && norm(r.geo_region) === regionN) score += 2;
    if (countryN && r.geo_country && norm(r.geo_country) === countryN) score += 1;
    if (r.tier && MARQUEE.test(`${r.tier} ${r.name}`)) score += 1; // recognizable beats obscure on a tie
    return { r, score };
  });

  // Sort by score, then prefer a spread (don't return 4 identical-region firms only).
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, Math.max(limit, 6)).filter((s) => s.score > 0);
  const top = (picked.length ? picked : scored).slice(0, limit);

  return top.map(({ r }) => ({
    name: r.name,
    domain: r.domain,
    logoUrl: r.logo_url,
    practiceAreas: r.practice_areas,
    industries: r.industries,
    geoCountry: r.geo_country,
    geoRegion: r.geo_region,
    tier: r.tier,
  }));
}
