# Ad Studio — how the prototype works

Baseline imported from `hgb-anam-2026/caroline-legora` @ `c105d9b`. This document
describes that code as-is (still Legora-branded), so the v2 work has an accurate
starting map.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · MUI icons · `pg` straight to
Postgres (Supabase) · Vercel AI SDK for the streaming calls. Dev server runs on
**port 3001** (`npm run dev`).

Three external paid services, two models:

| Service | Used for | Model |
| --- | --- | --- |
| Firecrawl | scraping the target firm's site | — |
| Anthropic | research extraction, ad copy, landing copy, narration | `claude-haiku-4-5`, `claude-sonnet-5` |
| OpenAI | the ad image itself | `gpt-image-2` |
| logo.dev (optional) | real peer-firm wordmarks | — |

## The user journey → the code

`components/Chat.tsx` is a five-phase state machine:
`empty → researching → selecting → generating → done`.

### 1. Research (`POST /api/research-stream`)

1. `lib/research.ts:normalizeUrl` → bare domain.
2. `scrapeSite()` calls **Firecrawl** `/v1/scrape` for markdown, with
   `onlyMainContent: false` deliberately — practice-area lists live in nav and
   footer. Falls back to a plain `fetch` + regex tag-strip if the key is absent
   or the call fails. Capped at 14 000 chars.
3. `streamText` with **claude-haiku-4-5** returns *two things in one stream*:
   3–5 `• ` narration lines (shown live in the UI), then a literal `###DATA###`
   sentinel, then one line of strict JSON.
4. The client splits on `###DATA###` and `JSON.parse`s the tail into
   `FirmResearch`: `firmName`, `location`, `region` (one of 11 fixed buckets),
   `summary`, `specialties[]`, `offices[]`.

### 2. Selection (`components/SelectWizard.tsx`)

A two-page card: pick specialism(s), then market(s). **Markets are the fan-out
unit** — one ad is generated per selected office city.

### 3. Generation (`POST /api/generate`, `maxDuration: 300`)

Runs `rationale-stream` concurrently purely to mask the wait with narration.

Per request:
1. Insert a `tb_generations` row → `generationId`.
2. Kick off `buildLanding()` in parallel (cheap: one Sonnet call + logo match).
3. `genCopy()` **once** — copy is about the practice, not the city.
4. `Promise.all` over markets; per market:
   - `matchLogos()` → 3 peer firms from the vault
   - `fetchLogoPng()` → real logo PNGs
   - `generateAd()` → `gpt-image-2`
   - insert a `tb_ads` row
5. Return base64 data URIs to the client.

## The three pieces of actual IP

### a. The knowledge vault — `data/tb_clients.json`

81 Legora customers, deduped by registrable domain, each tagged with
`practiceAreas`, `industries`, `geo{country,region}`, `tier`, `sourceUrl`,
`evidence`. Harvested via Firecrawl `/map` + sitemap + Exa, then tagged in
batches of 8 by Haiku. See `data/reference/HARVEST_NOTES.md` for the full provenance and
caveats — **read it before rebuilding this for a new vendor.**

Loaded into the `tb_clients` Postgres table by `POST /api/seed`.
(`npm run seed` is broken — `scripts/seed.mjs` doesn't exist. Use the route.)

### b. The matcher — `lib/match.ts`

Not embeddings. Deterministic token-overlap scoring over every vault row:

```
practice-area token overlap × 3     (strongest signal)
served-industry token overlap × 2
same region                   + 2
same country                  + 1
marquee name (MARQUEE regex)  + 1   (tie-break: recognisable beats obscure)
```

Then takes the top N with `score > 0`. Critically, it **excludes the target
firm's own domain** — several prospects (Linklaters, Cleary) are themselves
Legora customers, and the fix for showing a firm its own logo as social proof
is at `lib/match.ts:44-46`.

### c. The capability library — `data/capabilities.json`

42 rows, each with a `technical` description **and** a `prospect` rendering in
plain language. Only the `prospect` field ever reaches a prompt — a prospect
doesn't know the product's module names. Also carries `adWorthy` (gate) and
`confidence: published | marketing` (scored down 0.5, thinner ground).

`lib/capabilities.ts:capabilityBrief()` scores these against the chosen
specialty, takes the top 9, then **rotates the order by a hash of the firm
name** so a campaign doesn't lead on the same capability every time.

## Prompt engineering worth preserving

`lib/copy.ts` is the most carefully built file in the repo. The constraints
exist because each one was a visible failure mode:

- **Prospect, not customer.** The firm being pitched does *not* use the product.
  Ads kept crediting the prospect with results they hadn't bought.
- **Name the vendor exactly once**, as the actor doing the work.
- **Vary the frame** — the model collapsed onto "X cross-checks every Y against
  your Z" every time.
- **Stay in the stated practice** — a buyouts team's documents are not a fund
  formation team's.
- **Never name product/module names.**
- Retries twice, then ships a generic fallback and `console.error`s loudly. The
  commit history shows this was the fix for silent degradation shipping
  placeholder copy into real ads.

`lib/landing.ts` has the same shape plus a regex guard: the headline must match
`/\b(ai|legora)\b/i`, otherwise it reads as the *firm's* tagline rather than
software being sold to them.

## Image generation — `lib/image.tsx`

`openai.images.edit` (not `generate`) with a composite input array:

```
[ 3 reference ads from assets/refs/ ] + [ up to 3 peer-firm logo PNGs ]
```

at `1792x1024`, `quality: high`. The reference ads carry the brand's visual
language; the logo PNGs are passed as images with an instruction to reproduce
them faithfully rather than redraw the names as text. `lib/logos.ts` normalises
every logo to a 360×360 PNG on white via `sharp` first, sourcing from
logo.dev → the firm's own site (`og:image`, `apple-touch-icon`, any `<img>`
whose tag matches `/logo/i`) → Google favicon.

## Data model — `supabase/schema.sql`

- `tb_clients` — the vault (unique on `domain`)
- `tb_generations` — one row per session; `specialties` and `landing` as JSONB
- `tb_ads` — one row per ad; **`image_base64 text`**

`lib/db.ts:ensureSchema()` runs the whole schema file on the first query of each
server process, so there is no migration step.

## Known rough edges

| Issue | Where |
| --- | --- |
| Ad PNGs stored as base64 **text in Postgres**, served as data URIs. Multi-MB rows, no CDN, no caching. First thing to move to object storage. | `tb_ads.image_base64` |
| `POST /api/research` is dead code; the UI only uses `research-stream` | `app/api/research/route.ts` |
| `ssl: { rejectUnauthorized: false }` | `lib/db.ts:12` |
| No auth, no rate limiting, no spend cap — every `/api/generate` is a billable `gpt-image-2` call | all routes |
| `next.config.mjs` allows remote images from `hostname: "**"` | `next.config.mjs` |
| `generateMetadata` in `/lp/[id]` queries the DB separately from the page body — two round trips | `app/lp/[id]/page.tsx` |

## Rebrand status

The v2 rebrand moved every vendor- and market-specific string into
**`lib/brand.ts`** — the seam. Nothing else in the codebase names the vendor or
the market. `brandGaps()` walks that config and reports any field still holding
a `REPLACE` placeholder; `POST /api/generate` refuses with a 400 listing them,
and the empty state shows a setup banner, so a placeholder can never reach a
rendered ad.

### Done

| Was | Now |
| --- | --- |
| "Legora" in 6 prompt files | `vendor.name` / `vendor.descriptor` / `vendor.voiceLine` |
| "law firm", "lawyer", "partner", "practice area" | `market.*` nouns |
| Region buckets duplicated in two files | `market.regions`, single source |
| `MARQUEE` regex of UK/US firm names | `vault.marqueePattern` |
| `#005230` / `#0b3d2e` / `#f1f6f3` inline | `palette.*`, re-exported as Tailwind `brand` / `branddeep` / `brandsoft` |
| `components/LegoraLogo.tsx` | `components/BrandLogo.tsx`, colours from `palette` |
| `legora_clients`, `lag_generations`, `lag_ads` | `tb_clients`, `tb_generations`, `tb_ads` |
| `supabase/legora_schema.sql` | `supabase/schema.sql` |
| `interface LegoraClient` | `interface VaultClient` |
| Legora's 81 customers / 42 capabilities | empty `data/clients.json` + `data/capabilities.json`, originals kept under `data/reference/` as worked examples |

### Remaining — needs thanksben's own information

1. **Fill `lib/brand.ts`.** 16 placeholder fields. Each carries the Legora value
   in a comment to show the register it wants.
2. **Build `data/clients.json`.** Your own customers, tagged. Read
   `data/reference/HARVEST_NOTES.md` first — it documents the method and the
   traps, including that Clearbit's logo CDN is dead.
3. **Build `data/capabilities.json`.** Keep the `technical`/`prospect` split and
   the `adWorthy` / `confidence` gates; `data/SCHEMA.md` explains why each
   matters.
4. **Replace `assets/refs/*.png`** with thanksben's own creative. These three
   images set the visual identity of every generated ad and nothing else in the
   system compensates for generic ones.
5. **Replace `public/legora-*` and `public/landing-hero.png`**, then point
   `assets.*` in `lib/brand.ts` at the new files.
6. **Re-point `public/logos/`** — 57 pre-rendered grey law-firm wordmarks, used
   by the landing page's trusted-by row. Regenerate with
   `scripts/fetch-client-logos.mjs` once `data/clients.json` is populated.
