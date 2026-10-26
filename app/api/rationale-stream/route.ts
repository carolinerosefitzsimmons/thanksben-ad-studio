import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { matchLogos } from "@/lib/match";
import type { FirmResearch, Office, Specialty } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { firm, selected, markets } = (await req.json()) as {
    firm: FirmResearch;
    selected: string[];
    markets: Office[];
  };
  const chosen: Specialty[] = firm.specialties.filter((s) => selected.includes(s.name));
  const primary = chosen[0] || firm.specialties[0];
  const country = markets[0]?.country || null;
  const logos = await matchLogos(primary, firm.region, country, 3);
  const peers = logos.map((l) => l.name).join(", ") || "leading peers";
  const cities = markets.map((m) => m.city).join(", ");

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    temperature: 0.5,
    system:
      "You are Legora's ad studio narrating, in first person and present tense, what you're building right now. Warm, concise, specific — never salesy. No preamble, no headings, no bullet points.",
    prompt: `I'm creating ${markets.length} ad${markets.length === 1 ? "" : "s"} for ${firm.firmName}.
Markets: ${cities}. Specialisms to highlight: ${selected.join(", ")}. Peer firms on Legora to feature as social proof: ${peers}.

Write 2-3 short sentences explaining what you're creating and the thinking, e.g. which city skyline and local professional you'll use per market, which capability you're leading on, and that you're featuring ${peers} as proof. Keep it under 55 words total. Present tense ("Creating…", "For ${markets[0]?.city}, I'm…").`,
  });

  return result.toTextStreamResponse();
}
