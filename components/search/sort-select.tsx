"use client";

import { useRouter } from "next/navigation";
import { useId, useOptimistic, useTransition } from "react";
import { SORT_KEYS, SORT_LABELS, type SearchState, type SortKey } from "@/lib/search/types";
import { buildSearchUrl, updateSearch } from "@/lib/search/url";

/** The four approved sorts as a labeled native select. Changing it navigates: the sort lives in the URL (`sort=`). */
export function SortSelect({ state }: { state: SearchState }) {
  const router = useRouter();
  const id = useId();
  const [sort, showSort] = useOptimistic(state.sort, (_current: SortKey, next: SortKey) => next);
  const [, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="whitespace-nowrap">
        Sort by:
      </label>
      <select
        id={id}
        value={sort}
        onChange={(event) => {
          const next = event.target.value as SortKey;
          if (!(SORT_KEYS as readonly string[]).includes(next)) return;
          startTransition(() => {
            showSort(next);
            router.push(buildSearchUrl(updateSearch(state, { sort: next })));
          });
        }}
        className="h-[var(--tap)] max-w-[11rem] rounded-lg border border-line bg-[#f0f2f2] px-2 text-sm text-ink shadow-sm hover:bg-[#e3e6e6] sm:max-w-none"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
