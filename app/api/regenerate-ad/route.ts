import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { matchLogos } from "@/lib/match";
import { genCopy } from "@/lib/copy";
import { generateAd } from "@/lib/image";
import { fetchLogoPng } from "@/lib/logos";
import { putAd, deleteAd } from "@/lib/storage";
import { checkBudget } from "@/lib/limits";
import type { FirmResearch, Office } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 200;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set." }, { status: 400 });
    }
    const { adId, firm, specialtyName, market } = (await req.json()) as {
      adId: string;
      firm: FirmResearch;
      specialtyName: string;
      market: Office;
    };
    const specialty = firm.specialties.find((s) => s.name === specialtyName) || firm.specialties[0];

    const overBudget = await checkBudget(1);
    if (overBudget) return NextResponse.json({ error: overBudget }, { status: 429 });

    const { headline, subhead } = await genCopy(firm.firmName, specialty, firm.region, firm.summary);
    const logos = await matchLogos(specialty, firm.region, market.country, 3, firm.firmDomain);

    const logoPngs = (
      await Promise.all(
        logos.slice(0, 3).map(async (l) => {
          const png = await fetchLogoPng(l.domain);
          return png ? { name: l.name, png } : null;
        }),
      )
    ).filter(Boolean) as { name: string; png: Buffer }[];

    const imageB64 = await generateAd({
      firmName: firm.firmName,
      location: firm.location,
      specialty: specialty.name,
      headline,
      subhead,
      logos: logoPngs,
      market,
    });
    const logoMeta = logos.map((l) => ({ name: l.name, logoUrl: l.logoUrl }));
    const label = `${market.city} · ${specialty.name}`;

    const prev = await query<{ image_key: string | null }>(
      `select image_key from tb_ads where id=$1`,
      [adId],
    );
    const imageKey = await putAd(Buffer.from(imageB64, "base64"));
    await query(
      `update tb_ads set headline=$1, subhead=$2, image_key=$3, logos=$4, specialty=$5 where id=$6`,
      [headline, subhead, imageKey, JSON.stringify(logoMeta), label, adId],
    );
    // The row now points at the new image, so the old one is unreferenced.
    await deleteAd(prev.rows[0]?.image_key);

    return NextResponse.json({
      ad: {
        id: adId,
        specialty: label,
        headline,
        subhead,
        imageUrl: `/api/ads/${adId}`,
        logos: logoMeta,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
