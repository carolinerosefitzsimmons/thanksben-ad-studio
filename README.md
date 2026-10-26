# Ben Ad Studio

Paste a prospect's URL. The studio researches them as an *employer*, works out
which benefits problem they most likely have, finds comparable Ben customers to
use as social proof, writes the copy, and renders a finished 16:9 ad plus a
tailored landing page.

Built for [Ben](https://www.thanksben.com) — the AI-native benefits platform.

> **Status: working prototype.** Run end to end against live Anthropic, OpenAI
> and Postgres. Not deployed, not hardened for public traffic. See
> [ARCHITECTURE.md](./ARCHITECTURE.md) for what is and is not verified.

---

## What it produces

For a prospect like Revolut, from nothing but `revolut.com`:

> **One banking license per market. One benefits policy everywhere.**
> *Ben keeps that single policy compliant as reward rules shift with every new
> jurisdiction you launch in.*

rendered as a 1792×1024 ad in Ben's illustrated brand language — the wordmark, a
benimal, the coral-to-mint gradient, an illustrated London — with a "Trusted by"
row carrying real customer logos. Alongside it, a landing page at `/lp/<id>`
with the same tailored angle.

Research takes about 7 seconds. A full generation takes about 90.

---

## How it works

```
URL ─► scrape ─► infer the workforce challenge ─► pick comparable customers
                                                            │
                        ad image ◄── write copy ◄────────────┤
                   landing page ◄───────────────────────────-┘
```

| Stage | What happens | Service |
| --- | --- | --- |
| Research | Scrape the site, infer which of nine benefits challenges applies | Firecrawl, Claude Haiku 4.5 |
| Selection | A human picks the challenge and which office cities to target | — |
| Matching | Score 29 tagged Ben customers for relevance | Postgres, no model |
| Copy | Headline and subhead, grounded in real Ben capabilities | Claude Sonnet 5 |
| Image | One 16:9 ad per selected city | gpt-image-2 |

The interesting decision is in the research step. A law firm's website states
its practice areas; an employer's website does not state its benefits problems.
So the model infers the challenge from observable facts — headcount, how many
countries, frontline versus desk-based, regulatory load — and must pick from a
fixed list of nine. The customer vault is tagged on that same list, which is
what makes matching work.

---

## Run it

```bash
npm install
cp .env.example .env.local        # fill in — the file explains each key
npm run dev                       # http://localhost:3001
curl -X POST localhost:3001/api/seed   # once: loads data/clients.json into Postgres
```

Needs `SUPABASE_DB_URL`, `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`. Without the
OpenAI key everything runs up to the image and then returns a clear error.

`APP_USER`/`APP_PASSWORD` are optional locally and **required in production** —
the studio spends money on every run, so it returns 503 rather than sit open.
`/lp/*` landing pages stay public by design, so they can be sent to a prospect.

Two caps are enforced before anything renders: `MAX_ADS_PER_REQUEST` (default 4)
and `DAILY_AD_LIMIT` (default 50).

---

## Where the real work is

| | |
| --- | --- |
| [`lib/brand.ts`](./lib/brand.ts) | **The seam.** The only file that knows who we are and who we sell to. The app was forked from a tool built for a legal-AI vendor selling to law firms; this is what made that possible. |
| [`data/clients.json`](./data/clients.json) | 29 Ben customers, tagged by challenge, sector, geography and tier. Only publicly-cited, domain-verified customers are in here — nine more are held back in a file that is never seeded. |
| [`data/capabilities.json`](./data/capabilities.json) | 26 Ben capabilities, each written twice: once technically, once in language a prospect would understand. Only the second ever reaches a prompt. |
| [`lib/copy.ts`](./lib/copy.ts) | The copy prompt. Every constraint in it is a scar — read the comments before changing any of them. |
| [`lib/match-score.mjs`](./lib/match-score.mjs) | Social-proof scoring. Deterministic token overlap, not embeddings, so it is instant and explainable. |

```bash
node scripts/explain-match.mjs "Frontline and shift workforce" "UK & Ireland" "United Kingdom"
```

shows which customers would appear in an ad and exactly why each one scored.

---

## Reading further

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — the full teardown: pipeline, prompt
  design, infrastructure, and an honest list of what has and has not been tested.
- **[data/SCHEMA.md](./data/SCHEMA.md)** — the two data files, and the rules that
  keep a customer out of a generated ad until it is safe to name them.
- **[DEPLOY.md](./DEPLOY.md)** — deploying to Vercel, including the one step
  that is not optional.
- **[public/logos/README.md](./public/logos/README.md)** — why automated logo
  sourcing cannot be trusted, with examples of what it got wrong.

## Layout

```
lib/brand.ts         the seam
middleware.ts        Basic auth over everything except /lp/*
app/api/             the pipeline, one route per stage
app/lp/[id]/         the generated landing page (public)
lib/                 research · match · copy · capabilities · image
                     · logos · landing · storage · limits · segments
data/                the vault + capability library
assets/refs/         three real Ben ads that set the visual identity of every output
supabase/            schema, applied at runtime
scripts/             explain-match (dev tool) + logo preparation
```
