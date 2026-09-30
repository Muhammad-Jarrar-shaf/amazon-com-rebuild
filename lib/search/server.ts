import { getAllProducts } from "@/lib/catalog";
import { runSearch, type SearchResult } from "./engine";
import type { SuggestionTerm } from "./suggest";
import type { SearchState } from "./types";

// Server-side entry points: these import the seed catalog, so client components must not import this module.

/** Curated popular queries. A test asserts every one returns results. */
export const POPULAR_QUERIES: readonly string[] = [
  "headphones",
  "wireless earbuds",
  "noise cancelling headphones",
  "laptop",
  "mechanical keyboard",
  "usb-c cable",
  "coffee",
  "air fryer",
  "cast iron skillet",
  "building blocks",
  "vitamin c serum",
  "novel",
];

export function searchCatalog(state: SearchState): SearchResult {
  return runSearch(getAllProducts(), state);
}

export function brandsInCatalog(): string[] {
  return [...new Set(getAllProducts().map((product) => product.brand))].sort((a, b) => a.localeCompare(b));
}

let cachedTerms: SuggestionTerm[] | undefined;

/** Suggestion terms derived from the catalog: popular queries, categories, brands and tags. Small (a few KB) and stable. */
export function getSuggestionTerms(): SuggestionTerm[] {
  if (cachedTerms) return cachedTerms;
  const products = getAllProducts();
  const terms: SuggestionTerm[] = POPULAR_QUERIES.map((text) => ({ text, kind: "popular" as const }));
  for (const category of new Set(products.map((product) => product.category))) terms.push({ text: category, kind: "category" });
  for (const brand of new Set(products.map((product) => product.brand))) terms.push({ text: brand, kind: "brand" });
  for (const tag of new Set(products.flatMap((product) => product.tags))) terms.push({ text: tag, kind: "tag" });
  cachedTerms = terms;
  return terms;
}
