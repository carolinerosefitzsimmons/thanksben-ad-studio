# thanksben Ad Studio

Second version of the ad-generation prototype. Paste a prospect's URL; the app
researches them, matches comparable existing customers out of a tagged vault,
writes copy for one of their specialisms, and renders display ads plus a
tailored landing page.

Forked from `hgb-anam-2026/caroline-legora` @ `c105d9b` (a legal-AI vendor
selling to law firms) and rebranded. Every vendor- and market-specific string
now lives in **[`lib/brand.ts`](./lib/brand.ts)** — the one file to edit.

**16 fields there are still placeholders, so generation is blocked** until they
are filled; the app says so on its empty state and `/api/generate` returns a 400
naming each one. See the rebrand status at the end of
[ARCHITECTURE.md](./ARCHITECTURE.md) for what is done and what remains.

## Run it

```bash
npm install
cp .env.example .env.local     # then fill it in — see the notes in the file
npm run dev                    # http://localhost:3001
curl -X POST localhost:3001/api/seed   # once: loads data/clients.json into Postgres
```

Then, in order: fill `lib/brand.ts`, then `data/clients.json` and
`data/capabilities.json` (shape and rules in [data/SCHEMA.md](./data/SCHEMA.md)),
then swap the three reference ads in `assets/refs/`.

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
selected market**. The image dominates. There is no auth, rate limit or spend
cap on `/api/generate` — add one before this is reachable by anyone else.

## Layout

```
lib/brand.ts    THE SEAM — who we are, who we sell to, brand colours
app/api/        the pipeline, one route per stage
app/lp/[id]/    the generated landing page
lib/            research · match · copy · capabilities · image · logos · landing
data/           the knowledge vault + capability library (the real IP)
data/reference/ Legora's originals, kept as worked examples
assets/refs/    three reference ads that set the visual identity of every output
supabase/       the schema, applied at runtime
scripts/        one-off asset and logo preparation
```
