// ─────────────────────────────────────────────────────────────────────────────
// THE SEAM.
//
// Everything in this file was hardcoded to Legora (a legal-AI vendor selling to
// law firms) in the prototype. It is now the single place that knows who we are
// and who we sell to. Nothing else in the codebase should contain the vendor's
// name, the market's vocabulary, or the brand's colours.
//
// Values marked REPLACE are placeholders. Until they are filled in,
// `brandGaps()` reports them and /api/generate refuses to run — shipping
// "REPLACE_ME" into a rendered ad is worse than a clear error.
//
// The Legora values are kept in comments as a worked example of the register
// each field wants.
// ─────────────────────────────────────────────────────────────────────────────

export const PLACEHOLDER = "REPLACE";

export const vendor = {
  /** Display name, as it should appear in ad copy. */
  name: "thanksben",

  /** Legal/full name, for page titles and metadata. */
  fullName: "thanksben AI",

  /**
   * What we are, in one noun phrase, as a prospect who has never heard of us
   * would need it explained. Goes straight into the copy and image prompts.
   * Legora: "a premium collaborative legal-AI platform"
   */
  descriptor: `${PLACEHOLDER}: a one-phrase description of what thanksben AI is`,

  /**
   * The brand line the ad copy should echo in register — not quoted in the ad,
   * just used to set the voice.
   * Legora: "Law just got more attractive."
   */
  voiceLine: `${PLACEHOLDER}: the brand line whose register ads should echo`,

  /**
   * The same thing for landing pages, which are plainer than ads.
   * Legora: "Collaborative AI for exceptional lawyers"
   */
  landingVoiceLine: `${PLACEHOLDER}: the register for landing-page copy`,

  /** Words the copywriter must never reach for. Add house-style bans here. */
  bannedWords: ["velocity", "friction", "unlock", "supercharge"],

  /** Rendered as the wordmark inside generated ad images. Usually name.toUpperCase(). */
  wordmarkText: "THANKSBEN",

  /**
   * The ad's visual language, described for the image model. This matters less
   * than assets/refs/*.png — the three reference images do most of the work —
   * but it should not contradict them.
   * Legora: "cinematic, editorial, sophisticated; muted elegant tones; generous
   *          negative space; a clean top bar with the wordmark on the left and a
   *          small four-point star icon on the right; refined restrained typography"
   */
  visualLanguage: `${PLACEHOLDER}: how thanksben's creative looks, in one sentence`,

  /** The non-typographic mark allowed in a generated ad, described in words. */
  markDescription: `${PLACEHOLDER}: e.g. "a small four-point star icon"`,
} as const;

export const palette = {
  /** Primary brand colour. Legora: #005230. Also set as `brand` in tailwind.config.ts. */
  primary: "#005230",
  onPrimary: "#ffffff",
  /** Tint of primary used for selected rows in the wizard. */
  primarySoft: "#f1f6f3",
  /** Darker primary, for buttons on photographic backgrounds. Legora: #0b3d2e. */
  primaryDeep: "#0b3d2e",
} as const;

export const assets = {
  /** Public paths. Replace the files themselves in public/. */
  wordmarkSvg: "/legora-wordmark.svg",
  landingHero: "/landing-hero.png",
} as const;

/**
 * The market we sell into. The prototype assumed law firms throughout; every
 * noun below was a hardcoded "law firm", "lawyer", "partner" or "practice area".
 */
export const market = {
  /** What a prospect organisation is called. Legora: "law firm" / "law firms" */
  prospectNoun: `${PLACEHOLDER}: singular, e.g. "law firm"`,
  prospectNounPlural: `${PLACEHOLDER}: plural, e.g. "law firms"`,

  /** The people who do the work we help with. Legora: "lawyer" / "lawyers" */
  practitionerNoun: `${PLACEHOLDER}: singular, e.g. "lawyer"`,
  practitionerNounPlural: `${PLACEHOLDER}: plural, e.g. "lawyers"`,

  /** Who the ad has to land with on first read. Legora: "partner" */
  decisionMakerNoun: `${PLACEHOLDER}: e.g. "partner"`,

  /**
   * What we call a division of a prospect's business. Drives the first wizard
   * step and the taxonomy on every vault row.
   * Legora: "practice area" / "specialism"
   */
  segmentLabel: `${PLACEHOLDER}: e.g. "practice area"`,
  segmentLabelPlural: `${PLACEHOLDER}: e.g. "practice areas"`,

  /**
   * Examples of the KIND of segment to extract, shown to the research model so
   * it returns the right granularity.
   * Legora: "M&A / Corporate", "Competition & Antitrust", "Disputes & Litigation", ...
   */
  segmentExamples: [`${PLACEHOLDER}: 4-8 example segments from your market`],

  /**
   * Client sectors a segment might serve.
   * Legora: "Financial Services", "Energy", "Technology", "Life Sciences"
   */
  sectorExamples: [`${PLACEHOLDER}: 4-6 example client sectors`],

  /** Coarse geographic buckets. Must stay a closed set — the research model picks one. */
  regions: [
    "UK & Ireland", "Nordics", "DACH", "Benelux", "Southern Europe", "France",
    "Central & Eastern Europe", "North America", "Middle East", "Asia-Pacific", "Global",
  ],

  /**
   * Headlines that are true of every prospect and bespoke to none. The copy
   * prompt bans these by example; generic output is the main failure mode.
   * Legora: "Due diligence. Faster.", "Deal velocity"
   */
  bannedHeadlines: [`${PLACEHOLDER}: 2-3 generic headlines to ban by example`],

  /**
   * Regex the landing headline must match, or it reads as the prospect's own
   * tagline rather than software being sold to them. Keep the vendor name in it.
   */
  landingHeadlineGuard: /\b(ai|thanksben)\b/i,
} as const;

/** Vault taxonomy: how a customer row is tagged. Mirrors data/SCHEMA.md. */
export const vault = {
  /** Tier labels used for the marquee tie-break in lib/match.ts. */
  marqueePattern: new RegExp(PLACEHOLDER, "i"),
} as const;

const PLACEHOLDER_RE = new RegExp(PLACEHOLDER);

function scan(path: string, value: unknown, out: string[]): void {
  if (typeof value === "string") {
    if (PLACEHOLDER_RE.test(value)) out.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scan(`${path}[${i}]`, v, out));
  } else if (value instanceof RegExp) {
    if (PLACEHOLDER_RE.test(value.source)) out.push(path);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) scan(`${path}.${k}`, v, out);
  }
}

/** Every field still holding a placeholder, as dotted paths. Empty = configured. */
export function brandGaps(): string[] {
  const out: string[] = [];
  scan("vendor", vendor, out);
  scan("market", market, out);
  scan("vault", vault, out);
  return out;
}

export function isBrandConfigured(): boolean {
  return brandGaps().length === 0;
}

/**
 * A brand string for display in the app's own UI. Unconfigured fields would
 * otherwise render their REPLACE instructions into the interface, so fall back
 * to a neutral word. Prompts deliberately do NOT use this — they are gated by
 * brandGaps() instead, so a placeholder can never reach a generated ad.
 */
export function label(value: string, fallback: string): string {
  return PLACEHOLDER_RE.test(value) ? fallback : value;
}
