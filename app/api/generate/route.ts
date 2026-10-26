import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { matchLogos } from "@/lib/match";
import { genCopy } from "@/lib/copy";
import { generateAd } from "@/lib/image";
import { fetchLogoPng } from "@/lib/logos";
import { buildLanding } from "@/lib/landing";
import { brandGaps } from "@/lib/brand";
import type { FirmResearch, Office, Specialty } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    // Refuse rather than render a placeholder into a real ad. See lib/brand.ts.
    const gaps = brandGaps();
    if (gaps.length) {
      return NextResponse.json(
        {
          error:
            `lib/brand.ts is not configured yet — ${gaps.length} field(s) still hold placeholders: ` +
            `${gaps.join(", ")}. Fill them in before generating, or the ad will carry "REPLACE" text.`,
        },
        { status: 400 },
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not set. Add your OpenAI key to .env.local to generate ads." },
        { status: 400 },
      );
    }
    const { firm, selected, markets } = (await req.json()) as {
      firm: FirmResearch;
      selected: string[];
      markets?: Office[];
    };
    if (!firm?.firmDomain) return NextResponse.json({ error: "Missing firm research." }, { status: 400 });

    const chosen: Specialty[] = firm.specialties.filter((s) => selected.includes(s.name));
    if (!chosen.length) return NextResponse.json({ error: "Select at least one specialism." }, { status: 400 });
    const primary = chosen[0];

    // One ad per selected market (skyline + local professional tailored to each).
    const useMarkets: Office[] =
      markets && markets.length
        ? markets
        : [{ city: (firm.location.split(",")[0] || firm.firmName).trim(), country: locationCountry(firm.location) || "" }];

    const gen = await query<{ id: string }>(
      `insert into tb_generations (firm_url, firm_name, firm_domain, location, specialties, summary)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [`https://${firm.firmDomain}`, firm.firmName, firm.firmDomain, firm.location, JSON.stringify(firm.specialties), firm.summary],
    );
    const generationId = gen.rows[0].id;

    // Build the tailored landing page (cheap: copy + logo match) and store it on the generation —
    // the hero image is generated once and reused, so per-firm cost stays low. Runs in parallel.
    const landingPromise = buildLanding(firm, primary, useMarkets[0]?.country || locationCountry(firm.location))
      .then((l) => query(`update tb_generations set landing=$1 where id=$2`, [JSON.stringify(l), generationId]))
      .catch(() => {});

    // Copy is about the practice — compute once; image (skyline/person) + logos vary per market.
    const { headline, subhead } = await genCopy(firm.firmName, primary, firm.region, firm.summary);

    const ads = await Promise.all(
      useMarkets.map(async (mkt) => {
        const logos = await matchLogos(primary, firm.region, mkt.country, 3, firm.firmDomain);

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
          specialty: primary.name,
          headline,
          subhead,
          logos: logoPngs,
          market: mkt,
        });
        const label = `${mkt.city} · ${primary.name}`;
        const logoMeta = logos.map((l) => ({ name: l.name, logoUrl: l.logoUrl }));
        const row = await query<{ id: string }>(
          `insert into tb_ads (generation_id, specialty, headline, subhead, image_base64, logos)
           values ($1,$2,$3,$4,$5,$6) returning id`,
          [generationId, label, headline, subhead, imageB64, JSON.stringify(logoMeta)],
        );
        return {
          id: row.rows[0].id,
          specialty: label,
          headline,
          subhead,
          imageDataUri: `data:image/png;base64,${imageB64}`,
          logos: logoMeta,
        };
      }),
    );

    await landingPromise;
    return NextResponse.json({ generationId, ads });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function locationCountry(loc: string | null): string | null {
  if (!loc) return null;
  const parts = loc.split(",");
  return parts.length ? parts[parts.length - 1].trim() : loc;
}
