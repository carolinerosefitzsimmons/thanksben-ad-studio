// Copy that reads like a person wrote it.
//
// Models reach for the em dash and the colon constantly; both are tells. The
// prompts now ban them, but a prompt is a request, not a guarantee, so the
// output is cleaned as well. Everything here is punctuation only — no wording
// is changed.

/** Replace an em/en dash with the punctuation a person would have used. */
function dashes(s: string): string {
  return s
    // " — " joining two clauses becomes a comma, or a full stop if what follows
    // starts a new sentence (a capital that is not a lone initial).
    .replace(/\s*[—–]\s*/g, (_m, offset: number, full: string) => {
      const rest = full.slice(offset).replace(/^\s*[—–]\s*/, "");
      const next = rest.charAt(0);
      const startsSentence = next === next.toUpperCase() && /[A-Z]/.test(next) && !/^[A-Z]\./.test(rest);
      return startsSentence ? ". " : ", ";
    })
    // a dash used as a bullet or a trailing aside
    .replace(/\s*[—–]\s*$/g, "");
}

/** Turn "Label: thing" into "Label. Thing", and drop a dangling colon. */
function colons(s: string): string {
  return s
    .replace(/:\s+(\S)/g, (_m, c: string) => `. ${c.toUpperCase()}`)
    .replace(/:\s*$/g, "");
}

/**
 * Strip the punctuation that marks copy as machine-written.
 * Safe to run twice; it changes punctuation only.
 */
export function stripMachineTells(s: string | null | undefined): string {
  if (!s) return "";
  return colons(dashes(s))
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}
