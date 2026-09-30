import { describe, expect, it } from "vitest";
import { DEFAULT_SEARCH_STATE, type SearchState } from "@/lib/search/types";
import {
  activeFilterCount,
  buildSearchUrl,
  clearFilters,
  cleanQuery,
  hasActiveFilters,
  hasCriteria,
  parseSearchParams,
  toggleBrand,
  updateSearch,
  withoutEmptyParams,
} from "@/lib/search/url";

const parse = (query: string) => parseSearchParams(new URLSearchParams(query));

describe("parseSearchParams", () => {
  it("returns the default state for no parameters", () => {
    expect(parse("")).toEqual(DEFAULT_SEARCH_STATE);
  });

  it("reads every parameter", () => {
    expect(parse("k=noise+cancelling&dept=electronics&brand=Halo+Audio&brand=Voxel&rating=4&min=25&max=99&sort=price-asc&page=2")).toEqual({
      query: "noise cancelling",
      dept: "electronics",
      brands: ["Halo Audio", "Voxel"],
      minRating: 4,
      minPrice: 25,
      maxPrice: 99,
      sort: "price-asc",
      page: 2,
    });
  });

  it("accepts q as an alias for k, and prefers k", () => {
    expect(parse("q=headphones").query).toBe("headphones");
    expect(parse("k=laptop&q=headphones").query).toBe("laptop");
  });

  it("accepts the shape Next.js passes to pages, including repeated values as arrays", () => {
    const state = parseSearchParams({ k: "headphones", brand: ["Halo Audio", "Voxel"], sort: ["rating", "price-asc"], page: undefined });
    expect(state.query).toBe("headphones");
    expect(state.brands).toEqual(["Halo Audio", "Voxel"]);
    expect(state.sort).toBe("rating");
    expect(state.page).toBe(1);
  });

  it("falls back to defaults for malformed values instead of throwing", () => {
    expect(parse("sort=bogus").sort).toBe("featured");
    expect(parse("rating=9").minRating).toBeUndefined();
    expect(parse("rating=abc").minRating).toBeUndefined();
    expect(parse("dept=nope").dept).toBeUndefined();
    for (const bad of ["abc", "-3", "0", "1.5", "", "99999999", "1e3", " "]) expect(parse(`page=${bad}`).page, bad).toBe(1);
    for (const bad of ["abc", "-5", "2.5", "", "1e3"]) {
      expect(parse(`min=${bad}`).minPrice, `min=${bad}`).toBeUndefined();
      expect(parse(`max=${bad}`).maxPrice, `max=${bad}`).toBeUndefined();
    }
  });

  it("swaps an inverted price range", () => {
    expect(parse("min=100&max=25")).toMatchObject({ minPrice: 25, maxPrice: 100 });
  });

  it("deduplicates and caps brands and drops empty ones", () => {
    expect(parse("brand=Voxel&brand=Voxel&brand=&brand=%20").brands).toEqual(["Voxel"]);
    const many = Array.from({ length: 30 }, (_, index) => `brand=B${index}`).join("&");
    expect(parse(many).brands).toHaveLength(12);
  });

  it("cleans the query: control characters, whitespace and length", () => {
    expect(parse("k=%00%01a%0Ab%09%09c").query).toBe("a b c");
    expect(cleanQuery("x".repeat(500))).toHaveLength(100);
    expect(parse(`k=${"y".repeat(500)}`).query).toHaveLength(100);
    expect(parse("k=%20%20").query).toBe("");
  });

  it("does not misinterpret injection-looking input", () => {
    const state = parse("k=%3Cscript%3Ealert(1)%3C%2Fscript%3E&brand=__proto__&sort=constructor");
    expect(state.query).toBe("<script>alert(1)</script>");
    expect(state.brands).toEqual(["__proto__"]);
    expect(state.sort).toBe("featured");
  });
});

describe("buildSearchUrl", () => {
  it("is /s when there is nothing to say and omits defaults", () => {
    expect(buildSearchUrl({})).toBe("/s");
    expect(buildSearchUrl(DEFAULT_SEARCH_STATE)).toBe("/s");
    expect(buildSearchUrl({ query: "laptop", sort: "featured", page: 1 })).toBe("/s?k=laptop");
  });

  it("uses a stable parameter order", () => {
    expect(
      buildSearchUrl({ page: 3, sort: "rating", maxPrice: 99, minPrice: 25, minRating: 4, brands: ["Voxel", "Halo Audio"], dept: "electronics", query: "wireless" }),
    ).toBe("/s?k=wireless&dept=electronics&brand=Voxel&brand=Halo+Audio&rating=4&min=25&max=99&sort=rating&page=3");
  });

  it("round-trips through parse for representative states", () => {
    const states: SearchState[] = [
      DEFAULT_SEARCH_STATE,
      { ...DEFAULT_SEARCH_STATE, query: "noise cancelling headphones" },
      { ...DEFAULT_SEARCH_STATE, dept: "books", sort: "price-desc", page: 2 },
      { query: "hearth & co.", dept: "home-kitchen", brands: ["Hearth & Co.", "Pinecrest"], minRating: 4, minPrice: 0, maxPrice: 49, sort: "rating", page: 4 },
      { ...DEFAULT_SEARCH_STATE, minPrice: 200 },
    ];
    for (const state of states) {
      const url = buildSearchUrl(state);
      expect(parseSearchParams(new URL(`http://x${url}`).searchParams), url).toEqual(state);
    }
  });

  it("encodes awkward characters safely", () => {
    const url = buildSearchUrl({ query: 'a&b=c#d "e"' });
    expect(url.startsWith("/s?k=")).toBe(true);
    expect(url).not.toContain("#");
    expect(parse(url.slice(3)).query).toBe('a&b=c#d "e"');
  });
});

describe("state helpers", () => {
  const base: SearchState = { query: "headphones", dept: "electronics", brands: ["Halo Audio"], minRating: 4, minPrice: 25, maxPrice: 99, sort: "rating", page: 3 };

  it("returns to page 1 on any change except the page itself", () => {
    expect(updateSearch(base, { sort: "price-asc" }).page).toBe(1);
    expect(updateSearch(base, { page: 5 }).page).toBe(5);
    expect(updateSearch(base, { query: "laptop" })).toMatchObject({ query: "laptop", page: 1, sort: "rating" });
  });

  it("toggles brands on and off", () => {
    const added = toggleBrand(base, "Voxel");
    expect(added.brands).toEqual(["Halo Audio", "Voxel"]);
    expect(added.page).toBe(1);
    expect(toggleBrand(added, "Halo Audio").brands).toEqual(["Voxel"]);
  });

  it("clears filters but keeps the query, department and sort", () => {
    expect(clearFilters(base)).toEqual({ query: "headphones", dept: "electronics", brands: [], minRating: undefined, minPrice: undefined, maxPrice: undefined, sort: "rating", page: 1 });
  });

  it("counts active filter groups and detects criteria", () => {
    expect(hasActiveFilters(base)).toBe(true);
    expect(activeFilterCount(base)).toBe(3);
    expect(activeFilterCount({ ...base, minPrice: undefined, maxPrice: undefined })).toBe(2);
    expect(activeFilterCount(DEFAULT_SEARCH_STATE)).toBe(0);
    expect(hasCriteria(DEFAULT_SEARCH_STATE)).toBe(false);
    expect(hasCriteria({ ...DEFAULT_SEARCH_STATE, query: "x" })).toBe(true);
    expect(hasCriteria({ ...DEFAULT_SEARCH_STATE, dept: "books" })).toBe(true);
    expect(hasCriteria({ ...DEFAULT_SEARCH_STATE, minRating: 4 })).toBe(true);
  });
});

describe("withoutEmptyParams", () => {
  it("drops the empty department a plain form submission sends", () => {
    expect(withoutEmptyParams({ dept: "", k: "laptop" })).toBe("/s?k=laptop");
  });

  it("keeps non-empty parameters, repeated values and their order", () => {
    expect(withoutEmptyParams({ k: "", dept: "electronics", brand: ["Halo Audio", "", "Voxel"], sort: "price-asc" })).toBe(
      "/s?dept=electronics&brand=Halo+Audio&brand=Voxel&sort=price-asc",
    );
  });

  it("returns null when nothing is empty, so canonical URLs are never redirected", () => {
    expect(withoutEmptyParams({ k: "laptop", dept: "electronics" })).toBeNull();
    expect(withoutEmptyParams({})).toBeNull();
    expect(withoutEmptyParams({ max: " " })).toBeNull(); // not empty: the parser ignores it
  });

  it("an all-empty query string becomes plain /s", () => {
    expect(withoutEmptyParams({ dept: "", k: "" })).toBe("/s");
  });
});

