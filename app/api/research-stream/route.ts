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
      `You research ${market.withArticlePrompt} from its website, for a tool that markets an employee benefits platform to them. ` +
      `Be concise and accurate. Never invent facts about the organisation that the text does not support.`,
    prompt: `${market.prospectNoun.toUpperCase()} DOMAIN: ${domain}
WEBSITE TEXT:
${siteText}

Do TWO things, in this exact order.

1) Output 3 to 5 VERY concise findings, ONE PER LINE, each starting with "• " and under 9 words. Narrate what you are discovering about them AS AN EMPLOYER — size, where their people are, what kind of work their staff do. Not their products. For example:
• Around 4,000 staff across eleven countries
• Mostly warehouse and delivery, not desk-based
• Heavily regulated — financial services
• Hiring fast in Germany and Poland

2) Then a line containing EXACTLY:
###DATA###
Then STRICT JSON on one line, no markdown:
{"firmName":"","location":"City, Country","region":"one of ${JSON.stringify(market.regions)}","summary":"one sentence on what they do","specialties":[{"name":"","industries":[""],"blurb":""}],"offices":[{"city":"","country":""}]}

RULES FOR "specialties" — read carefully, this is the part that is usually got wrong:
Each one is a ${market.segmentLabel.toUpperCase()}: a problem THIS ORGANISATION LIKELY HAS IN RUNNING EMPLOYEE BENEFITS FOR ITS OWN STAFF.
It is NOT their commercial strategy, NOT their product roadmap, NOT their customer growth. "Customer acquisition", "product development" and "international expansion" are all WRONG — they describe the business, not its workforce.

"name" MUST be copied EXACTLY, character for character, from this list:
${market.segmentExamples.map((e) => `  - ${e}`).join("\n")}

Choose the 2 to 4 from that list that most plausibly apply, most likely first, inferring from observable facts: how many people, how many countries, frontline vs desk-based, how regulated the sector is, whether they are growing or acquiring. Never invent a name that is not on the list.

"industries" = the sector THEY operate in, chosen from: ${JSON.stringify(market.sectorExamples)}.
"blurb" = a few words on why that challenge applies to them specifically.
"offices" = real, named CITIES they operate in, HQ first, up to 8. A city, never a country or a region — "Berlin" not "Germany", and never "Europe" or "Multiple". If only one city is evident, return just that one.`,
  });

  return result.toTextStreamResponse();
}
