import Link from "next/link";
import { pageWindow } from "@/lib/search/engine";
import type { SearchState } from "@/lib/search/types";
import { buildSearchUrl, updateSearch } from "@/lib/search/url";

const CELL = "flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-md border px-3 text-sm";

/** Numbered pagination (Previous, 1 ... n ..., Next). Every link keeps the query, filters and sort; the page is `page=`. */
export function Pagination({ state, page, pageCount }: { state: SearchState; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const hrefFor = (target: number) => buildSearchUrl(updateSearch(state, { page: target }));
  return (
    <nav aria-label="Pagination" className="mt-6">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link prefetch={false} href={hrefFor(page - 1)} rel="prev" className={`${CELL} border-line bg-white text-ink hover:bg-page-gray`}>
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className={`${CELL} border-transparent text-muted`}>
              Previous
            </span>
          )}
        </li>
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={entry}>
              {entry === page ? (
                <span aria-current="page" aria-label={`Page ${entry}, current page`} className={`${CELL} border-thumb bg-white font-bold text-ink`}>
                  {entry}
                </span>
              ) : (
                <Link prefetch={false} href={hrefFor(entry)} aria-label={`Go to page ${entry}`} className={`${CELL} border-line bg-white text-ink hover:bg-page-gray`}>
                  {entry}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {page < pageCount ? (
            <Link prefetch={false} href={hrefFor(page + 1)} rel="next" className={`${CELL} border-line bg-white text-ink hover:bg-page-gray`}>
              Next
            </Link>
          ) : (
            <span aria-disabled="true" className={`${CELL} border-transparent text-muted`}>
              Next
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
