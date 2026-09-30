"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CaretDownIcon, SearchIcon } from "@/components/icons";
import { ALL_DEPARTMENTS_LABEL, DEPARTMENTS } from "@/lib/departments";
import { shouldSyncFieldFromUrl } from "@/lib/search/field-sync";
import { splitSuggestion, suggest, type SuggestionTerm } from "@/lib/search/suggest";
import { buildSearchUrl, cleanQuery, isDepartmentSlug } from "@/lib/search/url";
import { SITE } from "@/lib/site";

/** Reports the URL so the field can follow it (Back/Forward, searches, filter changes). Renders nothing. */
function SyncWithUrl({ onSync }: { onSync: (pathname: string, query: string, dept: string) => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.get("k") ?? params.get("q") ?? "";
  const dept = params.get("dept") ?? "";
  useEffect(() => {
    onSync(pathname, query, dept);
  }, [pathname, query, dept, onSync]);
  return null;
}

interface SearchBarProps {
  className?: string;
  /** Suggestion terms derived from the catalog on the server (popular queries, categories, brands, tags). */
  terms: readonly SuggestionTerm[];
}

/**
 * Header search (FR-SRCH-1, FR-SRCH-2). A real GET form to /s that also works without JavaScript; with JavaScript
 * it navigates client-side and shows local suggestions as a combobox: Up/Down move through them, Enter searches the
 * highlighted one (or what was typed), Escape closes, and leaving the field closes. No request is made for suggestions.
 * The department picker is a native <select> laid over a short visible label, hidden on mobile.
 */
export function SearchBar({ className = "", terms }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const deptId = useId();
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const suggestions = useMemo(() => suggest(terms, query), [terms, query]);
  const expanded = open && suggestions.length > 0;
  const shortLabel = DEPARTMENTS.find((department) => department.slug === dept)?.label ?? "All";

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  // Typed (or a department picked) since the page loaded, and the URL last synced into the field.
  const edited = useRef(false);
  const syncedUrl = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectAfterSync = useRef(false);

  // Text typed into the server-rendered field before hydration stays in the DOM, but React fires no onChange for it.
  // Adopt it before the first URL sync (a passive effect) runs. The field has autocomplete="off", so the browser never
  // restores stale text here; anything present is the shopper's typing.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && input.value !== "") {
      edited.current = true;
      setQuery(input.value);
      setOpen(document.activeElement === input);
    }
  }, []);

  useLayoutEffect(() => {
    if (!selectAfterSync.current) return;
    selectAfterSync.current = false;
    inputRef.current?.select();
  }, [query]);

  // Must be stable: SyncWithUrl re-runs its effect when this changes. The first sync after load (the field is empty
  // until then) is skipped if the shopper has already typed, so hydration never overwrites their text.
  const syncWithUrl = useCallback((pathname: string, urlQuery: string, urlDept: string) => {
    const url = JSON.stringify([pathname, urlQuery, urlDept]);
    const firstSync = syncedUrl.current === null;
    const apply = shouldSyncFieldFromUrl(syncedUrl.current, url, edited.current);
    syncedUrl.current = url;
    if (!apply || pathname !== "/s") return;
    // The shopper already clicked into the (then empty) field: select the query so typing replaces it, not appends.
    selectAfterSync.current = firstSync && urlQuery !== "" && document.activeElement === inputRef.current;
    setQuery(urlQuery);
    setDept(isDepartmentSlug(urlDept) ? urlDept : "");
    setOpen(false);
    setActive(-1);
  }, []);

  const search = (text: string) => {
    const cleaned = cleanQuery(text);
    setQuery(cleaned);
    close();
    router.push(buildSearchUrl({ query: cleaned, dept: isDepartmentSlug(dept) ? dept : undefined }));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      if (!expanded) {
        setOpen(true);
        setActive(event.key === "ArrowDown" ? 0 : suggestions.length - 1);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      close();
    }
  };

  return (
    <form
      role="search"
      action="/s"
      method="get"
      className={`w-full py-2 md:py-0 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const chosen = expanded && active >= 0 ? suggestions[active] : undefined;
        search(chosen ? chosen.text : query);
      }}
    >
      <Suspense fallback={null}>
        <SyncWithUrl onSync={syncWithUrl} />
      </Suspense>
      <div
        className="relative flex h-[var(--tap)] w-full rounded-md bg-white focus-within:ring-[3px] focus-within:ring-search-focus md:h-[var(--search-h)]"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) close();
        }}
      >
        <div className="relative hidden shrink-0 items-center rounded-l-md bg-search-select text-xs text-[#555] hover:bg-[#d5d5d5] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-2px] has-[:focus-visible]:outline-search-focus md:flex">
          <span aria-hidden="true" className="pointer-events-none flex max-w-40 items-center gap-0.5 pr-1 pl-3">
            <span className="truncate">{shortLabel}</span>
            <CaretDownIcon className="size-4 shrink-0" />
          </span>
          <label htmlFor={deptId} className="sr-only">
            Search in
          </label>
          <select
            id={deptId}
            name="dept"
            value={dept}
            onChange={(event) => {
              edited.current = true;
              setDept(event.target.value);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="">{ALL_DEPARTMENTS_LABEL}</option>
            {DEPARTMENTS.map((department) => (
              <option key={department.slug} value={department.slug}>
                {department.label}
              </option>
            ))}
          </select>
        </div>
        <input
          ref={inputRef}
          type="search"
          name="k"
          role="combobox"
          aria-label={`Search ${SITE.name}`}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          placeholder={`Search ${SITE.name}`}
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(event) => {
            edited.current = true;
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 rounded-l-md bg-white px-3 text-[15px] text-ink placeholder:text-[#767676] focus:outline-none md:rounded-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex w-[45px] shrink-0 items-center justify-center rounded-r-md bg-search-btn text-ink hover:bg-search-btn-hover"
        >
          <SearchIcon className="size-[22px]" />
        </button>
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          hidden={!expanded}
          className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border border-line bg-white py-1 text-ink shadow-lg"
        >
          {suggestions.map((suggestion, index) => {
            const { typed, completion } = splitSuggestion(suggestion.text, query);
            return (
              <li
                key={`${suggestion.kind}-${suggestion.text}`}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                // Keep focus in the field while pressing an option, so the field's blur does not close the list first.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => search(suggestion.text)}
                className={`flex min-h-[var(--tap)] cursor-pointer items-center gap-3 px-3 text-[15px] md:min-h-10 ${index === active ? "bg-page-gray" : ""}`}
              >
                <SearchIcon className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 truncate">
                  {typed}
                  <strong>{completion}</strong>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div role="status" className="sr-only">
        {expanded ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available` : ""}
      </div>
    </form>
  );
}
