import { getDepartment } from "@/lib/departments";
import { PRICE_RANGES, type SearchState } from "./types";

/** Label for the active price filter: a ready-made range's own label, or one composed from the bounds. */
export function priceRangeLabel(min?: number, max?: number): string {
  const preset = PRICE_RANGES.find((range) => range.min === min && range.max === max);
  if (preset) return preset.label;
  if (min !== undefined && max !== undefined) return `$${min} to $${max}.99`;
  if (min !== undefined) return `$${min} & Above`;
  if (max !== undefined) return `Up to $${max}.99`;
  return "Any price";
}

/**
 * The results count line: "1-16 of 30 results for "headphones" in Electronics". No numbers when there are no
 * results; a single result is "1 result".
 */
export function summarizeResults(page: { first: number; last: number; total: number }, state: Pick<SearchState, "query" | "dept">): string {
  const scope = [state.query ? ` for "${state.query}"` : "", state.dept ? ` in ${getDepartment(state.dept).label}` : ""].join("");
  if (page.total === 0) return `No results${scope}`;
  if (page.total === 1) return `1 result${scope}`;
  return `${page.first}-${page.last} of ${page.total} results${scope}`;
}
