import { DEPARTMENTS, type DepartmentSlug } from "@/lib/departments";
import { DEFAULT_SEARCH_STATE, RATING_FILTER, SORT_KEYS, type SearchState, type SortKey } from "./types";

/**
 * The query-string contract for /s (see docs/architecture.md):
 *   k       free-text query (`q` is accepted as an alias when reading)
 *   dept    department slug
 *   brand   repeated: brand=Halo+Audio&brand=Voxel
 *   rating  4 (only "4 Stars & Up" exists)
 *   min/max whole dollars (max keeps prices up to max.99)
 *   sort    price-asc | price-desc | rating   (featured is the default and is omitted)
 *   page    1-based, omitted for page 1
 * Parsing never throws: anything malformed falls back to the default for that parameter.
 */

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 100;
const MAX_BRAND_LENGTH = 60;
const MAX_BRANDS = 12;
const MAX_DOLLARS = 100_000;
const MAX_PAGE = 9_999;

function first(params: RawParams, name: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(name) ?? undefined;
  const value = params[name];
  return Array.isArray(value) ? value[0] : value;
}

function all(params: RawParams, name: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(name);
  const value = params[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Removes control characters, collapses whitespace and caps the length. */
export function cleanQuery(raw: string): string {
  let text = "";
  for (const character of raw) {
    const code = character.codePointAt(0) ?? 32;
    text += code < 32 || code === 127 ? " " : character;
  }
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

function wholeNumber(raw: string | undefined, max: number): number | undefined {
  if (raw === undefined || !/^\d{1,7}$/.test(raw.trim())) return undefined;
  const value = Number(raw.trim());
  return value <= max ? value : undefined;
}

export function isDepartmentSlug(value: string | undefined): value is DepartmentSlug {
  return DEPARTMENTS.some((department) => department.slug === value);
}

export function parseSearchParams(params: RawParams): SearchState {
  const brands: string[] = [];
  for (const raw of all(params, "brand")) {
    const brand = cleanQuery(raw).slice(0, MAX_BRAND_LENGTH);
    if (brand && !brands.includes(brand) && brands.length < MAX_BRANDS) brands.push(brand);
  }
  let minPrice = wholeNumber(first(params, "min"), MAX_DOLLARS);
  let maxPrice = wholeNumber(first(params, "max"), MAX_DOLLARS);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  const dept = first(params, "dept");
  const sort = first(params, "sort");
  return {
    query: cleanQuery(first(params, "k") ?? first(params, "q") ?? ""),
    dept: isDepartmentSlug(dept) ? dept : undefined,
    brands,
    minRating: first(params, "rating")?.trim() === String(RATING_FILTER) ? RATING_FILTER : undefined,
    minPrice,
    maxPrice,
    sort: (SORT_KEYS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : DEFAULT_SEARCH_STATE.sort,
    page: wholeNumber(first(params, "page"), MAX_PAGE) || 1,
  };
}

/** Canonical URL for a state: stable parameter order, defaults omitted. "/s" when there is nothing to say. */
export function buildSearchUrl(state: Partial<SearchState>): string {
  const params = new URLSearchParams();
  const query = state.query ? cleanQuery(state.query) : "";
  if (query) params.set("k", query);
  if (state.dept) params.set("dept", state.dept);
  for (const brand of state.brands ?? []) params.append("brand", brand);
  if (state.minRating) params.set("rating", String(state.minRating));
  if (state.minPrice !== undefined) params.set("min", String(state.minPrice));
  if (state.maxPrice !== undefined) params.set("max", String(state.maxPrice));
  if (state.sort && state.sort !== DEFAULT_SEARCH_STATE.sort) params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const text = params.toString();
  return text ? `/s?${text}` : "/s";
}

/** Applies a change to a state. Any change other than the page itself returns to page 1. */
export function updateSearch(state: SearchState, patch: Partial<SearchState>): SearchState {
  return { ...state, ...patch, page: patch.page ?? 1 };
}

export function toggleBrand(state: SearchState, brand: string): SearchState {
  const brands = state.brands.includes(brand) ? state.brands.filter((existing) => existing !== brand) : [...state.brands, brand];
  return updateSearch(state, { brands });
}

export function hasActiveFilters(state: SearchState): boolean {
  return state.brands.length > 0 || state.minRating !== undefined || state.minPrice !== undefined || state.maxPrice !== undefined;
}

/** Number of active filter groups (brand counts once, rating once, price once). */
export function activeFilterCount(state: SearchState): number {
  return (state.brands.length > 0 ? 1 : 0) + (state.minRating !== undefined ? 1 : 0) + (state.minPrice !== undefined || state.maxPrice !== undefined ? 1 : 0);
}

/** Clears brand, rating and price but keeps the query, department and sort. */
export function clearFilters(state: SearchState): SearchState {
  return updateSearch(state, { brands: [], minRating: undefined, minPrice: undefined, maxPrice: undefined });
}

/** True when there is anything to show results for: a query, a department or a filter. */
export function hasCriteria(state: SearchState): boolean {
  return state.query !== "" || state.dept !== undefined || hasActiveFilters(state);
}
