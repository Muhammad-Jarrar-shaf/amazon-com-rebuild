import { describe, expect, it } from "vitest";
import { getAllProducts } from "@/lib/catalog";
import type { Product } from "@/lib/catalog/types";
import {
  applyFilters,
  buildIndex,
  compareDefault,
  computeFacets,
  displayPriceCents,
  paginate,
  pageWindow,
  runSearch,
  scoreProduct,
  searchProducts,
  sortProducts,
} from "@/lib/search/engine";
import { tokenize } from "@/lib/search/text";
import { DEFAULT_SEARCH_STATE, PAGE_SIZE, PRICE_RANGES, type SearchState } from "@/lib/search/types";

const products = getAllProducts();
const ids = (list: readonly Product[]) => list.map((product) => product.id);
const HERO = "B0HALO0AUR";
const KIDS = "B0HALO0KID";
const EARBUDS = "B0HALO0PUL";
const state = (patch: Partial<SearchState>): SearchState => ({ ...DEFAULT_SEARCH_STATE, ...patch });

/** A copy of a real product whose default variant costs `cents`. */
function priced(cents: number): Product {
  const base = products[0]!;
  return { ...base, id: `P${cents}`, variants: [{ ...base.variants[0]!, priceCents: cents, listPriceCents: undefined, stock: 10 }] };
}

describe("relevance and ranking", () => {
  it("finds headphones, best match first, and nothing unrelated", () => {
    const found = ids(searchProducts(products, "headphones"));
    expect(found[0]).toBe(HERO);
    expect(found).toEqual([HERO, KIDS, EARBUDS]);
    expect(found).not.toContain("B0ORBT0AER");
  });

  it("is case-insensitive, ignores extra whitespace and punctuation, and treats plurals alike", () => {
    const expected = ids(searchProducts(products, "headphones"));
    for (const variant of ["HEADPHONES", "  Headphones  ", "headphones!", "headphone", "Head-phones?".replace("-", "")]) {
      expect(ids(searchProducts(products, variant)), variant).toEqual(expected);
    }
  });

  it("requires every word to match (AND) and scores nothing when one does not", () => {
    expect(ids(searchProducts(products, "noise cancelling headphones"))).toEqual([HERO]);
    expect(searchProducts(products, "headphones zzzz")).toEqual([]);
  });

  it("puts a phrase in the title ahead of scattered matches", () => {
    expect(searchProducts(products, "wireless earbuds")[0]?.id).toBe(EARBUDS);
    expect(ids(searchProducts(products, "halo audio"))).toEqual([HERO, EARBUDS, KIDS]);
  });

  it("matches word prefixes, but scores them below exact words", () => {
    const index = buildIndex(products);
    const hero = index.find((entry) => entry.product.id === HERO)!;
    const exact = scoreProduct(hero, tokenize("headphones"));
    const prefix = scoreProduct(hero, tokenize("headphon"));
    expect(prefix).toBeGreaterThan(0);
    expect(exact).toBeGreaterThan(prefix);
    expect(ids(searchProducts(products, "head"))).toContain(HERO);
  });

  it("weights a title match above a category match above a tag match", () => {
    const index = buildIndex(products);
    const hero = index.find((entry) => entry.product.id === HERO)!;
    const earbuds = index.find((entry) => entry.product.id === EARBUDS)!;
    // "headphones" is in the hero's title but only in the earbuds' category.
    expect(scoreProduct(hero, ["headphones"])).toBeGreaterThan(scoreProduct(earbuds, ["headphones"]));
    expect(scoreProduct(earbuds, ["headphones"])).toBeGreaterThan(0);
  });

  it("matches brands, categories, tags and department names", () => {
    expect(ids(searchProducts(products, "voxel"))).toEqual(expect.arrayContaining(["B0VOXL0SPK", "B0VOXL0BAR", "B0VOXL0MIC"]));
    expect(ids(searchProducts(products, "skillet"))).toEqual(["B0HRTH0CST"]);
    expect(ids(searchProducts(products, "soundbar"))).toEqual(["B0VOXL0BAR"]);
    expect(searchProducts(products, "books").length).toBeGreaterThanOrEqual(4);
  });

  it("scopes to a department", () => {
    expect(searchProducts(products, "wireless", "books")).toEqual([]);
    for (const product of searchProducts(products, "wireless", "electronics")) expect(product.department).toBe("electronics");
  });

  it("returns the whole pool in the default order for an empty query", () => {
    for (const query of ["", "   ", "!!!"]) expect(searchProducts(products, query)).toHaveLength(products.length);
    expect(searchProducts(products, "")[0]?.id).toBe(HERO);
    const books = searchProducts(products, "", "books");
    expect(books.length).toBeGreaterThan(0);
    for (const product of books) expect(product.department).toBe("books");
  });

  it("returns nothing for an unknown query", () => {
    expect(searchProducts(products, "zzzz")).toEqual([]);
    expect(searchProducts(products, "qwertyuiop asdfghjkl")).toEqual([]);
  });

  it("is deterministic: same input, same order, and independent of the input list order", () => {
    for (const query of ["headphones", "wireless", "kitchen", "audio", ""]) {
      const first = ids(searchProducts(products, query));
      expect(ids(searchProducts(products, query))).toEqual(first);
      expect(ids(searchProducts([...products].reverse(), query))).toEqual(first);
    }
  });

  it("orders ties by featured rank, then rating, review count and id", () => {
    const featured = products.filter((product) => product.featuredRank !== undefined).sort(compareDefault);
    expect(featured.map((product) => product.featuredRank)).toEqual([...featured.map((product) => product.featuredRank)].sort((a, b) => (a as number) - (b as number)));
    const unranked = products.filter((product) => product.featuredRank === undefined);
    expect(ids([...unranked].sort(compareDefault))).toEqual(ids([...unranked].reverse().sort(compareDefault)));
  });

  it("can find every product by the first words of its own title", () => {
    for (const product of products) {
      const query = product.title.split(" ").slice(0, 3).join(" ");
      expect(ids(searchProducts(products, query)), query).toContain(product.id);
    }
  });
});

describe("filters", () => {
  it("brand: OR within the facet", () => {
    expect(new Set(applyFilters(products, { brands: ["Halo Audio"] }).map((product) => product.brand))).toEqual(new Set(["Halo Audio"]));
    const two = applyFilters(products, { brands: ["Halo Audio", "Voxel"] });
    expect(new Set(two.map((product) => product.brand))).toEqual(new Set(["Halo Audio", "Voxel"]));
    expect(applyFilters(products, { brands: [] })).toHaveLength(products.length);
    expect(applyFilters(products, { brands: ["No Such Brand"] })).toEqual([]);
  });

  it("rating: keeps 4 stars and up and really removes something", () => {
    const four = applyFilters(products, { brands: [], minRating: 4 });
    expect(four.length).toBeLessThan(products.length);
    expect(four.length).toBeGreaterThan(0);
    for (const product of four) expect(product.rating).toBeGreaterThanOrEqual(4);
    expect(products.filter((product) => product.rating < 4).length).toBe(products.length - four.length);
  });

  it("price: min is inclusive and max is inclusive of the whole dollar", () => {
    const list = [priced(2499), priced(2500), priced(4999), priced(5000), priced(9999), priced(10000)];
    const keep = (min?: number, max?: number) => applyFilters(list, { brands: [], minPrice: min, maxPrice: max }).map(displayPriceCents);
    expect(keep(undefined, 24)).toEqual([2499]);
    expect(keep(25, 49)).toEqual([2500, 4999]);
    expect(keep(50, 99)).toEqual([5000, 9999]);
    expect(keep(100)).toEqual([10000]);
    expect(keep(undefined, undefined)).toHaveLength(6);
    expect(keep(0, 0)).toEqual([]);
  });

  it("combines filters with AND", () => {
    const all = applyFilters(products, { brands: ["Halo Audio"], minRating: 4, minPrice: 40, maxPrice: 60 });
    for (const product of all) {
      expect(product.brand).toBe("Halo Audio");
      expect(product.rating).toBeGreaterThanOrEqual(4);
      expect(displayPriceCents(product)).toBeGreaterThanOrEqual(4000);
      expect(displayPriceCents(product)).toBeLessThan(6100);
    }
    expect(applyFilters(products, { brands: ["Halo Audio"], minPrice: 500 })).toEqual([]);
  });

  it("every ready-made price range is a real filter that keeps some products and removes others", () => {
    for (const range of PRICE_RANGES) {
      const kept = applyFilters(products, { brands: [], minPrice: range.min, maxPrice: range.max });
      expect(kept.length, range.label).toBeGreaterThan(0);
      expect(kept.length, range.label).toBeLessThan(products.length);
    }
  });
});

describe("facet counts", () => {
  it("counts a facet without its own selection, so choosing one option never hides the others", () => {
    const base = searchProducts(products, "");
    const withoutBrand = computeFacets(base, { brands: [] });
    const withBrand = computeFacets(base, { brands: ["Halo Audio"] });
    expect(withBrand.brands).toEqual(withoutBrand.brands);
    expect(withoutBrand.brands.reduce((sum, brand) => sum + brand.count, 0)).toBe(products.length);
  });

  it("counts against the other active filters and keeps selected brands even at zero", () => {
    const base = searchProducts(products, "");
    const facets = computeFacets(base, { brands: ["Voxel", "Ghost"], minRating: 4 });
    expect(facets.brands.find((brand) => brand.name === "Ghost")).toEqual({ name: "Ghost", count: 0 });
    const voxelFourStar = base.filter((product) => product.brand === "Voxel" && product.rating >= 4).length;
    expect(facets.brands.find((brand) => brand.name === "Voxel")?.count).toBe(voxelFourStar);
    expect(facets.fourStarCount).toBe(applyFilters(base, { brands: ["Voxel", "Ghost"] }).filter((product) => product.rating >= 4).length);
  });

  it("sorts brands alphabetically and counts price ranges", () => {
    const facets = computeFacets(searchProducts(products, ""), { brands: [] });
    const names = facets.brands.map((brand) => brand.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(facets.priceRanges).toHaveLength(PRICE_RANGES.length);
    expect(facets.priceRanges.reduce((sum, range) => sum + range.count, 0)).toBe(products.length);
  });
});

describe("sorting", () => {
  const list = searchProducts(products, "");

  it("featured keeps the incoming order", () => {
    expect(ids(sortProducts(list, "featured"))).toEqual(ids(list));
    const relevance = searchProducts(products, "audio");
    expect(ids(sortProducts(relevance, "featured"))).toEqual(ids(relevance));
  });

  it("price low to high and high to low are monotonic and are inverses up to ties", () => {
    const asc = sortProducts(list, "price-asc").map(displayPriceCents);
    const desc = sortProducts(list, "price-desc").map(displayPriceCents);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(asc).toEqual([...desc].reverse());
  });

  it("rating sorts best first, then by review count", () => {
    const sorted = sortProducts(list, "rating");
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1]!;
      const current = sorted[index]!;
      expect(previous.rating >= current.rating).toBe(true);
      if (previous.rating === current.rating) expect(previous.ratingCount >= current.ratingCount).toBe(true);
    }
  });

  it("breaks ties by the incoming order and never mutates its input", () => {
    const equal = [priced(1000), { ...priced(1000), id: "second" }, { ...priced(1000), id: "third" }];
    expect(ids(sortProducts(equal, "price-asc"))).toEqual(ids(equal));
    expect(ids(sortProducts(equal, "price-desc"))).toEqual(ids(equal));
    const before = ids(list);
    sortProducts(list, "price-desc");
    expect(ids(list)).toEqual(before);
  });

  it("is deterministic", () => {
    for (const sort of ["featured", "price-asc", "price-desc", "rating"] as const) {
      expect(ids(sortProducts(list, sort))).toEqual(ids(sortProducts(list, sort)));
    }
  });
});

describe("pagination", () => {
  const items = Array.from({ length: 30 }, (_, index) => index + 1);

  it("splits into pages of 16", () => {
    expect(PAGE_SIZE).toBe(16);
    const first = paginate(items, 1);
    expect(first).toMatchObject({ page: 1, pageCount: 2, total: 30, first: 1, last: 16 });
    expect(first.items).toHaveLength(16);
    const second = paginate(items, 2);
    expect(second).toMatchObject({ page: 2, first: 17, last: 30 });
    expect(second.items).toEqual(items.slice(16));
  });

  it("handles a single exact page and a middle page", () => {
    expect(paginate(items.slice(0, 16), 1)).toMatchObject({ pageCount: 1, first: 1, last: 16 });
    expect(paginate(Array.from({ length: 50 }, (_, index) => index), 2)).toMatchObject({ page: 2, pageCount: 4, first: 17, last: 32 });
  });

  it("clamps out-of-range and invalid pages instead of breaking", () => {
    expect(paginate(items, 99).page).toBe(2);
    for (const bad of [0, -5, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) expect(paginate(items, bad).page, String(bad)).toBe(1);
    expect(paginate(items, 99).items).toEqual(items.slice(16));
  });

  it("is a valid empty page for no results", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, first: 0, last: 0 });
    expect(paginate([], 7).page).toBe(1);
  });

  it("builds a page window with gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 2)).toEqual([1, 2]);
    expect(pageWindow(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, "gap", 10]);
    expect(pageWindow(10, 10)).toEqual([1, "gap", 9, 10]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("runSearch", () => {
  it("runs search, filters, sort and pagination together", () => {
    const result = runSearch(products, state({ dept: "electronics", brands: ["Halo Audio"], sort: "price-asc" }));
    expect(result.page.total).toBe(3);
    const prices = result.page.items.map(displayPriceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    for (const product of result.page.items) expect(product.brand).toBe("Halo Audio");
    expect(result.baseTotal).toBe(8);
  });

  it("paginates the whole catalog and resolves an out-of-range page", () => {
    const first = runSearch(products, state({}));
    expect(first.page).toMatchObject({ total: 30, pageCount: 2, page: 1 });
    const beyond = runSearch(products, state({ page: 50 }));
    expect(beyond.page.page).toBe(2);
    expect(beyond.page.items).toHaveLength(14);
    expect(ids(beyond.page.items)).toEqual(ids(runSearch(products, state({ page: 2 })).page.items));
  });

  it("reports zero results honestly, and distinguishes filters from the query", () => {
    const unknown = runSearch(products, state({ query: "zzzz" }));
    expect(unknown.page).toMatchObject({ total: 0, pageCount: 1, first: 0, items: [] });
    expect(unknown.baseTotal).toBe(0);
    const filteredOut = runSearch(products, state({ query: "headphones", brands: ["Halo Audio"], minPrice: 500 }));
    expect(filteredOut.page.total).toBe(0);
    expect(filteredOut.baseTotal).toBe(3);
  });

  it("does not mutate the catalog", () => {
    const before = ids(products);
    runSearch(products, state({ sort: "price-desc" }));
    expect(ids(products)).toEqual(before);
  });
});
