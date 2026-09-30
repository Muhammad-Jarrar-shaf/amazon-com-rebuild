import type { DepartmentSlug } from "@/lib/departments";

export const SORT_KEYS = ["featured", "price-asc", "price-desc", "rating"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  rating: "Avg. Customer Review",
};

export const PAGE_SIZE = 16;
/** The only rating filter: "4 Stars & Up". */
export const RATING_FILTER = 4;

/**
 * Everything the results page depends on. The URL is the source of truth: parse it into this shape
 * (lib/search/url.ts), never keep a second copy in React state.
 */
export interface SearchState {
  /** Free-text query (URL `k`). Empty means browse. */
  query: string;
  dept?: DepartmentSlug;
  /** Selected brands (OR within the facet). */
  brands: string[];
  minRating?: typeof RATING_FILTER;
  /** Whole dollars; lower bound inclusive. */
  minPrice?: number;
  /** Whole dollars; inclusive of the whole dollar (max=49 keeps $49.99). */
  maxPrice?: number;
  sort: SortKey;
  /** 1-based; may be out of range until the page resolves it. */
  page: number;
}

export const DEFAULT_SEARCH_STATE: SearchState = { query: "", brands: [], sort: "featured", page: 1 };

/** Ready-made price ranges shown in the refinements (whole dollars; max inclusive of the whole dollar). */
export const PRICE_RANGES: readonly { label: string; min?: number; max?: number }[] = [
  { label: "Under $25", max: 24 },
  { label: "$25 to $49", min: 25, max: 49 },
  { label: "$50 to $99", min: 50, max: 99 },
  { label: "$100 to $199", min: 100, max: 199 },
  { label: "$200 & Above", min: 200 },
];
