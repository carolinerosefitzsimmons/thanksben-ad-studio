import { vendor } from "./brand";

export function normalizeUrl(input: string): { url: string; domain: string } {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  let domain = "";
  try {
    domain = new URL(u).hostname.replace(/^www\./, "");
  } catch {
    domain = input.trim().toLowerCase();
  }
  return { url: u, domain };
}

/** Firecrawl scrape → markdown (falls back to a plain fetch of the HTML, stripped). */
export async function scrapeSite(url: string): Promise<string> {
  const key = process.env.FIRECRAWL_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: false, // keep nav/footer — practice-area lists live there
          waitFor: 1500,
          timeout: 25000,
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { data?: { markdown?: string } };
        const md = j.data?.markdown ?? "";
        if (md.trim().length > 200) return md.slice(0, 14000);
      }
    } catch {
      /* fall through */
    }
  }
  // Fallback: plain fetch + crude tag strip.
  try {
    const res = await fetch(url, { headers: { "user-agent": `Mozilla/5.0 (${vendor.name}-AdStudio/0.1)` } });
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 14000);
  } catch {
    return "";
  }
}
