import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { normalizeUrl, scrapeSite } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 60;

const REGIONS = [
  "UK & Ireland", "Nordics", "DACH", "Benelux", "Southern Europe", "France",
  "Central & Eastern Europe", "North America", "Middle East", "Asia-Pacific", "Global",
];

export async function POST(req: Request) {
  const { url } = (await req.json()) as { url?: string };
  if (!url?.trim()) return new Response("Provide a URL", { status: 400 });
  const { url: full, domain } = normalizeUrl(url);
  const siteText = await scrapeSite(full);

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    temperature: 0.4,
    system:
      "You research a law firm from its website for a marketing tool. Be concise, accurate, and never invent facts not supported by the text (infer sensibly from a well-known firm name if the text is thin).",
    prompt: `LAW FIRM DOMAIN: ${domain}
WEBSITE TEXT:
${siteText}

Do TWO things, in this exact order:

1) Output 3 to 5 VERY concise research findings, ONE PER LINE, each starting with "• " and under 9 words. Write them as live narration of what you're discovering, e.g.:
• Specialises in commercial due diligence
• Headquartered in London
• Offices across Europe, US and Asia
• Strong in financial services and energy

2) Then output a line containing EXACTLY:
###DATA###
Then STRICT JSON on one line (no markdown, no commentary):
{"firmName":"","location":"City, Country","region":"one of ${JSON.stringify(
      REGIONS,
    )}","summary":"one sentence","specialties":[{"name":"practice area","industries":["client sectors"],"blurb":"few words"}],"offices":[{"city":"","country":""}]}

Rules: specialties = 2-6 of the firm's most prominent practice areas (most important first). offices = the firm's actual office cities (HQ first, up to 8). If the text is thin, infer sensibly. Always return at least one specialty and one office.`,
  });

  return result.toTextStreamResponse();
}
