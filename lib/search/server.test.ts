import { describe, expect, it } from "vitest";
import { getAllProducts } from "@/lib/catalog";
import { DEPARTMENTS } from "@/lib/departments";
import { DEFAULT_SEARCH_STATE } from "@/lib/search/types";
import { POPULAR_QUERIES, brandsInCatalog, getSuggestionTerms, searchCatalog } from "@/lib/search/server";

describe("catalog search", () => {
  it("every popular query returns results, so no suggestion leads to an empty page", () => {
    for (const query of POPULAR_QUERIES) {
      expect(searchCatalog({ ...DEFAULT_SEARCH_STATE, query }).page.total, query).toBeGreaterThan(0);
    }
  });

  it("every department can be browsed and together they cover the catalog", () => {
    let total = 0;
    for (const department of DEPARTMENTS) {
      const result = searchCatalog({ ...DEFAULT_SEARCH_STATE, dept: department.slug });
      expect(result.page.total, department.slug).toBeGreaterThan(0);
      total += result.page.total;
    }
    expect(total).toBe(getAllProducts().length);
  });

  it("every brand in the facet list can be selected and has results", () => {
    const brands = brandsInCatalog();
    expect(brands.length).toBeGreaterThanOrEqual(10);
    for (const brand of brands) {
      expect(searchCatalog({ ...DEFAULT_SEARCH_STATE, brands: [brand] }).page.total, brand).toBeGreaterThan(0);
    }
  });
});

describe("suggestion terms", () => {
  const terms = getSuggestionTerms();

  it("include the popular queries, every brand and every category", () => {
    const texts = new Set(terms.map((term) => term.text));
    for (const query of POPULAR_QUERIES) expect(texts.has(query), query).toBe(true);
    for (const brand of brandsInCatalog()) expect(texts.has(brand), brand).toBe(true);
    for (const product of getAllProducts()) expect(texts.has(product.category), product.category).toBe(true);
  });

  it("are stable between calls and small enough to send to the browser", () => {
    expect(getSuggestionTerms()).toBe(terms);
    expect(JSON.stringify(terms).length).toBeLessThan(8000);
  });
});
