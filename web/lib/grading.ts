/**
 * Auto-grading for Solo Trivia free-text answers. Pure JS — no network call,
 * no cost. Tolerant of case, punctuation, articles, and minor typos.
 */

// Combining diacritical marks (U+0300–U+036F), stripped after NFKD normalize.
const COMBINING_MARKS = /[̀-ͯ]/g;
const LEADING_ARTICLE = /^(?:a|an|the)\s+/;

/**
 * Lowercase, trim, strip punctuation, collapse internal whitespace, and drop
 * one leading article ("a", "an", "the").
 */
export function normalizeAnswer(s: string): string {
  const out = (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "") // café → cafe
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
  return out.replace(LEADING_ARTICLE, "");
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * True when the submitted answer matches the accepted answer after
 * normalization — either exactly, or within a small edit-distance tolerance
 * (the larger of 2 or 20% of the accepted answer's length).
 */
export function isAnswerCorrect(submitted: string, accepted: string): boolean {
  const s = normalizeAnswer(submitted);
  const a = normalizeAnswer(accepted);
  if (!a || !s) return false;
  if (s === a) return true;
  const tolerance = Math.max(2, Math.floor(a.length * 0.2));
  return levenshtein(s, a) <= tolerance;
}
