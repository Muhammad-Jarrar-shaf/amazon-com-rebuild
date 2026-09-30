import { describe, expect, it } from "vitest";
import { MAX_SUGGESTIONS, splitSuggestion, suggest, type SuggestionTerm } from "@/lib/search/suggest";
import { getSuggestionTerms } from "@/lib/search/server";

const terms: SuggestionTerm[] = [
  { text: "headphones", kind: "popular" },
  { text: "noise cancelling headphones", kind: "popular" },
  { text: "Over-Ear Headphones", kind: "category" },
  { text: "Kids' Headphones", kind: "category" },
  { text: "Halo Audio", kind: "brand" },
  { text: "head strap", kind: "tag" },
  { text: "laptop", kind: "popular" },
  { text: "Headphones", kind: "tag" },
];

describe("suggest", () => {
  it("needs at least two characters", () => {
    expect(suggest(terms, "")).toEqual([]);
    expect(suggest(terms, "h")).toEqual([]);
    expect(suggest(terms, " h ")).toEqual([]);
    expect(suggest(terms, "he").length).toBeGreaterThan(0);
  });

  it("puts prefix matches first, popular queries before categories, tags last, shorter first", () => {
    // Prefix group: "headphones" (popular) then "head strap" (tag). Word-match group: popular, then categories by length.
    expect(suggest(terms, "head").map((term) => term.text)).toEqual([
      "headphones",
      "head strap",
      "noise cancelling headphones",
      "Kids' Headphones",
      "Over-Ear Headphones",
    ]);
  });

  it("matches on later words when every typed word starts some word of the term", () => {
    expect(suggest(terms, "cancel head").map((term) => term.text)).toEqual(["noise cancelling headphones"]);
    expect(suggest(terms, "over ear").map((term) => term.text)).toEqual(["Over-Ear Headphones"]);
  });

  it("ranks prefix matches ahead of word matches", () => {
    const texts = suggest(terms, "headphones").map((term) => term.text);
    expect(texts[0]).toBe("headphones");
    expect(texts.slice(-1)[0]).not.toBe("headphones");
  });

  it("returns nothing for unknown input", () => {
    expect(suggest(terms, "zzzz")).toEqual([]);
    expect(suggest(terms, "!!")).toEqual([]);
  });

  it("drops duplicates after normalization", () => {
    const texts = suggest(terms, "headphones").map((term) => term.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("never returns more than 8", () => {
    const many = Array.from({ length: 50 }, (_, index): SuggestionTerm => ({ text: `laptop ${index}`, kind: "tag" }));
    expect(suggest(many, "lap")).toHaveLength(MAX_SUGGESTIONS);
    expect(suggest(many, "lap", 3)).toHaveLength(3);
  });

  it("is deterministic and independent of the input order of terms", () => {
    const shuffled = [...terms].reverse();
    expect(suggest(terms, "head")).toEqual(suggest(terms, "head"));
    expect(suggest(shuffled, "head")).toEqual(suggest(terms, "head"));
  });

  it("works on the real catalog-derived terms", () => {
    const real = getSuggestionTerms();
    const texts = suggest(real, "head").map((term) => term.text.toLowerCase());
    expect(texts).toContain("headphones");
    expect(suggest(real, "wire").map((term) => term.text.toLowerCase())).toContain("wireless earbuds");
    expect(suggest(real, "hal").map((term) => term.text)).toContain("Halo Audio");
    expect(suggest(real, "zzzz")).toEqual([]);
  });
});

describe("splitSuggestion", () => {
  it("bolds the completion after what was typed, preserving the term's own casing", () => {
    expect(splitSuggestion("Headphones", "head")).toEqual({ typed: "Head", completion: "phones" });
    expect(splitSuggestion("noise cancelling headphones", "  noise ")).toEqual({ typed: "noise", completion: " cancelling headphones" });
  });

  it("treats a non-prefix match as all completion", () => {
    expect(splitSuggestion("noise cancelling headphones", "head")).toEqual({ typed: "", completion: "noise cancelling headphones" });
    expect(splitSuggestion("laptop", "")).toEqual({ typed: "", completion: "laptop" });
  });
});
