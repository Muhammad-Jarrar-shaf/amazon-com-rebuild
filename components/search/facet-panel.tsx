"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import type { Facets } from "@/lib/search/engine";
import { RATING_FILTER, type SearchState } from "@/lib/search/types";
import { buildSearchUrl, clearFilters, hasActiveFilters, toggleBrand, updateSearch } from "@/lib/search/url";

const HEADING = "mb-1 text-base font-bold";
const CHECK_ROW = "flex min-h-[var(--tap)] cursor-pointer items-center gap-2.5 py-0.5 lg:min-h-8";

function dollars(raw: string): number | undefined {
  return /^\d{1,6}$/.test(raw.trim()) ? Number(raw.trim()) : undefined;
}

/**
 * The three approved refinements: Brand (checkboxes, multi-select), Customer Reviews ("4 Stars & Up") and Price
 * (ready-made ranges plus a custom minimum and maximum). Each change navigates to the matching URL, so the URL stays
 * the single source of truth. Used in the desktop sidebar and inside the mobile filter drawer (idPrefix keeps ids unique).
 */
export function FacetPanel({ state, facets, idPrefix }: { state: SearchState; facets: Facets; idPrefix: string }) {
  const router = useRouter();
  // The URL is the source of truth, but controls must respond at once: show the requested state until the navigation lands.
  const [shown, showOptimistically] = useOptimistic(state, (_current: SearchState, next: SearchState) => next);
  const [, startTransition] = useTransition();
  const go = (next: SearchState) =>
    startTransition(() => {
      showOptimistically(next);
      router.push(buildSearchUrl(next));
    });
  const [priceError, setPriceError] = useState("");

  const submitPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawMin = String(data.get("min") ?? "").trim();
    const rawMax = String(data.get("max") ?? "").trim();
    const min = dollars(rawMin);
    const max = dollars(rawMax);
    if ((rawMin && min === undefined) || (rawMax && max === undefined)) {
      setPriceError("Enter whole dollar amounts.");
      return;
    }
    setPriceError("");
    const [low, high] = min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];
    go(updateSearch(shown, { minPrice: low, maxPrice: high }));
  };

  const priceActive = shown.minPrice !== undefined || shown.maxPrice !== undefined;

  return (
    <div className="space-y-5 text-sm">
      {hasActiveFilters(shown) && (
        <Link prefetch={false} href={buildSearchUrl(clearFilters(shown))} className="inline-flex min-h-[var(--tap)] items-center text-link hover:text-price-sale hover:underline lg:min-h-0">
          Clear filters
        </Link>
      )}

      <fieldset>
        <legend className={HEADING}>Customer Reviews</legend>
        <label className={CHECK_ROW}>
          <input
            type="checkbox"
            checked={shown.minRating === RATING_FILTER}
            onChange={(event) => go(updateSearch(shown, { minRating: event.target.checked ? RATING_FILTER : undefined }))}
            className="size-4 accent-link"
          />
          <span>
            {RATING_FILTER} Stars &amp; Up <span className="text-muted">({facets.fourStarCount})</span>
          </span>
        </label>
      </fieldset>

      <fieldset>
        <legend className={HEADING}>Brand</legend>
        <ul>
          {facets.brands.map((brand) => (
            <li key={brand.name}>
              <label className={CHECK_ROW}>
                <input
                  type="checkbox"
                  checked={shown.brands.includes(brand.name)}
                  onChange={() => go(toggleBrand(shown, brand.name))}
                  className="size-4 accent-link"
                />
                <span>
                  {brand.name} <span className="text-muted">({brand.count})</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className={HEADING}>Price</legend>
        <ul>
          {facets.priceRanges.map((range) => {
            const selected = shown.minPrice === range.min && shown.maxPrice === range.max;
            return (
              <li key={range.label}>
                <Link
                  prefetch={false}
                  href={buildSearchUrl(updateSearch(shown, selected ? { minPrice: undefined, maxPrice: undefined } : { minPrice: range.min, maxPrice: range.max }))}
                  aria-current={selected ? "true" : undefined}
                  className={`flex min-h-[var(--tap)] items-center hover:text-price-sale hover:underline lg:min-h-8 ${selected ? "font-bold text-ink" : "text-link"}`}
                >
                  {range.label} <span className="ml-1 text-muted">({range.count})</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <form key={`${state.minPrice ?? ""}-${state.maxPrice ?? ""}`} onSubmit={submitPrice} className="mt-2 flex flex-wrap items-end gap-2" noValidate>
          <label className="text-xs text-muted">
            Min $
            <input
              name="min"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={state.minPrice ?? ""}
              aria-describedby={priceError ? `${idPrefix}-price-error` : undefined}
              className="mt-0.5 block h-[var(--tap)] w-20 rounded-md border border-line px-2 text-sm text-ink lg:h-9"
            />
          </label>
          <label className="text-xs text-muted">
            Max $
            <input
              name="max"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={state.maxPrice ?? ""}
              className="mt-0.5 block h-[var(--tap)] w-20 rounded-md border border-line px-2 text-sm text-ink lg:h-9"
            />
          </label>
          <button type="submit" className="h-[var(--tap)] rounded-md border border-line bg-white px-4 text-sm text-ink hover:bg-page-gray lg:h-9">
            Go
          </button>
        </form>
        <div role="status" id={`${idPrefix}-price-error`}>
          {priceError && <p className="mt-1 text-xs text-price-sale">{priceError}</p>}
        </div>
        {priceActive && (
          <Link
            prefetch={false}
            href={buildSearchUrl(updateSearch(shown, { minPrice: undefined, maxPrice: undefined }))}
            className="mt-1 inline-flex min-h-[var(--tap)] items-center text-link hover:text-price-sale hover:underline lg:min-h-0"
          >
            Clear price
          </Link>
        )}
      </fieldset>
    </div>
  );
}
