import Link from "next/link";
import { CloseIcon } from "@/components/icons";
import { priceRangeLabel } from "@/lib/search/summary";
import { RATING_FILTER, type SearchState } from "@/lib/search/types";
import { buildSearchUrl, clearFilters, hasActiveFilters, toggleBrand, updateSearch } from "@/lib/search/url";

/** The active filters as removable chips (each a real link to the URL without it), plus "Clear filters". */
export function ActiveFilters({ state }: { state: SearchState }) {
  if (!hasActiveFilters(state)) return null;
  const chips: { key: string; label: string; href: string }[] = [
    ...state.brands.map((brand) => ({ key: `brand-${brand}`, label: `Brand: ${brand}`, href: buildSearchUrl(toggleBrand(state, brand)) })),
  ];
  if (state.minRating) chips.push({ key: "rating", label: `${RATING_FILTER} Stars & Up`, href: buildSearchUrl(updateSearch(state, { minRating: undefined })) });
  if (state.minPrice !== undefined || state.maxPrice !== undefined) {
    chips.push({
      key: "price",
      label: `Price: ${priceRangeLabel(state.minPrice, state.maxPrice)}`,
      href: buildSearchUrl(updateSearch(state, { minPrice: undefined, maxPrice: undefined })),
    });
  }
  return (
    <nav aria-label="Active filters" className="mt-3">
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              prefetch={false}
              href={chip.href}
              aria-label={`Remove filter: ${chip.label}`}
              className="inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm text-ink hover:bg-page-gray sm:min-h-9"
            >
              {chip.label}
              <CloseIcon className="size-3.5" />
            </Link>
          </li>
        ))}
        <li>
          <Link prefetch={false} href={buildSearchUrl(clearFilters(state))} className="inline-flex min-h-[var(--tap)] items-center px-2 text-sm text-link hover:text-price-sale hover:underline sm:min-h-9">
            Clear filters
          </Link>
        </li>
      </ul>
    </nav>
  );
}
