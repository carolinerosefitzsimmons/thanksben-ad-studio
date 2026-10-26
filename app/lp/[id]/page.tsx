import { cache } from "react";
import { query } from "@/lib/db";
import LandingPage from "@/components/LandingPage";
import { buildLanding, type LandingData } from "@/lib/landing";
import type { FirmResearch, Specialty } from "@/lib/types";
import { vendor } from "@/lib/brand";

export const runtime = "nodejs";

/**
 * Next calls generateMetadata and the page separately; React's cache() de-dupes the
 * query so the page costs one round trip instead of two.
 */
const load = cache(async (id: string) => {
  const { rows } = await query<any>(
    `select id, firm_name, firm_domain, location, specialties, summary, landing from tb_generations where id=$1`,
    [id],
  );
  return rows[0] ?? null;
});

export async function generateMetadata({ params }: { params: { id: string } }) {
  const name = (await load(params.id))?.firm_name;
  return { title: name ? `${vendor.name} × ${name}` : vendor.name };
}

export default async function Page({ params }: { params: { id: string } }) {
  const row = await load(params.id);
  if (!row) {
    return <div className="flex min-h-screen items-center justify-center text-[#8a8a92]">Landing page not found.</div>;
  }
  const specialties: Specialty[] = Array.isArray(row.specialties) ? row.specialties : [];
  let landing: LandingData | null = row.landing;

  if (!landing) {
    const firm: FirmResearch = {
      firmName: row.firm_name,
      firmDomain: row.firm_domain,
      location: row.location,
      region: null,
      specialties: specialties.length ? specialties : [{ name: "General", industries: [] }],
      offices: [],
      summary: row.summary || "",
    };
    const primary = firm.specialties[0];
    const country = (row.location || "").split(",").pop()?.trim() || null;
    landing = await buildLanding(firm, primary, country);
    await query(`update tb_generations set landing=$1 where id=$2`, [JSON.stringify(landing), row.id]).catch(() => {});
  }

  return <LandingPage firmName={row.firm_name} location={row.location} landing={landing!} />;
}
