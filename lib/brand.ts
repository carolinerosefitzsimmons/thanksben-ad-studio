// ─────────────────────────────────────────────────────────────────────────────
// THE SEAM.
//
// The single place that knows who we are and who we sell to. Nothing else in
// the codebase contains the vendor's name, the market's vocabulary, or the
// brand's colours.
//
// Configured for Ben (thanksben.com) — an AI-native employee benefits platform
// selling to multi-country employers. Forked from a tool built for a legal-AI
// vendor selling to law firms; the architecture carried over, this file did not.
//
// `brandGaps()` reports any field still holding a REPLACE placeholder, and
// /api/generate refuses to run while any remain.
// ─────────────────────────────────────────────────────────────────────────────

export const PLACEHOLDER = "REPLACE";

export const vendor = {
  /** Display name, as it should appear in ad copy. The product is "Ben", not "thanksben". */
  name: "Ben",

  /** Legal/full name, for page titles and metadata. */
  fullName: "Ben",

  /** What we are, in one noun phrase, for someone who has never heard of us. */
  descriptor: "an AI-native employee benefits platform",

  /** The brand line ads should echo in register — not quoted, just the voice. */
  voiceLine: "Benefits that work for life.",

  /** The same, for landing pages, which are plainer than ads. */
  landingVoiceLine: "Get benefits that get your people.",

  /**
   * Words the copywriter must never reach for. The first four are generic
   * B2B filler; the rest are specific to this category and sound like every
   * other benefits vendor.
   */
  bannedWords: [
    "velocity", "friction", "unlock", "supercharge",
    "holistic", "seamless", "empower", "journey", "one-stop shop", "game-changer",
  ],

  /** Rendered as the wordmark inside generated ad images. */
  wordmarkText: "Ben",

  /** The ad's visual language, described for the image model. */
  visualLanguage:
    "warm, optimistic and graphic — a soft off-white (#F8F9F3) ground, a very large " +
    "dark-green (#002923) headline set in a heavy geometric grotesque with tight leading, " +
    "generous negative space, and one flowing coral-to-peach-to-mint gradient used either " +
    "as the full background or as a soft shape; clean, friendly, never corporate-stock",

  /** The non-typographic mark allowed in a generated ad. */
  markDescription:
    "the Ben logo: a solid rounded-square ring enclosing a single horizontal rounded bar " +
    "(a toggle switch seen head-on), set immediately left of the lowercase-weighted wordmark \"Ben\"",

  /**
   * Ben's illustrated characters. Unique to this brand and the main reason its
   * ads don't look like everyone else's, so the image prompt asks for one by
   * description rather than leaving the model to invent a mascot.
   */
  characterStyle:
    "a \"benimal\" — a single friendly anthropomorphic animal (elephant, stork, gorilla, " +
    "hare) drawn as clean line art with a dark-green outline of even weight, filled with a " +
    "coral-to-mint vertical gradient, wearing contemporary casual office clothing and doing " +
    "an ordinary human thing (working at a laptop, roller-skating, carrying a guitar case)",
} as const;

export const palette = {
  /** Ben dark green. Sampled from the official logo plate. */
  primary: "#002924",
  /** Ben off-white. Sampled from the official ad backgrounds. */
  onPrimary: "#F8F9F3",
  /** Muted green used for secondary nav links on thanksben.com. */
  navMuted: "#4E7A70",

  /** Pale mint, for selected rows. */
  primarySoft: "#EAF4F0",
  /** Deeper green, for buttons on photographic or gradient backgrounds. */
  primaryDeep: "#001A16",
  /** Gradient stops, sampled from the official brand gradient. */
  coral: "#F37A69",
  peach: "#F89969",
  sand: "#FFF3C9",
  mint: "#75BCAC",
} as const;

export const assets = {
  /** Cut out of the official logo plate — see the note in components/BrandLogo.tsx. */
  wordmark: "/ben-wordmark.png",
  wordmarkLight: "/ben-wordmark-light.png",
  mark: "/ben-mark.png",
  markLight: "/ben-mark-light.png",
  landingHero: "/ben-gradient.png",
  benimals: "/ben-benimals.png",
  /** Reference creative in assets/refs/, fed to the image model as style guides. */
  referenceAds: ["ad-benimal-cards.png", "ad-benimal-hero.png", "ad-gradient.png"],
} as const;

/** The market we sell into: employers buying benefits for their people. */
export const market = {
  prospectNoun: "employer",
  prospectNounPlural: "employers",

  /** The people inside a prospect who own this problem. */
  practitionerNoun: "reward lead",
  practitionerNounPlural: "reward and people teams",

  /** Who the headline has to land with on first read. */
  decisionMakerNoun: "reward director",

  /**
   * Ben's analogue of a law firm's "practice area": the benefits problem a
   * given employer has, inferred from their visible footprint. This is the
   * axis the vault is tagged on and the one scored ×3 in lib/match.ts.
   */
  segmentLabel: "workforce challenge",
  segmentLabelPlural: "workforce challenges",

  /** The closed-ish set the research model picks from. Keep in sync with data/clients.json. */
  segmentExamples: [
    "Multi-country benefits complexity",
    "Payroll accuracy at scale",
    "Low benefits engagement",
    "Frontline and shift workforce",
    "Rapid headcount growth",
    "Post-acquisition harmonisation",
    "Regulated-industry compliance",
    "Distributed and remote teams",
    "Cost control under scrutiny",
  ],

  /**
   * Words that appear in so many tags they carry no signal. Without these,
   * "Low benefits engagement" partially matches "Multi-country benefits
   * complexity" on the word "benefits" alone and unrelated peers look relevant.
   */
  taxonomyStopwords: ["benefits", "workforce", "under", "and", "the", "for"],

  /** The prospect's OWN sector — not, as in the legal original, sectors they serve. */
  sectorLabel: "sector",
  sectorExamples: [
    "Financial Services",
    "Retail & Consumer",
    "Technology",
    "Energy & Utilities",
    "Healthcare & Life Sciences",
    "Logistics & Transport",
    "Professional Services",
    "Manufacturing",
    "Hospitality & Food",
  ],

  /** Coarse geographic buckets. Ben sells across Europe and North America. */
  regions: [
    "UK & Ireland", "Nordics", "DACH", "Benelux", "Southern Europe", "France",
    "Central & Eastern Europe", "North America", "Middle East", "Asia-Pacific", "Global",
  ],

  /**
   * Headlines that are true of every employer and bespoke to none. Banned by
   * example, because generic output is the main failure mode.
   */
  bannedHeadlines: [
    "Benefits, simplified.",
    "Employee benefits that work.",
    "Put your people first.",
    "The future of reward.",
  ],

  /** Pre-built for prompts that need the noun with an article. */
  withArticlePrompt: "an employer",

  /** Shown as the example in the URL box. */
  exampleProspectDomain: "zalando.com",

  /** The landing headline must match this or it reads as the employer's own slogan. */
  landingHeadlineGuard: /\b(ai|ben)\b/i,
} as const;

/** Vault taxonomy: how a customer row is tagged. Mirrors data/SCHEMA.md. */
export const vault = {
  /**
   * Tiers that make a logo recognisable enough to be worth showing. Used only
   * as a tie-break in lib/match.ts when scores are level.
   */
  marqueePattern: /global enterprise|ftse|public company|household/i,
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

/** "employer" -> "an employer". Market nouns are configurable, so the article is too. */
export function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun.trim()) ? "an" : "a"} ${noun}`;
}
