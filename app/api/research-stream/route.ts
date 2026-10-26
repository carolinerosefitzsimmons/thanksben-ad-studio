import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { normalizeUrl, scrapeSite } from "@/lib/research";
import { market } from "@/lib/brand";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { url } = (await req.json()) as { url?: string };
  if (!url?.trim()) return new Response("Provide a URL", { status: 400 });
  const { url: full, domain } = normalizeUrl(url);
  const siteText = await scrapeSite(full);

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    temperature: 0.4,
    system:
      `You research a ${market.prospectNoun} from its website for a marketing tool. Be concise, accurate, and never invent facts not supported by the text (infer sensibly from a well-known name if the text is thin).`,
    prompt: `${market.prospectNoun.toUpperCase()} DOMAIN: ${domain}
WEBSITE TEXT:
${siteText}

Do TWO things, in this exact order:

1) Output 3 to 5 VERY concise research findings, ONE PER LINE, each starting with "• " and under 9 words. Write them as live narration of what you're discovering, e.g.:
• Headquartered in London
• Offices across Europe, US and Asia
• Strong in financial services and energy

2) Then output a line containing EXACTLY:
###DATA###
Then STRICT JSON on one line (no markdown, no commentary):
{"firmName":"","location":"City, Country","region":"one of ${JSON.stringify(
      market.regions,
    )}","summary":"one sentence","specialties":[{"name":"${market.segmentLabel}","industries":["client sectors"],"blurb":"few words"}],"offices":[{"city":"","country":""}]}

Rules: specialties = 2-6 of their most prominent ${market.segmentLabelPlural} (most important first). offices = their actual office cities (HQ first, up to 8). If the text is thin, infer sensibly. Always return at least one specialty and one office.`,
  });

  return result.toTextStreamResponse();
}
