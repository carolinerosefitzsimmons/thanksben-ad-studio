import { query } from "@/lib/db";
import LandingPage from "@/components/LandingPage";
import { buildLanding, type LandingData } from "@/lib/landing";
import type { FirmResearch, Specialty } from "@/lib/types";

export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { rows } = await query<{ firm_name: string }>(`select firm_name from lag_generations where id=$1`, [params.id]);
  const name = rows[0]?.firm_name;
  return { title: name ? `Legora × ${name}` : "Legora" };
}

export default async function Page({ params }: { params: { id: string } }) {
  const { rows } = await query<any>(
    `select id, firm_name, firm_domain, location, specialties, summary, landing from lag_generations where id=$1`,
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
      specialties: specialties.length ? specialties : [{ name: "Legal Services", industries: [] }],
      offices: [],
      summary: row.summary || "",
    };
    const primary = firm.specialties[0];
    const country = (row.location || "").split(",").pop()?.trim() || null;
    landing = await buildLanding(firm, primary, country);
    await query(`update lag_generations set landing=$1 where id=$2`, [JSON.stringify(landing), row.id]).catch(() => {});
  }

  return <LandingPage firmName={row.firm_name} location={row.location} landing={landing!} />;
}
