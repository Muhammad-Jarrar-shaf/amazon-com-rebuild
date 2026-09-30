"use client";

import { useId, useState } from "react";
import { CaretDownIcon, SearchIcon } from "@/components/icons";
import { ALL_DEPARTMENTS_LABEL, DEPARTMENTS } from "@/lib/departments";
import { SITE } from "@/lib/site";

/**
 * Header search: a real GET form to /s (department + keyword). The results page, suggestions and
 * search logic belong to S3 (FR-SRCH-*), so until then submitting has no destination.
 * The department picker is a native <select> laid over a short visible label ("All"), as observed on
 * amazon.com; it is hidden on mobile, where the search is a single full-width field.
 */
export function SearchBar({ className = "" }: { className?: string }) {
  const [dept, setDept] = useState("");
  const deptId = useId();
  const shortLabel = DEPARTMENTS.find((d) => d.slug === dept)?.label ?? "All";

  return (
    <form role="search" action="/s" method="get" className={`w-full py-2 md:py-0 ${className}`}>
      <div className="flex h-[var(--tap)] w-full rounded-md bg-white focus-within:ring-[3px] focus-within:ring-search-focus md:h-[var(--search-h)]">
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
            onChange={(event) => setDept(event.target.value)}
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
          type="search"
          name="k"
          aria-label={`Search ${SITE.name}`}
          placeholder={`Search ${SITE.name}`}
          autoComplete="off"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 rounded-l-md bg-white px-3 text-[15px] text-ink placeholder:text-[#767676] focus:outline-none md:rounded-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex w-[45px] shrink-0 items-center justify-center rounded-r-md bg-search-btn text-ink hover:bg-search-btn-hover"
        >
          <SearchIcon className="size-[22px]" />
        </button>
      </div>
    </form>
  );
}
