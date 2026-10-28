import type { GroqTerm } from "../diagnosisTypes";

/**
 * A run of text either shown as-is, or as a tappable glossary term.
 * `term` is set only on segments that should be highlighted.
 */
export interface TermSegment {
  text: string;
  term?: GroqTerm;
}

interface TermMatch {
  start: number;
  end: number;
  term: GroqTerm;
}

/** Letters/digits that should not sit flush against a matched term. */
const isWordChar = (char: string | undefined): boolean =>
  !!char && (/[0-9A-Za-z_]/.test(char) || char.charCodeAt(0) > 127);

/** Slug fallback for terms whose `id` came back empty from the model. */
const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Keep only terms that can actually be highlighted: non-empty `term` and
 * `definition`, no duplicates (case-insensitive), longest phrases first so
 * `late blight` wins over `blight`.
 */
export const normalizeTerms = (
  terms: GroqTerm[] | null | undefined,
): GroqTerm[] => {
  const byKey = new Map<string, GroqTerm>();

  (terms ?? []).forEach((term) => {
    const phrase = term?.term?.trim();
    const definition = term?.definition?.trim();

    if (!phrase || !definition) return;

    const key = phrase.toLowerCase();
    if (byKey.has(key)) return;

    byKey.set(key, {
      id: term?.id?.trim() || toSlug(phrase),
      term: phrase,
      definition,
    });
  });

  return Array.from(byKey.values()).sort(
    (a, b) => b.term.length - a.term.length,
  );
};

/** All case-insensitive, whole-word occurrences of one term inside `text`. */
const findTermMatches = (text: string, term: GroqTerm): TermMatch[] => {
  const needle = term.term.toLowerCase();
  const haystack = text.toLowerCase();
  const matches: TermMatch[] = [];

  if (!needle) return matches;

  let from = 0;

  while (from <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;

    const startOk =
      !isWordChar(text[index]) || !isWordChar(text[index - 1]);
    const endOk =
      !isWordChar(text[index + needle.length - 1]) ||
      !isWordChar(text[index + needle.length]);

    if (startOk && endOk) {
      matches.push({ start: index, end: index + needle.length, term });
    }

    from = index + 1;
  }

  return matches;
};

/**
 * Pick the non-overlapping matches to highlight. Sorted by position, then by
 * length, so a longer phrase at the same position beats a shorter one.
 */
const collectMatches = (text: string, terms: GroqTerm[]): TermMatch[] => {
  const matches = terms
    .flatMap((term) => findTermMatches(text, term))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const picked: TermMatch[] = [];
  let cursor = 0;

  matches.forEach((match) => {
    if (match.start < cursor) return;

    picked.push(match);
    cursor = match.end;
  });

  return picked;
};

/**
 * Split `text` into plain and term segments. The returned segments always
 * concatenate back to the original string, so nothing is lost or reworded.
 */
export const splitByTerms = (
  text: string | null | undefined,
  terms: GroqTerm[],
): TermSegment[] => {
  const value = text ?? "";

  if (!value) return [];
  if (!terms.length) return [{ text: value }];

  const segments: TermSegment[] = [];
  const matches = collectMatches(value, terms);
  let cursor = 0;

  matches.forEach((match) => {
    if (match.start > cursor) {
      segments.push({ text: value.slice(cursor, match.start) });
    }

    segments.push({ text: value.slice(match.start, match.end), term: match.term });
    cursor = match.end;
  });

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor) });
  }

  return segments;
};

/** `true` when at least one glossary term is present in `text`. */
export const hasTerm = (
  text: string | null | undefined,
  terms: GroqTerm[],
): boolean => splitByTerms(text, terms).some((segment) => !!segment.term);
