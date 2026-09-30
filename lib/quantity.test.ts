import { describe, expect, it } from "vitest";
import { MAX_QUANTITY, MIN_QUANTITY, clampQuantity, isValidQuantity, maxQuantityFor, parseQuantityInput, stepQuantity } from "@/lib/quantity";

describe("quantity bounds", () => {
  it("is 1 to 10", () => {
    expect(MIN_QUANTITY).toBe(1);
    expect(MAX_QUANTITY).toBe(10);
  });

  it("limits the orderable maximum by stock", () => {
    expect(maxQuantityFor(999)).toBe(10);
    expect(maxQuantityFor(10)).toBe(10);
    expect(maxQuantityFor(3)).toBe(3);
    expect(maxQuantityFor(2.9)).toBe(2);
    expect(maxQuantityFor(0)).toBe(0);
    expect(maxQuantityFor(-4)).toBe(0);
    expect(maxQuantityFor(Number.NaN)).toBe(0);
  });

  it("clamps into [1, max]", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
    expect(clampQuantity(11)).toBe(10);
    expect(clampQuantity(5, 3)).toBe(3);
    expect(clampQuantity(7.9)).toBe(7);
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(4, 0)).toBe(1);
  });

  it("steps by one and stops at the boundaries", () => {
    expect(stepQuantity(1, -1)).toBe(1);
    expect(stepQuantity(1, 1)).toBe(2);
    expect(stepQuantity(10, 1)).toBe(10);
    expect(stepQuantity(3, 1, 3)).toBe(3);
    expect(stepQuantity(3, -1, 3)).toBe(2);
  });

  it("parses typed input strictly", () => {
    expect(parseQuantityInput("7")).toBe(7);
    expect(parseQuantityInput(" 07 ")).toBe(7);
    for (const bad of ["", "abc", "-1", "7.5", "1000", "1e2"]) expect(parseQuantityInput(bad)).toBeNull();
  });

  it("validates whole numbers within bounds", () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(10)).toBe(true);
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(11)).toBe(false);
    expect(isValidQuantity(2.5)).toBe(false);
    expect(isValidQuantity(4, 3)).toBe(false);
  });
});
