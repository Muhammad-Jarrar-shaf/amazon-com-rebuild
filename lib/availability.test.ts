import { describe, expect, it } from "vitest";
import { LOW_STOCK_THRESHOLD, getAvailability } from "@/lib/availability";

describe("getAvailability", () => {
  it("is in stock above the low-stock threshold", () => {
    const state = getAvailability(LOW_STOCK_THRESHOLD + 1);
    expect(state).toMatchObject({ kind: "in_stock", label: "In Stock", purchasable: true, maxQuantity: 6, tone: "positive" });
    expect(getAvailability(42).maxQuantity).toBe(10);
  });

  it("is low stock from 1 up to the threshold, with the count in the label", () => {
    expect(getAvailability(LOW_STOCK_THRESHOLD)).toMatchObject({ kind: "low_stock", purchasable: true, tone: "warning" });
    expect(getAvailability(3)).toMatchObject({ kind: "low_stock", label: "Only 3 left in stock - order soon.", maxQuantity: 3 });
    expect(getAvailability(1).maxQuantity).toBe(1);
  });

  it("is out of stock at zero, negative or invalid stock and cannot be purchased", () => {
    for (const stock of [0, -2, Number.NaN]) {
      expect(getAvailability(stock)).toMatchObject({
        kind: "out_of_stock",
        label: "Currently unavailable.",
        purchasable: false,
        maxQuantity: 0,
        tone: "negative",
      });
    }
  });

  it("is unavailable to ship when restricted, regardless of stock", () => {
    expect(getAvailability(100, true)).toMatchObject({ kind: "unavailable_to_ship", purchasable: false, maxQuantity: 0, tone: "negative" });
    expect(getAvailability(100, true).label).toMatch(/cannot be shipped/);
  });

  it("never marks something purchasable with a zero maximum", () => {
    for (const stock of [0, 1, 5, 6, 50]) {
      const state = getAvailability(stock);
      expect(state.purchasable).toBe(state.maxQuantity > 0);
    }
  });
});
