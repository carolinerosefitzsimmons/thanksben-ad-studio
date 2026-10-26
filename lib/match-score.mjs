// Pure matching logic, in plain JS so both the TypeScript app (lib/match.ts) and
// plain-node dev tools (scripts/explain-match.mjs) use exactly the same code.
// Knows nothing about the brand or the database — everything comes in as arguments.

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Words shared by most tags in a taxonomy carry no signal — if every challenge
 * contains "benefits", matching on it makes unrelated rows look relevant. The
 * caller supplies the list (market.taxonomyStopwords in lib/brand.ts).
 */
const toks = (s, stop) =>
  new Set(norm(s).split(" ").filter((w) => w.length > 2 && !stop.has(w)));

function overlap(a, b) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/**
 * Score every vault row against one prospect segment and return the best `limit`.
 *
 * @param {Array<{name:string,domain:string,logo_url:string|null,practice_areas:string[],industries:string[],geo_country:string|null,geo_region:string|null,tier:string|null}>} rows
 * @param {{name:string,industries:string[]}} specialty
 * @param {{region?:string|null,country?:string|null,limit?:number,excludeDomain?:string|null,marqueePattern?:RegExp|null,stopwords?:string[]}} opts
 * @returns {Array<{row:object,score:number,why:string[]}>}
 */
export function scoreClients(rows, specialty, opts = {}) {
  const {
    region = null, country = null, limit = 4,
    excludeDomain = null, marqueePattern = null, stopwords = [],
  } = opts;
  const stop = new Set(stopwords.map((w) => w.toLowerCase()));

  // Never show the organisation we are pitching in its own "Trusted by" row — they are a
  // prospect, and some targets are themselves customers and so appear in this table.
  const bare = (d) => d.toLowerCase().replace(/^www\./, "").trim();
  const exclude = excludeDomain ? bare(excludeDomain) : null;
  const pool = exclude ? rows.filter((r) => bare(r.domain) !== exclude) : rows;
  if (!pool.length) return [];

  const specTok = toks(specialty.name, stop);
  const indTok = toks((specialty.industries ?? []).join(" "), stop);
  const regionN = region ? norm(region) : "";
  const countryN = country ? norm(country) : "";

  const scored = pool.map((r) => {
    const why = [];
    // Relevance: does this peer actually share the prospect's problem or sector?
    let relevance = 0;
    const pa = overlap(specTok, toks((r.practice_areas ?? []).join(" "), stop));
    if (pa) { relevance += pa * 3; why.push(`challenge×${pa}`); }
    const ri = overlap(indTok, toks((r.industries ?? []).join(" "), stop));
    if (ri) { relevance += ri * 2; why.push(`sector×${ri}`); }

    // Proximity and recognisability only ever break ties between relevant peers —
    // on their own they would put an unrelated household name in the ad as "proof".
    let bonus = 0;
    if (regionN && r.geo_region && norm(r.geo_region) === regionN) { bonus += 2; why.push("region"); }
    if (countryN && r.geo_country && norm(r.geo_country) === countryN) { bonus += 1; why.push("country"); }
    if (marqueePattern && r.tier && marqueePattern.test(`${r.tier} ${r.name}`)) { bonus += 1; why.push("marquee"); }

    return { row: r, score: relevance + bonus, relevance, why };
  });

  scored.sort((a, b) => b.score - a.score);

  // Prefer peers that are genuinely relevant. Only if none are do we fall back to
  // geography, and only then to the raw top of the list, so an ad is never left
  // with no social proof at all.
  const relevant = scored.filter((s) => s.relevance > 0);
  if (relevant.length) return relevant.slice(0, limit);
  const nearby = scored.filter((s) => s.score > 0);
  return (nearby.length ? nearby : scored).slice(0, limit);
}
