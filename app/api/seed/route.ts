import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RawClient {
  name: string;
  domain: string;
  logoUrl?: string;
  practiceAreas?: string[];
  industries?: string[];
  geo?: { country?: string; region?: string };
  tier?: string;
  sourceUrl?: string;
}

export async function POST() {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "clients.json"), "utf8");
    const clients = JSON.parse(raw) as RawClient[];
    let n = 0;
    for (const c of clients) {
      if (!c.domain) continue;
      // Bump Google favicon resolution 128 -> 256 for crisper ad logos.
      const logo = (c.logoUrl || "").replace(/sz=128/, "sz=256");
      await query(
        `insert into tb_clients (name, domain, logo_url, practice_areas, industries, geo_country, geo_region, tier, source_url)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (domain) do update set
           name=excluded.name, logo_url=excluded.logo_url, practice_areas=excluded.practice_areas,
           industries=excluded.industries, geo_country=excluded.geo_country, geo_region=excluded.geo_region,
           tier=excluded.tier, source_url=excluded.source_url`,
        [
          c.name,
          c.domain,
          logo || null,
          c.practiceAreas ?? [],
          c.industries ?? [],
          c.geo?.country ?? null,
          c.geo?.region ?? null,
          c.tier ?? null,
          c.sourceUrl ?? null,
        ],
      );
      n++;
    }
    const total = await query<{ c: string }>(`select count(*)::text as c from tb_clients`);
    return NextResponse.json({ seeded: n, total: Number(total.rows[0].c) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
