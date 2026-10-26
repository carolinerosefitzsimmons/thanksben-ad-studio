import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
// Reads live rows: must not be prerendered into the build-time cache.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows } = await query(
      `select g.id, g.firm_name, g.firm_url, g.location, g.created_at,
              count(a.id)::int as ad_count
         from tb_generations g
         left join tb_ads a on a.generation_id = g.id
        group by g.id
        order by g.created_at desc
        limit 100`,
    );
    return NextResponse.json({
      generations: rows.map((r: any) => ({
        id: r.id,
        firmName: r.firm_name,
        firmUrl: r.firm_url,
        location: r.location,
        createdAt: r.created_at,
        adCount: r.ad_count,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
