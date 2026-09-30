import type { Product } from "@/lib/catalog/types";
import { getDefaultVariant } from "@/lib/catalog/variants";
import { getDepartment } from "@/lib/departments";
import { PAGE_SIZE, PRICE_RANGES, RATING_FILTER, type SearchState, type SortKey } from "./types";
import { normalizeSearchText, stem, tokenize } from "./text";

// Search, filter, sort and paginate: pure functions over a product list. No catalog import, no I/O, no randomness,
// so results are deterministic and the whole thing is unit-testable. lib/search/server.ts feeds it the seed catalog.

// ---- ranking ----------------------------------------------------------------------------------------------------

/** Field weights, x10 so scores stay integers. A match in the title outranks brand, category, tag, department. */
const WEIGHTS = { title: 100, brand: 80, category: 60, tag: 40, department: 20 } as const;
const PREFIX_FACTOR = 0.6;
const PHRASE_BONUS = 300;
const STARTS_WITH_BONUS = 100;

export interface IndexedProduct {
  product: Product;
  words: Record<keyof typeof WEIGHTS, string[]>;
  /** Normalized title, for whole-phrase bonuses. */
  titleText: string;
}

const indexCache = new WeakMap<readonly Product[], readonly IndexedProduct[]>();

function stemmedWords(text: string): string[] {
  return tokenize(text).map(stem);
}

export function buildIndex(products: readonly Product[]): readonly IndexedProduct[] {
  const cached = indexCache.get(products);
  if (cached) return cached;
  const built = products.map((product) => ({
    product,
    words: {
      title: stemmedWords(product.title),
      brand: stemmedWords(product.brand),
      category: stemmedWords(product.category),
      tag: product.tags.flatMap(stemmedWords),
      department: stemmedWords(getDepartment(product.department).label),
    },
    titleText: normalizeSearchText(product.title),
  }));
  indexCache.set(products, built);
  return built;
}

/** Best match of one (stemmed) query token over all fields: exact word = full weight, word prefix = 60%. 0 = no match. */
function tokenScore(indexed: IndexedProduct, token: string): number {
  let best = 0;
  for (const field of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    for (const word of indexed.words[field]) {
      if (word === token) best = Math.max(best, WEIGHTS[field]);
      else if (token.length >= 2 && word.startsWith(token)) best = Math.max(best, Math.round(WEIGHTS[field] * PREFIX_FACTOR));
    }
  }
  return best;
}

/**
 * Relevance of a product for a query, or 0 when it does not match. Every query word must match some field (AND);
 * the score is the sum of each word's best field, plus bonuses when the whole phrase appears in the title.
 */
export function scoreProduct(indexed: IndexedProduct, tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(indexed, stem(token));
    if (score === 0) return 0;
    total += score;
  }
  const phrase = tokens.join(" ");
  if (tokens.length > 1 && indexed.titleText.includes(phrase)) total += PHRASE_BONUS;
  if (indexed.titleText.startsWith(phrase)) total += STARTS_WITH_BONUS;
  return total;
}

/** Deterministic base order: featured rank first, then rating, review count and id. */
export function compareDefault(a: Product, b: Product): number {
  const rankA = a.featuredRank ?? Number.POSITIVE_INFINITY;
  const rankB = b.featuredRank ?? Number.POSITIVE_INFINITY;
  if (rankA !== rankB) return rankA - rankB;
  return b.rating - a.rating || b.ratingCount - a.ratingCount || a.id.localeCompare(b.id);
}

/** Products matching a query (and department), best first. An empty query returns the department (or everything) in the default order. */
export function searchProducts(products: readonly Product[], query: string, dept?: SearchState["dept"]): Product[] {
  const pool = dept ? products.filter((product) => product.department === dept) : [...products];
  const tokens = tokenize(query);
  if (tokens.length === 0) return pool.sort(compareDefault);
  const inPool = new Set(pool.map((product) => product.id));
  return buildIndex(products)
    .filter((indexed) => inPool.has(indexed.product.id))
    .map((indexed) => ({ product: indexed.product, score: scoreProduct(indexed, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || compareDefault(a.product, b.product))
    .map((entry) => entry.product);
}

// ---- filters ----------------------------------------------------------------------------------------------------

export interface Filters {
  brands: readonly string[];
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
}

/** The price a shopper sees for a product: its default variant's. */
export function displayPriceCents(product: Product): number {
  return getDefaultVariant(product).priceCents;
}

const matchesBrand = (product: Product, brands: readonly string[]) => brands.length === 0 || brands.includes(product.brand);
const matchesRating = (product: Product, minRating?: number) => minRating === undefined || product.rating >= minRating;
function matchesPrice(product: Product, minPrice?: number, maxPrice?: number): boolean {
  const cents = displayPriceCents(product);
  if (minPrice !== undefined && cents < minPrice * 100) return false;
  // max is inclusive of the whole dollar: max=49 keeps $49.99 and drops $50.00.
  if (maxPrice !== undefined && cents >= (maxPrice + 1) * 100) return false;
  return true;
}

type Facet = "brand" | "rating" | "price";

/** Applies the filters, optionally leaving one facet out (used to count that facet's options). */
export function applyFilters(products: readonly Product[], filters: Filters, skip?: Facet): Product[] {
  return products.filter(
    (product) =>
      (skip === "brand" || matchesBrand(product, filters.brands)) &&
      (skip === "rating" || matchesRating(product, filters.minRating)) &&
      (skip === "price" || matchesPrice(product, filters.minPrice, filters.maxPrice)),
  );
}

export interface Facets {
  /** Brands with the number of matching products, given every other active filter. Always includes selected brands. */
  brands: { name: string; count: number }[];
  /** Products rated 4 or higher, given the other active filters. */
  fourStarCount: number;
  /** Ready-made price ranges with counts, given the other active filters. */
  priceRanges: { label: string; min?: number; max?: number; count: number }[];
}

/** Option counts for the refinements. A facet is counted without its own selection, so choosing one option never hides the others. */
export function computeFacets(base: readonly Product[], filters: Filters): Facets {
  const forBrand = applyFilters(base, filters, "brand");
  const counts = new Map<string, number>();
  for (const product of forBrand) counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  for (const selected of filters.brands) if (!counts.has(selected)) counts.set(selected, 0);
  return {
    brands: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    fourStarCount: applyFilters(base, filters, "rating").filter((product) => matchesRating(product, RATING_FILTER)).length,
    priceRanges: PRICE_RANGES.map((range) => ({
      ...range,
      count: applyFilters(base, filters, "price").filter((product) => matchesPrice(product, range.min, range.max)).length,
    })),
  };
}

// ---- sorting ----------------------------------------------------------------------------------------------------

/** Stable, deterministic sort. "featured" keeps the incoming order (relevance for a query, the default order otherwise). */
export function sortProducts(products: readonly Product[], sort: SortKey): Product[] {
  const decorated = products.map((product, position) => ({ product, position }));
  const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;
  switch (sort) {
    case "price-asc":
      decorated.sort((a, b) => displayPriceCents(a.product) - displayPriceCents(b.product) || byPosition(a, b));
      break;
    case "price-desc":
      decorated.sort((a, b) => displayPriceCents(b.product) - displayPriceCents(a.product) || byPosition(a, b));
      break;
    case "rating":
      decorated.sort((a, b) => b.product.rating - a.product.rating || b.product.ratingCount - a.product.ratingCount || byPosition(a, b));
      break;
    default:
      decorated.sort(byPosition);
  }
  return decorated.map((entry) => entry.product);
}

// ---- pagination -------------------------------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  /** The resolved page: an out-of-range or invalid request is clamped into [1, pageCount]. */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based positions of the first and last item on this page (0 when empty). */
  first: number;
  last: number;
}

export function paginate<T>(items: readonly T[], requestedPage: number, size: number = PAGE_SIZE): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const requested = Number.isInteger(requestedPage) ? requestedPage : 1;
  const page = Math.min(pageCount, Math.max(1, requested));
  const start = (page - 1) * size;
  const slice = items.slice(start, start + size);
  return { items: slice, page, pageCount, total, first: slice.length ? start + 1 : 0, last: slice.length ? start + slice.length : 0 };
}

/** Page links to render: 1 ... (current-1) current (current+1) ... last, with "gap" markers. */
export function pageWindow(current: number, pageCount: number): (number | "gap")[] {
  const wanted = new Set([1, pageCount, current - 1, current, current + 1].filter((page) => page >= 1 && page <= pageCount));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, position) => {
    const previous = sorted[position - 1];
    if (previous !== undefined && page - previous > 1) out.push("gap");
    out.push(page);
  });
  return out;
}

// ---- the whole pipeline -----------------------------------------------------------------------------------------

export interface SearchResult {
  /** The products on the resolved page, in display order. */
  page: Page<Product>;
  facets: Facets;
  /** Matches after search and department, before the brand/rating/price filters. */
  baseTotal: number;
}

/** search -> filter -> sort -> paginate, plus refinement counts. `state.page` is clamped, never trusted. */
export function runSearch(products: readonly Product[], state: SearchState): SearchResult {
  const base = searchProducts(products, state.query, state.dept);
  const filters: Filters = { brands: state.brands, minRating: state.minRating, minPrice: state.minPrice, maxPrice: state.maxPrice };
  const filtered = applyFilters(base, filters);
  return { page: paginate(sortProducts(filtered, state.sort), state.page), facets: computeFacets(base, filters), baseTotal: base.length };
}
