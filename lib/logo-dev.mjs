// Resolving a logo through logo.dev, shared by the app (lib/logos.ts) and the
// landing-page script (scripts/fetch-client-logos.mjs).
//
// logo.dev issues two kinds of key and they are not interchangeable:
//   pk_...  publishable — the only kind img.logo.dev accepts
//   sk_...  secret      — for api.logo.dev; img.logo.dev returns 401 for it
//
// A 401 here used to be swallowed, so the fetcher fell through to scraping the
// company's own page and happily returned a Trustpilot badge or a charity logo
// while still reporting "Source: logo.dev". Auth failures are now surfaced.

const UA = "Mozilla/5.0 (compatible; Ben-AdStudio/1.0)";

export class LogoDevAuthError extends Error {}

/** Direct image URL for a publishable token. */
export function imgUrl(domain, pk, size = 400) {
  return `https://img.logo.dev/${domain}?token=${pk}&format=png&size=${size}&retina=true`;
}

/**
 * Resolve a domain to a fetchable logo URL.
 * With a pk_ token that is img.logo.dev directly. With an sk_ token we ask the
 * Brand Search API, which returns a ready-to-use logo_url for an exact domain
 * match. Returns null when logo.dev simply does not know the domain.
 *
 * @throws {LogoDevAuthError} when the token is rejected — never silently falls back.
 */
export async function resolveLogoUrl(domain, token, size = 400) {
  if (!token) return null;

  if (token.startsWith("pk_")) return imgUrl(domain, token, size);

  const res = await fetch(`https://api.logo.dev/search?q=${encodeURIComponent(domain)}`, {
    headers: { authorization: `Bearer ${token}`, "user-agent": UA },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new LogoDevAuthError(
      `logo.dev rejected the token (HTTP ${res.status}). Use the publishable key (pk_...) ` +
        `for images, or a valid secret key (sk_...) for the search API.`,
    );
  }
  if (!res.ok) return null;

  const hits = await res.json();
  if (!Array.isArray(hits) || !hits.length) return null;

  const want = domain.toLowerCase().replace(/^www\./, "");
  const exact = hits.find((h) => (h?.domain || "").toLowerCase().replace(/^www\./, "") === want);
  const url = (exact ?? hits[0])?.logo_url;
  if (!url) return null;
  // The search response embeds its own publishable token; honour the size we want.
  return url.includes("?") ? `${url}&format=png&size=${size}&retina=true` : url;
}
