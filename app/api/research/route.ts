import { NextResponse } from "next/server";
import { researchFirm } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || !url.trim()) return NextResponse.json({ error: "Provide a law firm URL." }, { status: 400 });
    const firm = await researchFirm(url);
    return NextResponse.json({ firm });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
