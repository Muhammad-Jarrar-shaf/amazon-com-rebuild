/** Lower-cases, strips accents and punctuation, and collapses whitespace. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Light plural stemming so "headphones" matches "headphone" and "earbuds" matches "earbud". */
export function stem(word: string): string {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

/** Normalized, non-empty words (unstemmed). */
export function tokenize(text: string): string[] {
  const normalized = normalizeSearchText(text);
  return normalized === "" ? [] : normalized.split(" ");
}
