import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
// Reads live rows: must not be prerendered into the build-time cache.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const g = await query(`select * from tb_generations where id = $1`, [params.id]);
    if (!g.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const a = await query(
      `select id, specialty, headline, subhead, image_base64, logos from tb_ads where generation_id = $1 order by created_at`,
      [params.id],
    );
    const row: any = g.rows[0];
    return NextResponse.json({
      generation: {
        id: row.id,
        firmName: row.firm_name,
        firmUrl: row.firm_url,
        firmDomain: row.firm_domain,
        location: row.location,
        region: null,
        specialties: row.specialties,
        summary: row.summary,
        createdAt: row.created_at,
      },
      ads: a.rows.map((r: any) => ({
        id: r.id,
        specialty: r.specialty,
        headline: r.headline,
        subhead: r.subhead,
        imageDataUri: `data:image/png;base64,${r.image_base64}`,
        logos: r.logos,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
