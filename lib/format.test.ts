import { describe, expect, it } from "vitest";
import { mixHex } from "@/lib/color";
import { boughtBucket, formatBoughtPastMonth, formatCount } from "@/lib/format";

describe("formatCount", () => {
  it("groups thousands below 10K and abbreviates from 10K", () => {
    expect(formatCount(842)).toBe("842");
    expect(formatCount(2314)).toBe("2,314");
    expect(formatCount(9999)).toBe("9,999");
    expect(formatCount(10_000)).toBe("10K");
    expect(formatCount(12_483)).toBe("12.4K");
    expect(formatCount(75_451)).toBe("75.4K");
    expect(formatCount(100_000)).toBe("100K");
  });

  it("never renders invalid values", () => {
    expect(formatCount(-5)).toBe("0");
    expect(formatCount(Number.NaN)).toBe("0");
  });
});

describe("boughtBucket", () => {
  it("returns the bucket alone, and null below 50", () => {
    expect(boughtBucket(undefined)).toBeNull();
    expect(boughtBucket(49)).toBeNull();
    expect(boughtBucket(Number.NaN)).toBeNull();
    expect(boughtBucket(75)).toBe("50+");
    expect(boughtBucket(250)).toBe("200+");
    expect(boughtBucket(2100)).toBe("2K+");
  });
});

describe("formatBoughtPastMonth", () => {
  it("shows a floor-rounded bucket and hides small counts", () => {
    expect(formatBoughtPastMonth(undefined)).toBeNull();
    expect(formatBoughtPastMonth(49)).toBeNull();
    expect(formatBoughtPastMonth(50)).toBe("50+ bought in past month");
    expect(formatBoughtPastMonth(99)).toBe("50+ bought in past month");
    expect(formatBoughtPastMonth(999)).toBe("900+ bought in past month");
    expect(formatBoughtPastMonth(1000)).toBe("1K+ bought in past month");
    expect(formatBoughtPastMonth(5400)).toBe("5K+ bought in past month");
  });
});

describe("mixHex", () => {
  it("blends between two colors and clamps the amount", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#102030", "#ffffff", 0)).toBe("#102030");
    expect(mixHex("#102030", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#102030", "#ffffff", 9)).toBe("#ffffff");
  });

  it("rejects non #rrggbb input", () => {
    expect(() => mixHex("red", "#ffffff", 0.5)).toThrow(RangeError);
  });
});
