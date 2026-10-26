# Legora Customer Harvest Notes

**Output:** `data/legora_clients.json` — 81 firms, deduped by registrable domain, fully tagged (practiceAreas, industries, geo, tier).
**Date:** 2026-06-30

## How it was gathered

1. **Firecrawl /map** on `legora.com` (200 URLs) + **sitemap.xml** (140 URLs). This was the richest source: Legora publishes a `/newsroom/<firm>-...` or `/customers/<firm>` page for essentially every named customer, so firm identities were extractable directly from URL slugs.
2. **Firecrawl /scrape** (rendered) of `legora.com/customers` to capture the logo-wall / testimonial firms and confirm display names + quotes (e.g. Erste Group, BAHR, STRABAG, Accor, Borenius, Lindahl).
3. **Exa search** (4 queries: "adopts/rolls out/partners with Legora", "Legora customer law firm") to catch off-site coverage (Artificial Lawyer, Legal IT Insider, Lawyers Weekly, firm newsrooms, BusinessWire). Exa **confirmed** the site-derived set and surfaced no additional law-firm customers beyond it.
4. **Logo URLs:** Spec asked for `logo.clearbit.com/<domain>`. **Clearbit's free logo CDN is now fully dead** (HTTP 000 / connection refused for every domain, including google.com — it was sunset after the HubSpot acquisition). Per the fallback rule, **all 81 logos use `https://www.google.com/s2/favicons?domain=<domain>&sz=128`**, which resolves correctly. If you later get a working logo provider (e.g. Logo.dev, Brandfetch), swap the `logoUrl` field — domains are already correct.
5. **Tagging:** `claude-haiku-4-5` via the Messages API, batched 8 firms/call, strict-JSON output for practiceAreas / industries / geo{country,region} / tier.

## Breakdown (81 firms)

### By region
UK & Ireland 16 · North America 15 · Nordics 11 · CEE 8 · Southern Europe 6 · Benelux 6 · South Asia 4 · Asia-Pacific 4 · France 4 · DACH 3 · Africa 2 · Middle East 1 · Latin America 1

### By tier
National 30 · International 16 · AmLaw 100 9 · Silver Circle 4 · In-house 4 · Boutique 4 · Magic Circle 3 · White Shoe 3 · Big Four 3 · Regional 3 · Bank In-house 2

### Top practice areas
Corporate 77 · Litigation 63 · M&A 59 · Finance 55 · Regulatory 26 · Competition 22 · Employment 21 · Capital Markets 16 · Real Estate 16 · Tax 15 · Banking & Finance 14 · IP 9

## What's included vs. excluded
- **Included:** named law-firm customers + named in-house legal teams (Barclays, Accor, STRABAG, Erste Group, Nordic Semiconductor). All 12 seed firms present and tagged.
- **Excluded** (correctly not customers): Legora corporate news (funding, office openings, exec hires, US/APAC launch); **tech-integration partners** (iManage, NetDocuments, Ironclad, Everlaw, Datasite, DocuSign, SS&C Intralinks, InfoTrack, Elastic); **legal-content partners** (Wolters Kluwer, Manupatra, Tirant lo Blanch, Djøf Forlag, Otto Schmidt, Lovdata, Jus Mundi, Singapore Academy of Law, fromCounsel); **acquisitions** (Walter, Qura, Cadastral, Graceview); **sponsorships** (Chelsea FC, Aaron Judge/NY Yankees, Ludvig Åberg, Venus Williams); training partner Hotshot; network trial Interlaw.

## Gaps / caveats
- A few firms appear in BOTH a "Leya is now Legora" legacy slug and a current slug (e.g. Bird & Bird `bird-bird-adopts-leya` + `bird-bird-rolls-out-legora`); deduped to one entry each.
- Domain choices are best-known primary sites: Bird & Bird = twobirds.com; HSF Kramer = hsfkramer.com (post-merger); Cyril Amarchand Mangaldas = cyrilshroff.com; SSW Pragmatic Solutions = ssw.solutions; Harrison ("Harrison LLP" in slug) resolved to Harrison Clark Rickerbys (hcrlaw.com) — verify if a different "Harrison LLP" was intended.
- `tier` is a coarse best-guess bucket. Note HSF Kramer tagged "Magic Circle" (historically Silver Circle); Trowers & Hamlins, Mishcon, Pinsent Masons etc. bucketed "National/International" — adjust buckets to taste.
- Scrape of the customers logo-wall was partial (Framer-rendered testimonial cards); the sitemap/newsroom slugs were the authoritative customer source and far more complete than the logo wall alone.

## Scratch files (research/)
`map_legora.json`, `sitemap.xml`, `sitemap_urls.txt`, `scrape_customers.json`, `exa_*.json`, `build_firms.py`, `firms_raw.json`, `check_logos.py`, `firms_with_logos.json`, `tag_firms.py`, `firms_tagged.json`, `stats.json`.
