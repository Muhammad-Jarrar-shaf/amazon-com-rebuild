import { normalizeSearchText, tokenize } from "./text";

// Autocomplete over a small list of terms. Pure and client-safe: it never imports the catalog. The terms are derived
// from the catalog on the server (lib/search/server.ts) and passed to the search bar as props, so no request is
// made while typing and the same input always yields the same suggestions.

export type SuggestionKind = "popular" | "category" | "brand" | "tag";

export interface SuggestionTerm {
  text: string;
  kind: SuggestionKind;
}

export const MAX_SUGGESTIONS = 8;
export const MIN_SUGGESTION_INPUT = 2;

const KIND_ORDER: Record<SuggestionKind, number> = { popular: 0, category: 1, brand: 2, tag: 3 };

/**
 * Up to 8 suggestions for what has been typed. Terms starting with the input come first, then terms where every typed
 * word starts some word of the term. Popular queries outrank categories, brands and tags; shorter terms and then
 * alphabetical order break ties. Duplicates (after normalization) are dropped.
 */
export function suggest(terms: readonly SuggestionTerm[], input: string, limit: number = MAX_SUGGESTIONS): SuggestionTerm[] {
  const typed = normalizeSearchText(input);
  if (typed.length < MIN_SUGGESTION_INPUT) return [];
  const typedWords = tokenize(typed);
  const matches: { term: SuggestionTerm; group: 0 | 1; normalized: string }[] = [];
  for (const term of terms) {
    const normalized = normalizeSearchText(term.text);
    if (!normalized) continue;
    const words = normalized.split(" ");
    const startsWith = normalized.startsWith(typed);
    const wordsMatch = typedWords.every((typedWord) => words.some((word) => word.startsWith(typedWord)));
    if (startsWith || wordsMatch) matches.push({ term, group: startsWith ? 0 : 1, normalized });
  }
  // Rank first, then drop duplicates, so the best-ranked variant of a term always wins whatever the input order was.
  matches.sort(
    (a, b) =>
      a.group - b.group ||
      KIND_ORDER[a.term.kind] - KIND_ORDER[b.term.kind] ||
      a.normalized.length - b.normalized.length ||
      a.normalized.localeCompare(b.normalized) ||
      a.term.text.localeCompare(b.term.text),
  );
  const seen = new Set<string>();
  const result: SuggestionTerm[] = [];
  for (const match of matches) {
    if (seen.has(match.normalized)) continue;
    seen.add(match.normalized);
    result.push(match.term);
    if (result.length === limit) break;
  }
  return result;
}

/** Splits a suggestion into the part the shopper already typed and the completion (rendered bold). */
export function splitSuggestion(text: string, input: string): { typed: string; completion: string } {
  const typed = input.trim();
  if (typed && text.toLowerCase().startsWith(typed.toLowerCase())) {
    return { typed: text.slice(0, typed.length), completion: text.slice(typed.length) };
  }
  return { typed: "", completion: text };
}
