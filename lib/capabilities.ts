// What the product actually does, rendered for a prospect who has never heard the product names.
// Source of truth: data/capabilities.json. See data/SCHEMA.md for the row shape.
import caps from "@/data/capabilities.json";
import type { Specialty } from "./types";

export interface Capability {
  id: number;
  name: string; // internal product name — NEVER used in copy
  layer: string;
  technical: string;
  prospect: string; // plain-language rendering, safe for ad copy
  practices: string[]; // affinity tags; [] means it applies to any practice
  adWorthy: boolean;
  confidence: "published" | "marketing";
}

const ALL = caps as Capability[];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2));
function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/** Stable per-firm rotation so different firms don't all see the same capability first. */
function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Pick the capabilities worth pitching to this practice and render them as prompt bullets.
 * Practice-tagged matches rank first; untagged (universal) ones fill the rest.
 */
export function capabilityBrief(specialty: Specialty, firmName: string, limit = 9): string {
  if (!ALL.length) {
    console.error(
      "[capabilities] data/capabilities.json is empty — ad copy has nothing concrete to work from " +
        "and will come out generic. See data/SCHEMA.md.",
    );
    return "";
  }
  const specTok = toks(`${specialty.name} ${specialty.blurb ?? ""}`);
  const indTok = toks(specialty.industries.join(" "));

  const scored = ALL.filter((c) => c.adWorthy).map((c) => {
    const tagTok = toks(c.practices.join(" "));
    let score = c.practices.length === 0 ? 1 : 0; // universal capabilities are always eligible
    score += overlap(specTok, tagTok) * 3;
    score += overlap(indTok, tagTok) * 2;
    if (c.confidence === "marketing") score -= 0.5; // thinner ground than the shipped UI features
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map((s) => s.c);

  // Rotate so the same capability isn't always bullet one across a campaign.
  const r = seed(firmName) % (top.length || 1);
  const ordered = [...top.slice(r), ...top.slice(0, r)];

  return ordered.map((c) => `- ${c.prospect}`).join("\n");
}
