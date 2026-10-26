# The two data files

These are the system's real IP. The app runs without them — it just produces
generic ads with no social proof, which is the thing that made the prototype
work. Fill both before judging output quality.

Both are populated for Ben. The prototype's originals are in `reference/`, along
with `reference/HARVEST_NOTES.md`, which documents how that vault was harvested
and tagged — worth reading before extending this one.

### Three files, not two

| File | Seeded? | What it is |
| --- | --- | --- |
| `clients.json` | yes | 23 customers with a public citation and a confirmed domain. Only these can appear in generated collateral. |
| `clients.needs-verification.json` | **no** | 9 customers held back, each with a `needsVerification` note saying what to check. |
| `capabilities.json` | n/a (read from disk) | 26 Ben capabilities, 22 of them ad-worthy. |

Nothing moves from the holding file into `clients.json` until both things are
true: the domain is confirmed to be that company, and the customer is **publicly
nameable**. Ads go to competitors of the companies in that logo row, so naming a
customer who has not been publicly named is a real problem, not a tidiness one.

---

## `clients.json` — the knowledge vault

Existing customers whose logos can appear as social proof. Seeded into
`tb_clients` by `POST /api/seed` (upsert on `domain`, so re-running is safe).

```json
[
  {
    "name": "Display name as it should read in an ad",
    "domain": "example.com",
    "logoUrl": "https://www.google.com/s2/favicons?domain=example.com&sz=256",
    "practiceAreas": ["the taxonomy axis matched ×3 — see below"],
    "industries": ["client sectors they serve, matched ×2"],
    "geo": { "country": "United Kingdom", "region": "UK & Ireland" },
    "tier": "a coarse prestige bucket",
    "sourceUrl": "https://… where you verified they are a customer",
    "evidence": "one line on why this counts as a named customer"
  }
]
```

### Rules that matter

- **`domain` is the unique key** and drives logo lookup. Use the registrable
  domain of their primary site, and dedupe before seeding.
- **`region` must be one of `market.regions` in `lib/brand.ts`.** The research
  model is told to pick from that closed set, and `lib/match.ts` scores an exact
  string match. A region here that isn't in that list can never score.
- **`practiceAreas` holds the workforce challenges**, Ben's analogue of a law
  firm's practice area. Matched ×3 — the strongest signal in the system — so the
  values must come from `market.segmentExamples` in `lib/brand.ts`, which is the
  same list the research model picks from. Mismatched vocabularies between the
  two are the most likely reason matching silently returns nothing useful.
- **Watch the shared words.** Because most challenges contain "benefits" or
  "workforce", those are listed in `market.taxonomyStopwords` and ignored when
  scoring. Without that, every tag partially matches every other one.
- **Check your tagging with the explainer**, which runs the real scoring with no
  database: `node scripts/explain-match.mjs "Frontline and shift workforce" "UK & Ireland" "United Kingdom"`
- **`logoUrl` must resolve.** Clearbit's free logo CDN is dead. Google favicons
  at `sz=256` work but look poor composited into an ad; set `LOGO_DEV_TOKEN` for
  real wordmarks.
- **Only name customers you can name publicly.** Every row ends up in a piece of
  marketing collateral shown to a competitor of theirs.

---

## `capabilities.json` — what the product does

What goes into ad copy as the *kind* of thing the product changes. Read straight
off disk by `lib/capabilities.ts`; never seeded into Postgres.

```json
[
  {
    "id": 1,
    "name": "Internal product name — NEVER reaches a prompt",
    "layer": "which part of the system this belongs to",
    "technical": "How you'd describe it to an engineer. Not used in copy.",
    "prospect": "The same thing in plain language, for someone who has never heard of the product. THIS is what reaches the prompt.",
    "practices": ["segment affinity tags; [] means it applies to any segment"],
    "adWorthy": true,
    "confidence": "published"
  }
]
```

### Rules that matter

- **The two-voice split is the point.** Only `prospect` reaches a prompt. Skip
  it and internal jargon lands in an ad.
- **`adWorthy: false`** removes a row from advertising entirely. Use it for
  anything true but unsellable — platform architecture, internals.
- **`confidence`** is `"published"` (shipped, demonstrable) or `"marketing"`
  (claimed). Marketing rows score 0.5 lower, so they appear only when nothing
  better fits.
- **`practices`** should use the same vocabulary as `practiceAreas` above.
  Empty means universal, which is always eligible.
- Nine rows are selected per ad and **rotated by a hash of the prospect's
  name**, so a campaign doesn't lead on the same capability every time. Fewer
  than nine ad-worthy rows means every ad draws on the same small pool.
- Each challenge currently has five to nine directly tagged capabilities. The
  brief always fills to nine, so a thinly-tagged challenge pulls in loosely
  related rows — add tags rather than accept that.
