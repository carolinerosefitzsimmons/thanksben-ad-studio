import { query } from "@/lib/db";
import LandingPage from "@/components/LandingPage";
import { buildLanding, type LandingData } from "@/lib/landing";
import type { FirmResearch, Specialty } from "@/lib/types";
import { vendor } from "@/lib/brand";

export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { rows } = await query<{ firm_name: string }>(`select firm_name from tb_generations where id=$1`, [params.id]);
  const name = rows[0]?.firm_name;
  return { title: name ? `${vendor.name} × ${name}` : vendor.name };
}

export default async function Page({ params }: { params: { id: string } }) {
  const { rows } = await query<any>(
    `select id, firm_name, firm_domain, location, specialties, summary, landing from tb_generations where id=$1`,
    [params.id],
  );
  if (!rows.length) {
    return <div className="flex min-h-screen items-center justify-center text-[#8a8a92]">Landing page not found.</div>;
  }
  const row = rows[0];
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
