import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActiveFilters } from "@/components/search/active-filters";
import { EmptyQueryState, NoResultsState } from "@/components/search/empty-states";
import { FacetPanel } from "@/components/search/facet-panel";
import { FilterDrawer } from "@/components/search/filter-drawer";
import { Pagination } from "@/components/search/pagination";
import { ResultRow } from "@/components/search/result-row";
import { SortSelect } from "@/components/search/sort-select";
import { now } from "@/lib/clock";
import { getDepartment } from "@/lib/departments";
import { estimateDelivery } from "@/lib/delivery";
import { searchCatalog } from "@/lib/search/server";
import { summarizeResults } from "@/lib/search/summary";
import { buildSearchUrl, hasCriteria, parseSearchParams, withoutEmptyParams } from "@/lib/search/url";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const state = parseSearchParams(await searchParams);
  if (state.query) return { title: `Results for "${state.query}"` };
  if (state.dept) return { title: getDepartment(state.dept).label };
  return { title: "Search" };
}

/**
 * Search and browse results (FR-SRCH-*). The URL is the only state: it is parsed into a SearchState, run through the
 * pure search pipeline (lib/search), and rendered on the server. A page number past the end is redirected to the last
 * page, so a stale link resolves predictably instead of showing an empty page; a URL with empty parameters (the plain
 * form's "dept=" when it is submitted before hydration) is redirected to its canonical form. Links to /s are not prefetched
 * (prefetch={false} in NavLink and the search components): prefetched head data was reused across different search URLs
 * on client navigation and showed the wrong tab title.
 */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const canonical = withoutEmptyParams(raw);
  if (canonical) redirect(canonical);
  const state = parseSearchParams(raw);
  if (!hasCriteria(state)) return <EmptyQueryState />;

  const { page, facets, baseTotal } = searchCatalog(state);
  if (state.page > page.page) redirect(buildSearchUrl({ ...state, page: page.page }));
  if (page.total === 0 && baseTotal === 0) return <NoResultsState state={state} baseTotal={0} />;

  const asOf = now();
  return (
    <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Refine results" className="hidden lg:block">
        <FacetPanel state={state} facets={facets} idPrefix="sidebar" />
      </aside>
      <section aria-labelledby="results-heading" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-3">
          <div>
            <h1 id="results-heading" className="text-lg font-bold">
              Results
            </h1>
            <p role="status" className="text-sm text-muted">
              {summarizeResults(page, state)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="lg:hidden">
              <FilterDrawer state={state} facets={facets} resultCount={page.total} />
            </div>
            <SortSelect state={state} />
          </div>
        </div>
        <ActiveFilters state={state} />
        {page.total === 0 ? (
          <NoResultsState state={state} baseTotal={baseTotal} embedded />
        ) : (
          <>
            <ul aria-label="Search results">
              {page.items.map((product) => (
                <ResultRow key={product.id} product={product} delivery={estimateDelivery(asOf, product.shipping.businessDays, product.shipping.costCents)} />
              ))}
            </ul>
            <Pagination state={state} page={page.page} pageCount={page.pageCount} />
          </>
        )}
      </section>
    </div>
  );
}
