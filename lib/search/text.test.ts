import { describe, expect, it } from "vitest";
import { normalizeSearchText, stem, tokenize } from "@/lib/search/text";

describe("normalizeSearchText", () => {
  it("lower-cases, strips accents and punctuation and collapses whitespace", () => {
    expect(normalizeSearchText("  Café  Ünïcode—Test!  ")).toBe("cafe unicode test");
    expect(normalizeSearchText("USB-C, 140W")).toBe("usb c 140w");
    expect(normalizeSearchText("")).toBe("");
  });
});

describe("tokenize", () => {
  it("splits into normalized words", () => {
    expect(tokenize("Wireless  Earbuds!")).toEqual(["wireless", "earbuds"]);
    expect(tokenize("Hearth & Co.")).toEqual(["hearth", "co"]);
  });

  it("returns no tokens for empty or punctuation-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
    expect(tokenize("!!! ???")).toEqual([]);
  });
});

describe("stem", () => {
  it("strips a plural s from longer words only", () => {
    expect(stem("headphones")).toBe("headphone");
    expect(stem("earbuds")).toBe("earbud");
    expect(stem("kids")).toBe("kid");
    expect(stem("glass")).toBe("glass");
    expect(stem("bus")).toBe("bus");
    expect(stem("usb")).toBe("usb");
  });
});
