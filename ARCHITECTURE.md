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
1. Insert a `lag_generations` row → `generationId`.
2. Kick off `buildLanding()` in parallel (cheap: one Sonnet call + logo match).
3. `genCopy()` **once** — copy is about the practice, not the city.
4. `Promise.all` over markets; per market:
   - `matchLogos()` → 3 peer firms from the vault
   - `fetchLogoPng()` → real logo PNGs
   - `generateAd()` → `gpt-image-2`
   - insert a `lag_ads` row
5. Return base64 data URIs to the client.

## The three pieces of actual IP

### a. The knowledge vault — `data/legora_clients.json`

81 Legora customers, deduped by registrable domain, each tagged with
`practiceAreas`, `industries`, `geo{country,region}`, `tier`, `sourceUrl`,
`evidence`. Harvested via Firecrawl `/map` + sitemap + Exa, then tagged in
batches of 8 by Haiku. See `data/HARVEST_NOTES.md` for the full provenance and
caveats — **read it before rebuilding this for a new vendor.**

Loaded into the `legora_clients` Postgres table by `POST /api/seed`.
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

### c. The capability library — `data/legora_capabilities.json`

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

## Data model — `supabase/legora_schema.sql`

- `legora_clients` — the vault (unique on `domain`)
- `lag_generations` — one row per session; `specialties` and `landing` as JSONB
- `lag_ads` — one row per ad; **`image_base64 text`**

`lib/db.ts:ensureSchema()` runs the whole schema file on the first query of each
server process, so there is no migration step.

## Known rough edges

| Issue | Where |
| --- | --- |
| Ad PNGs stored as base64 **text in Postgres**, served as data URIs. Multi-MB rows, no CDN, no caching. First thing to move to object storage. | `lag_ads.image_base64` |
| `LOGO_DEV_TOKEN` is read by the code but missing from `.env.example` | `lib/logos.ts:62` |
| `PARALLEL_KEY` / `EXA_KEY` are documented but never read — they were harvest-time tools only | `.env.example` |
| `POST /api/research` is dead code; the UI only uses `research-stream` | `app/api/research/route.ts` |
| `npm run seed` points at a file that doesn't exist | `package.json` |
| `ssl: { rejectUnauthorized: false }` | `lib/db.ts:12` |
| No auth, no rate limiting, no spend cap — every `/api/generate` is a billable `gpt-image-2` call | all routes |
| `next.config.mjs` allows remote images from `hostname: "**"` | `next.config.mjs` |
| `generateMetadata` in `/lp/[id]` queries the DB separately from the page body — two round trips | `app/lp/[id]/page.tsx` |

## What v2 has to replace

The architecture is vendor-agnostic; the *content* is entirely Legora's.

1. **`data/legora_clients.json`** → thanksben AI's own customer list, tagged on
   whatever axes matter for its market (not `practiceAreas`).
2. **`data/legora_capabilities.json`** → what thanksben AI actually does, with
   the same `technical`/`prospect` split and `adWorthy`/`confidence` gating.
3. **`assets/refs/*.png`** → thanksben AI reference creative. These three images
   are what make the output look on-brand; generic refs produce generic ads.
4. **Brand surface** — `public/legora-*`, the `#005230` green, the four-point
   star in `components/Chat.tsx:343`, the wordmark, `tailwind.config.ts`.
5. **Prompt vocabulary** — `lib/copy.ts` and `lib/landing.ts` hard-code
   "Legora", "law firm", "practice area", "partner". The *constraints* transfer;
   the nouns do not.
6. **Table names** — `legora_clients`, `lag_*` (prefixed to share a Supabase
   project with another app called vendor-radar).
