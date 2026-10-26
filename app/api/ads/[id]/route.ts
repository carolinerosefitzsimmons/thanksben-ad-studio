import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAd } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve a generated ad image. Everything goes through here rather than straight at
 * storage, so the storage driver stays an implementation detail and `?download=1`
 * can force a filename regardless of where the bytes live.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { rows } = await query<{ image_key: string | null; specialty: string | null }>(
    `select image_key, specialty from tb_ads where id = $1`,
    [params.id],
  );
  const row = rows[0];
  if (!row?.image_key) return new NextResponse("Not found", { status: 404 });

  // The key changes whenever the ad is regenerated, so it is a safe strong ETag.
  const etag = `"${row.image_key}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { etag } });
  }

  const png = await getAd(row.image_key);
  if (!png) return new NextResponse("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "content-type": "image/png",
    "content-length": String(png.byteLength),
    etag,
    "cache-control": "private, max-age=0, must-revalidate",
  };

  if (new URL(req.url).searchParams.get("download") === "1") {
    const slug = (row.specialty || "ad").replace(/\W+/g, "-").toLowerCase().replace(/^-|-$/g, "");
    headers["content-disposition"] = `attachment; filename="ben-${slug || "ad"}.png"`;
  }

  return new NextResponse(new Uint8Array(png), { headers });
}
