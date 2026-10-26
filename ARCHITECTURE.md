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

## Rebrand status — complete

Configured for Ben. `lib/brand.ts` holds the vendor identity and voice, the
market's vocabulary, the taxonomy stopwords and the brand palette; nothing else
in the codebase names Ben or the benefits market. `brandGaps()` returns empty,
so generation is unblocked.

### What changed from the Legora prototype

| Was | Now |
| --- | --- |
| "Legora", a legal-AI vendor | Ben, `vendor.*` in the seam |
| Prospect = law firm, segment = practice area | Prospect = employer, segment = **workforce challenge** |
| Photoreal cinematic ads, city skyline, local professional | Ben's illustrated language: off-white ground, heavy geometric headline, coral→mint gradient, a "benimal" character |
| 3 Legora reference ads | 3 real Ben ads cropped from the brand sheet |
| 81 law firms | 23 publicly-citable Ben customers, 9 more held back |
| 42 Legora capabilities | 26 Ben capabilities, 22 ad-worthy |
| Images as base64 in Postgres | Object storage behind `lib/storage.ts`, served by `/api/ads/[id]` |
| No auth, no spend cap | Basic auth middleware + per-request and daily image caps |

### The mapping decision worth understanding

A law firm's website states its practice areas; an employer's website does not
state its benefits problems. So the research model infers the **workforce
challenge** from what is observable — headcount, countries, whether the work is
frontline or desk-based, the sector's regulatory load — and picks from the fixed
list in `market.segmentExamples`. The vault is tagged on that same list, which
is what makes matching work. Change one and you must change the other.

Because most of those challenge names share the words "benefits" and
"workforce", `market.taxonomyStopwords` removes them before scoring. Without it
every tag partially matches every other one and unrelated peers look relevant.

### Matching, corrected

Two faults in the prototype's scoring showed up with this taxonomy and are fixed
in `lib/match-score.mjs`:

1. **Shared vocabulary created phantom matches** — see stopwords above.
2. **Geography and fame could qualify a peer on their own.** A row scoring only
   the marquee tie-break still passed the `score > 0` filter, so an ad about
   cost control could show three household names with no relevance to it.
   Relevance (challenge and sector overlap) is now tracked separately and
   required; proximity and recognisability only break ties between peers that
   already match.

The scoring moved to a plain-JS module so `scripts/explain-match.mjs` runs the
same code with no database:

```
$ node scripts/explain-match.mjs "Frontline and shift workforce" "UK & Ireland" "United Kingdom"
   16  Octopus Energy    UK & Ireland   challenge×4, region, country, marquee
   16  Deliveroo         UK & Ireland   challenge×4, region, country, marquee
   16  British Airways   UK & Ireland   challenge×4, region, country, marquee
```

## Infrastructure

### Image storage — `lib/storage.ts`

Ads are PNGs in object storage, keyed by UUID, with the key on `tb_ads.image_key`.
The driver is chosen automatically: Supabase Storage when `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set, otherwise local disk under `.data/ads`.
Local is for development and logs an error if it finds itself running in
production, where images would not survive a redeploy or be shared between
instances.

Everything is served through `GET /api/ads/[id]` rather than straight from
storage, so the driver stays an implementation detail, `?download=1` can set a
filename whatever the backend, and the storage key doubles as a strong ETag
(it changes on every remix, so caching is correct without invalidation).
A remix deletes the image it replaced.

### Auth — `middleware.ts`

HTTP Basic over the whole app, except `/lp/*` and the brand assets those pages
load — landing pages exist to be sent to a prospect. In production the app
returns 503 when `APP_USER`/`APP_PASSWORD` are unset, rather than running open;
in development it skips auth unless they are set. Credentials are compared
without short-circuiting on the first differing byte.

### Spend caps — `lib/limits.ts`

Checked before any image is rendered or any row written:

- `MAX_ADS_PER_REQUEST` (default 4) — caps the per-request fan-out
- `DAILY_AD_LIMIT` (default 50) — counts `tb_ads` rows since midnight UTC

Both refuse with a 429 naming the actual counts.

### Smaller fixes

| Fix | Where |
| --- | --- |
| `next/image` allowed remote images from `hostname: "**"`; now only the two logo hosts actually used | `next.config.mjs` |
| Database TLS certificates were never verified; now verified unless `PGSSL_NO_VERIFY=1`, which logs a warning | `lib/db.ts` |
| The landing page queried the database twice; now deduped with React `cache()` | `app/lp/[id]/page.tsx` |
| `POST /api/research` was dead code, along with `researchFirm()` | deleted |
| `LOGO_DEV_TOKEN` undocumented, `PARALLEL_KEY`/`EXA_KEY` documented but unread | `.env.example` |

## What has been exercised

Run end to end on 26 Oct 2026 against a live Supabase database, Anthropic and
OpenAI, with Revolut as the prospect.

| Step | Result |
| --- | --- |
| Schema applied by `ensureSchema()` | Tables created on a fresh database |
| `POST /api/seed` | 29 customers loaded |
| `POST /api/research-stream` | 7s; correct challenges, correct region, real narration |
| `POST /api/generate` | 86s end to end for one market |
| Copy | *"One banking license per market. One benefits policy everywhere."* |
| Image | 1792×1024, on-brand, text spelled correctly |
| Storage + `/api/ads/[id]` | Written, served, correct ETag |
| `/lp/[id]` | Renders publicly, uses the pre-rendered green logos |
| Basic auth | 401/200 correct, `/lp/*` exempt |

### Two faults this run found

**Research returned the wrong kind of thing.** The streaming route never
received `market.segmentExamples`, so the model free-texted from the website and
returned Revolut's *commercial* priorities — "Customer acquisition and
retention", "Product feature development". Those match nothing in the vault, and
worse, "acquisition" token-matched "Post-acquisition harmonisation", so the
matcher returned confident nonsense.

Fixed in two places, because a prompt alone is not a guarantee:
- the prompt now carries the closed list and states plainly that a challenge is
  a problem the organisation has *running benefits for its own staff*, not its
  business strategy;
- `lib/segments.ts` validates what comes back, snapping names onto the allowed
  list and dropping anything else, plus rejecting "Europe"/"Multiple" as cities.

**Supabase TLS.** Supabase signs database certificates with its own private root,
so turning on verification broke the connection. Rather than disabling it again,
`supabase/prod-ca-2021.crt` is pinned — downloaded from Supabase over a verified
connection and checked, by fingerprint, against the chain the pooler serves.
Verification stays on; only the trust anchor changes.

### The landing page

Rebuilt to mirror thanksben.com rather than the thin hero the prototype had:
sticky nav, tailored hero over the brand gradient, an **animated logo marquee**,
a tailored problem statement, Ben's three pillars (01 Manage / 02 Experience /
03 Insights) with per-prospect body copy, the "Other platforms added AI" section,
the real stat row, matched peers, and a closing CTA.

The marquee is two identical groups side by side in a `max-content` track,
animated to `translate3d(-50%, …)` — when the first group leaves the viewport the
second sits exactly where it started, so the loop is seamless with no JS. Edges
are masked, hover pauses it, and `prefers-reduced-motion` turns it into a plain
scroller. The images must **not** be lazy-loaded: they live inside the translated
track, so each has to contribute its width before the animation starts, or the
50% is measured against the wrong total.

Logos in the marquee are the customers' own colours, from
`public/logos/color/`. The flat-green set in `public/logos/` is still used where
one cohesive ink reads better.

### Still weak: the logo row

The ad's "Trusted by" row is the one visibly poor part. `fetchLogoPng` scrapes
favicons and `og:image`, which gave a full-colour red HSBC hexagon and an "EY
Parthenon" mark in blue and yellow, both fighting Ben's palette; MUFG resolved to
nothing. The same scraping produced Trustpilot badges for the landing page.
**Setting `LOGO_DEV_TOKEN` is the fix** — it is tried first and returns clean
transparent wordmarks. Until then, review anything the logo script produces.

### Still unverified

Supabase Storage (the run used the local-disk driver, since `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are not set), the remix path, and multi-market
fan-out — the test prospect only yielded one office city.
