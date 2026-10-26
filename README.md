# thanksben Ad Studio

Second version of the ad-generation prototype. Paste a prospect's URL; the app
researches them, matches comparable existing customers out of a tagged vault,
writes copy for one of their specialisms, and renders display ads plus a
tailored landing page.

Forked from `hgb-anam-2026/caroline-legora` @ `c105d9b` (a legal-AI vendor
selling to law firms) and rebranded for Ben. Every vendor- and market-specific
string lives in **[`lib/brand.ts`](./lib/brand.ts)** — the one file to edit.

The brand config is complete, the vault holds 23 publicly-citable customers and
the capability library holds 26 entries. What it has never done is render an
image: that needs an OpenAI key. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Run it

```bash
npm install
cp .env.example .env.local     # then fill it in — see the notes in the file
npm run dev                    # http://localhost:3001
curl -X POST localhost:3001/api/seed   # once: loads data/clients.json into Postgres
```

`APP_USER` and `APP_PASSWORD` are optional in development and **required in
production** — the studio spends money on every run, so it returns 503 rather
than sit open. `/lp/*` landing pages stay public by design.

Nothing works without `SUPABASE_DB_URL`: the matcher reads the vault from
Postgres, so with no database you get a UI and no ads. `ANTHROPIC_API_KEY` and
`OPENAI_API_KEY` are both required for a full generation.

### Minimum viable database

Any Postgres with `gen_random_uuid()` will do (Supabase free tier, Neon, or a
local 13+). There are no migrations: `lib/db.ts` runs
`supabase/schema.sql` on the first query of each server process, and
every statement is `if not exists`.

## Cost per run

One generation = 1 Haiku call (research) + 1 Haiku call (narration) + 1 Sonnet
call (ad copy) + 1 Sonnet call (landing copy) + **one `gpt-image-2` render per
selected market**. The image dominates.

Two caps are enforced before anything is rendered: `MAX_ADS_PER_REQUEST`
(default 4) and `DAILY_AD_LIMIT` (default 50, from midnight UTC). Both return a
429 with the counts rather than silently spending.

## Layout

```
lib/brand.ts    THE SEAM — who we are, who we sell to, brand colours
middleware.ts   HTTP Basic auth over everything except /lp/*
app/api/        the pipeline, one route per stage
app/lp/[id]/    the generated landing page (public)
lib/            research · match · copy · capabilities · image · logos
                · landing · storage · limits
lib/match-score.mjs  pure scoring, shared with scripts/
data/           the vault + capability library (the real IP)
data/reference/ Legora's originals, kept as worked examples
assets/refs/    three real Ben ads that set the visual identity of every output
supabase/       the schema, applied at runtime
scripts/        explain-match (dev tool) + one-off asset preparation
```

## Checking your tagging

```bash
node scripts/explain-match.mjs "Multi-country benefits complexity" "UK & Ireland" "United Kingdom"
```

Runs the real matcher against `data/clients.json` with no database, and prints
which peers would appear in the ad and why each one scored.
