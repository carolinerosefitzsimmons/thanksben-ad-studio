import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { matchLogos } from "@/lib/match";
import { genCopy } from "@/lib/copy";
import { generateAd } from "@/lib/image";
import { fetchLogoPng } from "@/lib/logos";
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

    await query(
      `update lag_ads set headline=$1, subhead=$2, image_base64=$3, logos=$4, specialty=$5 where id=$6`,
      [headline, subhead, imageB64, JSON.stringify(logoMeta), label, adId],
    );

    return NextResponse.json({
      ad: {
        id: adId,
        specialty: label,
        headline,
        subhead,
        imageDataUri: `data:image/png;base64,${imageB64}`,
        logos: logoMeta,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
