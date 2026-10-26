import { query } from "./db";
import { vault, market } from "./brand";
// Plain-JS module shared with scripts/ so the dev tooling runs the same code.
import { scoreClients } from "./match-score.mjs";
import type { VaultClient, Specialty } from "./types";

export interface ClientRow {
  name: string;
  domain: string;
  logo_url: string | null;
  practice_areas: string[];
  industries: string[];
  geo_country: string | null;
  geo_region: string | null;
  tier: string | null;
}

/** Best social-proof logos for a given segment + prospect region, read from Postgres. */
export async function matchLogos(
  specialty: Specialty,
  region: string | null,
  country: string | null,
  limit = 4,
  excludeDomain?: string | null,
): Promise<VaultClient[]> {
  const { rows } = await query<ClientRow>(
    `select name, domain, logo_url, practice_areas, industries, geo_country, geo_region, tier
       from tb_clients where logo_url is not null`,
  );
  if (!rows.length) {
    console.error("[match] tb_clients is empty — ads will carry no social proof. Run POST /api/seed.");
    return [];
  }
  const scored = scoreClients(rows, specialty, {
    region,
    country,
    limit,
    excludeDomain,
    marqueePattern: vault.marqueePattern,
    stopwords: [...market.taxonomyStopwords],
  }) as { row: ClientRow }[];

  return scored.map(({ row: r }) => ({
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
