import { describe, expect, it } from "vitest";
import { priceRangeLabel, summarizeResults } from "@/lib/search/summary";

describe("priceRangeLabel", () => {
  it("uses the ready-made label when the bounds match one", () => {
    expect(priceRangeLabel(undefined, 24)).toBe("Under $25");
    expect(priceRangeLabel(25, 49)).toBe("$25 to $49");
    expect(priceRangeLabel(200, undefined)).toBe("$200 & Above");
  });

  it("composes a label for custom bounds", () => {
    expect(priceRangeLabel(30, 80)).toBe("$30 to $80.99");
    expect(priceRangeLabel(150, undefined)).toBe("$150 & Above");
    expect(priceRangeLabel(undefined, 60)).toBe("Up to $60.99");
    expect(priceRangeLabel(undefined, undefined)).toBe("Any price");
  });
});

describe("summarizeResults", () => {
  it("describes a page of results with its context", () => {
    expect(summarizeResults({ first: 1, last: 16, total: 30 }, { query: "headphones" })).toBe('1-16 of 30 results for "headphones"');
    expect(summarizeResults({ first: 17, last: 30, total: 30 }, { query: "", dept: "electronics" })).toBe("17-30 of 30 results in Electronics");
    expect(summarizeResults({ first: 1, last: 3, total: 3 }, { query: "audio", dept: "electronics" })).toBe('1-3 of 3 results for "audio" in Electronics');
    expect(summarizeResults({ first: 1, last: 16, total: 30 }, { query: "" })).toBe("1-16 of 30 results");
  });

  it("handles one result and no results", () => {
    expect(summarizeResults({ first: 1, last: 1, total: 1 }, { query: "skillet" })).toBe('1 result for "skillet"');
    expect(summarizeResults({ first: 0, last: 0, total: 0 }, { query: "zzzz" })).toBe('No results for "zzzz"');
    expect(summarizeResults({ first: 0, last: 0, total: 0 }, { query: "", dept: "books" })).toBe("No results in Books");
  });
});
