import { describe, expect, it } from "vitest";
import { assertCents, discountPercent, formatMoney, hasDiscount, lineTotalCents, savingsCents, splitMoney } from "@/lib/pricing";

describe("formatMoney", () => {
  it("formats integer cents exactly", () => {
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(5)).toBe("$0.05");
    expect(formatMoney(99)).toBe("$0.99");
    expect(formatMoney(7999)).toBe("$79.99");
    expect(formatMoney(123456)).toBe("$1,234.56");
    expect(formatMoney(100_000_000)).toBe("$1,000,000.00");
  });

  it("splits into whole and fraction parts for the superscript display", () => {
    expect(splitMoney(7999)).toEqual({ symbol: "$", whole: "79", fraction: "99" });
    expect(splitMoney(120005)).toEqual({ symbol: "$", whole: "1,200", fraction: "05" });
  });

  it("rejects anything that is not a non-negative integer number of cents", () => {
    for (const bad of [12.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => formatMoney(bad)).toThrow(RangeError);
      expect(() => assertCents(bad)).toThrow(RangeError);
    }
  });
});

describe("compare-at pricing", () => {
  it("only counts a discount when the list price is strictly higher", () => {
    expect(hasDiscount(7999, 12999)).toBe(true);
    expect(hasDiscount(7999, 7999)).toBe(false);
    expect(hasDiscount(7999, 5000)).toBe(false);
    expect(hasDiscount(7999, undefined)).toBe(false);
  });

  it("derives savings from price and list price", () => {
    expect(savingsCents(7999, 12999)).toBe(5000);
    expect(savingsCents(7999, 7999)).toBe(0);
    expect(savingsCents(7999, undefined)).toBe(0);
  });

  it("derives the discount percent, rounded half up in integer math", () => {
    expect(discountPercent(7999, 12999)).toBe(38);
    expect(discountPercent(5000, 10000)).toBe(50);
    expect(discountPercent(9950, 10000)).toBe(1); // exactly 0.5% rounds up
    expect(discountPercent(9951, 10000)).toBe(0); // 0.49% rounds down
    expect(discountPercent(1, 1_000_000)).toBe(100);
  });

  it("is zero when there is no discount", () => {
    expect(discountPercent(7999, 7999)).toBe(0);
    expect(discountPercent(7999, 5000)).toBe(0);
    expect(discountPercent(7999, undefined)).toBe(0);
  });
});

describe("lineTotalCents", () => {
  it("multiplies in integer cents", () => {
    expect(lineTotalCents(1999, 3)).toBe(5997);
    expect(lineTotalCents(1, 10)).toBe(10);
    expect(lineTotalCents(7999, 1)).toBe(7999);
  });

  it("rejects invalid quantities and prices", () => {
    expect(() => lineTotalCents(1999, 0)).toThrow(RangeError);
    expect(() => lineTotalCents(1999, 1.5)).toThrow(RangeError);
    expect(() => lineTotalCents(19.99, 2)).toThrow(RangeError);
  });
});
