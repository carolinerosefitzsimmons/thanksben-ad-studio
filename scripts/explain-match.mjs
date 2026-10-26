// Dev tool: run the real matcher against data/clients.json, with no database.
//   node scripts/explain-match.mjs "Multi-country benefits complexity" "UK & Ireland" "United Kingdom"
// Prints the peers that would appear in an ad's "Trusted by" row, and why each scored.
// Uses lib/match-score.mjs — the same code the app runs.
import { readFileSync } from "node:fs";
import { scoreClients } from "../lib/match-score.mjs";

const [, , challenge, region = null, country = null, exclude = null] = process.argv;
if (!challenge) {
  console.error('usage: node scripts/explain-match.mjs "<challenge>" [region] [country] [excludeDomain]');
  process.exit(1);
}

// Mirrors vault.marqueePattern and market.taxonomyStopwords in lib/brand.ts.
const MARQUEE = /global enterprise|ftse|public company|household/i;
const STOPWORDS = ["benefits", "workforce", "under", "and", "the", "for"];

const clients = JSON.parse(readFileSync(new URL("../data/clients.json", import.meta.url), "utf8"));
const rows = clients.map((c) => ({
  name: c.name,
  domain: c.domain,
  logo_url: c.logoUrl,
  practice_areas: c.practiceAreas ?? [],
  industries: c.industries ?? [],
  geo_country: c.geo?.country ?? null,
  geo_region: c.geo?.region ?? null,
  tier: c.tier ?? null,
}));

const out = scoreClients(rows, { name: challenge, industries: [] }, {
  region, country, limit: 6, excludeDomain: exclude, marqueePattern: MARQUEE, stopwords: STOPWORDS,
});

console.log(`\n  challenge : ${challenge}`);
console.log(`  region    : ${region ?? "—"}    country: ${country ?? "—"}    excluding: ${exclude ?? "—"}\n`);
for (const { row, score, why } of out) {
  console.log(`  ${String(score).padStart(3)}  ${row.name.padEnd(24)} ${(row.geo_region ?? "").padEnd(26)} ${why.join(", ") || "—"}`);
}
console.log();
