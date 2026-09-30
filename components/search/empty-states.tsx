import Link from "next/link";
import { ActiveFilters } from "@/components/search/active-filters";
import { ProductCard } from "@/components/pdp/product-card";
import { getFeaturedProducts } from "@/lib/catalog";
import { DEPARTMENTS, departmentHref, getDepartment } from "@/lib/departments";
import { POPULAR_QUERIES } from "@/lib/search/server";
import type { SearchState } from "@/lib/search/types";
import { buildSearchUrl, clearFilters } from "@/lib/search/url";

const CHIP = "inline-flex min-h-[var(--tap)] items-center rounded-full border border-line bg-white px-4 text-sm text-ink hover:bg-page-gray sm:min-h-10";

/** Where to go next: popular searches, departments and a few featured products. Shared by both empty states. */
function WhereNext() {
  return (
    <>
      <section aria-labelledby="popular-searches" className="mt-8">
        <h2 id="popular-searches" className="mb-3 text-lg font-bold">
          Popular searches
        </h2>
        <ul className="flex flex-wrap gap-2">
          {POPULAR_QUERIES.map((query) => (
            <li key={query}>
              <Link prefetch={false} href={buildSearchUrl({ query })} className={CHIP}>
                {query}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="shop-departments" className="mt-8">
        <h2 id="shop-departments" className="mb-3 text-lg font-bold">
          Shop by department
        </h2>
        <ul className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((department) => (
            <li key={department.slug}>
              <Link prefetch={false} href={departmentHref(department.slug)} className={CHIP}>
                {department.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="popular-products" className="mt-8 border-t border-line pt-6">
        <h2 id="popular-products" className="mb-4 text-lg font-bold">
          Popular right now
        </h2>
        <ul className="relative flex snap-x gap-4 overflow-x-auto pb-3">
          {getFeaturedProducts(6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      </section>
    </>
  );
}

/** /s with no query, department or filter: search guidance and discovery paths (not an error). */
export function EmptyQueryState() {
  return (
    <div className="mx-auto max-w-4xl py-4">
      <h1 className="text-2xl font-bold">What are you looking for?</h1>
      <p className="mt-2 max-w-prose text-base text-muted">
        Type a product, brand or category into the search box above, or start with one of these.
      </p>
      <WhereNext />
    </div>
  );
}

/**
 * No results. Two situations with different fixes: the query matches nothing at all, or it matches but the filters
 * remove everything (then say how many results there are without the filters and offer to clear them).
 */
export function NoResultsState({ state, baseTotal, embedded = false }: { state: SearchState; baseTotal: number; embedded?: boolean }) {
  // Embedded inside the results page (which already has the h1 and the filter chips): use an h2 and skip the chips.
  const Heading = embedded ? "h2" : "h1";
  const filtersCaused = baseTotal > 0;
  const scope = state.dept ? ` in ${getDepartment(state.dept).label}` : "";
  return (
    <div className={`max-w-4xl py-4 ${embedded ? "" : "mx-auto"}`}>
      {filtersCaused ? (
        <>
          <Heading className="text-2xl font-bold">No results match your filters</Heading>
          <p className="mt-2 max-w-prose text-base text-muted">
            {state.query ? `Your search for "${state.query}"${scope}` : `Browsing${scope || " all products"}`} has {baseTotal} {baseTotal === 1 ? "result" : "results"} before the
            filters. Remove a filter to see them.
          </p>
          {!embedded && <ActiveFilters state={state} />}
          <Link
            prefetch={false}
            href={buildSearchUrl(clearFilters(state))}
            className="mt-4 inline-flex min-h-[var(--tap)] items-center rounded-full bg-cta px-6 text-sm text-ink hover:bg-cta-hover"
          >
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <Heading className="text-2xl font-bold">{state.query ? `No results for "${state.query}"${scope}` : `No results${scope}`}</Heading>
          <ul className="mt-3 max-w-prose list-disc space-y-1 pl-5 text-base text-muted">
            <li>Check the spelling of your search.</li>
            <li>Try fewer or more general words, such as &ldquo;headphones&rdquo; instead of a full product name.</li>
            {state.dept && (
              <li>
                <Link prefetch={false} href={buildSearchUrl({ query: state.query })} className="text-link hover:text-price-sale hover:underline">
                  Search all departments
                </Link>{" "}
                instead of only {getDepartment(state.dept).label}.
              </li>
            )}
          </ul>
        </>
      )}
      <WhereNext />
    </div>
  );
}
