"use client";

import { useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { FacetPanel } from "@/components/search/facet-panel";
import type { Facets } from "@/lib/search/engine";
import type { SearchState } from "@/lib/search/types";
import { activeFilterCount } from "@/lib/search/url";

/**
 * Mobile and tablet filter control: a "Filters" button (with the number of active filter groups) that opens the same
 * refinements in a native modal <dialog> (focus trap, Escape, focus returns to the button). Selections apply
 * immediately and live in the URL; "Show N results" simply closes the drawer.
 */
export function FilterDrawer({ state, facets, resultCount }: { state: SearchState; facets: Facets; resultCount: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = activeFilterCount(state);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex h-[var(--tap)] items-center gap-2 rounded-lg border border-line bg-[#f0f2f2] px-4 text-sm text-ink hover:bg-[#e3e6e6]"
      >
        Filters
        {active > 0 && (
          <span aria-label={`${active} active`} className="flex size-5 items-center justify-center rounded-full bg-nav text-xs font-bold text-white">
            {active}
          </span>
        )}
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Filters"
        className="filter-drawer"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex min-h-[60px] shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
            <h2 className="text-lg font-bold">Filters</h2>
            <button type="button" aria-label="Close filters" onClick={close} className="flex size-[var(--tap)] items-center justify-center rounded-md hover:bg-page-gray">
              <CloseIcon className="size-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FacetPanel state={state} facets={facets} idPrefix="drawer" />
          </div>
          <div className="shrink-0 border-t border-line p-3">
            <button type="button" onClick={close} className="min-h-[var(--tap)] w-full rounded-full bg-cta px-4 py-2 text-sm text-ink hover:bg-cta-hover">
              Show {resultCount} {resultCount === 1 ? "result" : "results"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
