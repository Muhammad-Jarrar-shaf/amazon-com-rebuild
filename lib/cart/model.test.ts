import { describe, expect, it } from "vitest";
import { LOOKUP } from "./fixtures";
import {
  addToLines,
  cartCount,
  cartSubtotalCents,
  findProduct,
  recoveryMessage,
  removeFromLines,
  resolveLines,
  restoreLine,
  sanitizeLines,
  setLineQuantity,
} from "./model";
import type { CartLine } from "./types";

const line = (productId: string, variantId: string, quantity: number): CartLine => ({ productId, variantId, quantity });

function add(lines: CartLine[], productId: string, variantId: string, quantity = 1) {
  const outcome = addToLines(lines, { productId, variantId, quantity }, LOOKUP);
  if (!outcome.ok) throw new Error(`add failed: ${outcome.reason}`);
  return outcome;
}

describe("addToLines", () => {
  it("adds a new line", () => {
    expect(add([], "mug", "one").lines).toEqual([line("mug", "one", 1)]);
  });

  it("merges the same product and variant into one line", () => {
    const first = add([], "headphones", "black", 2);
    const second = add(first.lines, "headphones", "black", 3);
    expect(second.lines).toEqual([line("headphones", "black", 5)]);
    expect(second.capped).toBe(false);
  });

  it("keeps different variants of one product as separate lines", () => {
    const { lines } = add(add([], "headphones", "black").lines, "headphones", "white");
    expect(lines).toEqual([line("headphones", "black", 1), line("headphones", "white", 1)]);
  });

  it("caps a merge at 10 and reports it", () => {
    const outcome = add([line("mug", "one", 8)], "mug", "one", 5);
    expect(outcome.lines).toEqual([line("mug", "one", 10)]);
    expect(outcome.capped).toBe(true);
  });

  it("caps a merge at the stock", () => {
    const outcome = add([line("headphones", "blue", 2)], "headphones", "blue", 2);
    expect(outcome.lines).toEqual([line("headphones", "blue", 3)]);
    expect(outcome.capped).toBe(true);
  });

  it.each([
    ["unknown product", "ghost", "one", 1, "unknown_product"],
    ["prototype-named product", "constructor", "one", 1, "unknown_product"],
    ["unknown variant", "headphones", "pink", 1, "unknown_variant"],
    ["out of stock variant", "headphones", "red", 1, "unavailable"],
    ["shipping-restricted variant", "headphones", "green", 1, "unavailable"],
    ["zero quantity", "mug", "one", 0, "invalid_quantity"],
    ["negative quantity", "mug", "one", -1, "invalid_quantity"],
    ["fractional quantity", "mug", "one", 1.5, "invalid_quantity"],
    ["NaN quantity", "mug", "one", Number.NaN, "invalid_quantity"],
    ["quantity above 10", "mug", "one", 11, "invalid_quantity"],
    ["quantity above stock", "headphones", "blue", 4, "invalid_quantity"],
  ] as const)("rejects %s and leaves the cart untouched", (_name, productId, variantId, quantity, reason) => {
    const before = [line("mug", "one", 1)];
    const outcome = addToLines(before, { productId, variantId, quantity }, LOOKUP);
    expect(outcome).toEqual({ ok: false, reason });
    expect(before).toEqual([line("mug", "one", 1)]);
  });
});

describe("setLineQuantity", () => {
  const lines = [line("headphones", "black", 2), line("headphones", "blue", 1)];

  it("increments and decrements", () => {
    const up = setLineQuantity(lines, lines[0]!, 3, LOOKUP);
    expect(up).toMatchObject({ ok: true, quantity: 3 });
    const down = setLineQuantity(lines, lines[0]!, 1, LOOKUP);
    expect(down).toMatchObject({ ok: true, quantity: 1 });
  });

  it("updates only the addressed variant line", () => {
    const outcome = setLineQuantity(lines, { productId: "headphones", variantId: "blue" }, 3, LOOKUP);
    expect(outcome.ok && outcome.lines).toEqual([line("headphones", "black", 2), line("headphones", "blue", 3)]);
  });

  it("caps at 10 and at the stock", () => {
    expect(setLineQuantity(lines, lines[0]!, 99, LOOKUP)).toMatchObject({ ok: true, quantity: 10, capped: true });
    expect(setLineQuantity(lines, lines[1]!, 9, LOOKUP)).toMatchObject({ ok: true, quantity: 3, capped: true });
  });

  it.each([0, -2, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects %s (removal is a separate action)", (quantity) => {
    expect(setLineQuantity(lines, lines[0]!, quantity, LOOKUP)).toEqual({ ok: false, reason: "invalid_quantity" });
  });

  it("rejects a line that is not in the cart", () => {
    expect(setLineQuantity(lines, { productId: "mug", variantId: "one" }, 2, LOOKUP)).toEqual({ ok: false, reason: "not_in_cart" });
  });

  it("rejects a line whose variant is no longer purchasable", () => {
    expect(setLineQuantity([line("headphones", "red", 1)], { productId: "headphones", variantId: "red" }, 2, LOOKUP)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});

describe("remove and undo", () => {
  const lines = [line("mug", "one", 2), line("headphones", "black", 3), line("cable", "1m", 1)];

  it("removes only the addressed line and remembers it with its position", () => {
    const { lines: rest, removed } = removeFromLines(lines, { productId: "headphones", variantId: "black" });
    expect(rest).toEqual([line("mug", "one", 2), line("cable", "1m", 1)]);
    expect(removed).toEqual({ line: line("headphones", "black", 3), index: 1 });
  });

  it("removing something that is not there changes nothing", () => {
    const { lines: rest, removed } = removeFromLines(lines, { productId: "ghost", variantId: "x" });
    expect(rest).toEqual(lines);
    expect(removed).toBeNull();
  });

  it("undo restores the exact product, variant, quantity and position", () => {
    const { lines: rest, removed } = removeFromLines(lines, { productId: "headphones", variantId: "black" });
    expect(restoreLine(rest, removed!, LOOKUP)).toEqual(lines);
  });

  it("undo merges instead of duplicating when the variant was added again", () => {
    const { lines: rest, removed } = removeFromLines(lines, { productId: "headphones", variantId: "black" });
    const readded = add(rest, "headphones", "black", 2).lines;
    expect(restoreLine(readded, removed!, LOOKUP).filter((l) => l.productId === "headphones")).toEqual([line("headphones", "black", 5)]);
  });

  it("undo does not restore a line that became unavailable", () => {
    const removed = { line: line("headphones", "red", 1), index: 0 };
    expect(restoreLine([line("mug", "one", 1)], removed, LOOKUP)).toEqual([line("mug", "one", 1)]);
  });
});

describe("count and subtotal", () => {
  it("counts total quantity across lines", () => {
    expect(cartCount([])).toBe(0);
    expect(cartCount([line("mug", "one", 1)])).toBe(1);
    expect(cartCount([line("mug", "one", 3)])).toBe(3);
    expect(cartCount([line("mug", "one", 2), line("cable", "1m", 4)])).toBe(6);
  });

  it("is zero for an empty cart", () => {
    expect(cartSubtotalCents([], LOOKUP)).toBe(0);
  });

  it("multiplies by quantity in integer cents", () => {
    expect(cartSubtotalCents([line("mug", "one", 3)], LOOKUP)).toBe(3897);
  });

  it("uses each variant's own price and ignores the compare-at price", () => {
    // black is 79.99 (list 99.99), white is 84.99: 2 x 7999 + 1 x 8499
    expect(cartSubtotalCents([line("headphones", "black", 2), line("headphones", "white", 1)], LOOKUP)).toBe(24497);
  });

  it("aggregates across products and stays an exact integer (no float drift)", () => {
    const lines = [line("mug", "one", 3), line("cable", "1m", 7), line("headphones", "black", 1)];
    const total = cartSubtotalCents(lines, LOOKUP);
    expect(total).toBe(3 * 1299 + 7 * 999 + 7999);
    expect(Number.isInteger(total)).toBe(true);
  });

  it("changes with removal and returns with undo", () => {
    const lines = [line("mug", "one", 2), line("cable", "1m", 1)];
    const { lines: rest, removed } = removeFromLines(lines, { productId: "mug", variantId: "one" });
    expect(cartSubtotalCents(rest, LOOKUP)).toBe(999);
    expect(cartSubtotalCents(restoreLine(rest, removed!, LOOKUP), LOOKUP)).toBe(2 * 1299 + 999);
  });
});

describe("resolveLines", () => {
  it("joins lines with catalog data, including variant, compare-at and line total", () => {
    const [view] = resolveLines([line("headphones", "black", 2)], LOOKUP);
    expect(view).toMatchObject({
      title: "Halo Wireless Headphones",
      variantDimension: "Color",
      variantLabel: "Black",
      showVariant: true,
      unitPriceCents: 7999,
      listPriceCents: 9999,
      lineTotalCents: 15998,
      availabilityLabel: "In Stock",
      maxQuantity: 10,
    });
  });

  it("hides the variant for a single-variant product and reflects low stock", () => {
    expect(resolveLines([line("mug", "one", 1)], LOOKUP)[0]?.showVariant).toBe(false);
    expect(resolveLines([line("headphones", "blue", 1)], LOOKUP)[0]).toMatchObject({ maxQuantity: 3, availabilityTone: "warning" });
  });

  it("skips a line whose product vanished", () => {
    expect(resolveLines([line("ghost", "x", 1), line("mug", "one", 1)], LOOKUP)).toHaveLength(1);
  });
});

describe("sanitizeLines", () => {
  it("keeps valid lines untouched", () => {
    const { lines, report } = sanitizeLines([line("mug", "one", 2)], LOOKUP);
    expect(lines).toEqual([line("mug", "one", 2)]);
    expect(recoveryMessage(report)).toBeNull();
  });

  it("removes vanished products and variants and says so", () => {
    const { lines, report } = sanitizeLines([line("ghost", "x", 1), line("mug", "nope", 1), line("mug", "one", 1)], LOOKUP);
    expect(lines).toEqual([line("mug", "one", 1)]);
    expect(report.removed).toBe(2);
    expect(recoveryMessage(report)).toMatch(/2 items are no longer available/);
  });

  it("removes unavailable variants", () => {
    const { lines, report } = sanitizeLines([line("headphones", "red", 1), line("headphones", "green", 1)], LOOKUP);
    expect(lines).toEqual([]);
    expect(report.removed).toBe(2);
  });

  it.each([0, -1, 2.5, "3", null, Number.NaN, Number.POSITIVE_INFINITY])("removes an invalid quantity (%s)", (quantity) => {
    const { lines, report } = sanitizeLines([{ productId: "mug", variantId: "one", quantity }], LOOKUP);
    expect(lines).toEqual([]);
    expect(report.removed).toBe(1);
  });

  it("reduces an over-limit quantity and reports the adjustment", () => {
    const { lines, report } = sanitizeLines([line("mug", "one", 50), line("headphones", "blue", 9)], LOOKUP);
    expect(lines).toEqual([line("mug", "one", 10), line("headphones", "blue", 3)]);
    expect(report.adjusted).toBe(2);
    expect(recoveryMessage(report)).toMatch(/reduced/);
  });

  it("merges duplicates of one product and variant", () => {
    const { lines } = sanitizeLines([line("mug", "one", 2), line("mug", "one", 3)], LOOKUP);
    expect(lines).toEqual([line("mug", "one", 5)]);
  });

  it("drops entries that are not objects and ignores prototype-named ids", () => {
    const { lines, report } = sanitizeLines([null, 7, "x", [], { productId: "constructor", variantId: "x", quantity: 1 }], LOOKUP);
    expect(lines).toEqual([]);
    expect(report.removed).toBe(5);
  });

  it("treats a non-array as unreadable", () => {
    expect(sanitizeLines({}, LOOKUP).report.unreadable).toBe(true);
    expect(sanitizeLines("cart", LOOKUP).report.unreadable).toBe(true);
  });

  it("strips unexpected extra fields (only ids and quantity are kept)", () => {
    const { lines } = sanitizeLines([{ productId: "mug", variantId: "one", quantity: 1, priceCents: 1, title: "hacked" }], LOOKUP);
    expect(lines).toEqual([line("mug", "one", 1)]);
  });
});

describe("findProduct", () => {
  it("resolves own ids only", () => {
    expect(findProduct(LOOKUP, "mug")?.id).toBe("mug");
    expect(findProduct(LOOKUP, "toString")).toBeUndefined();
    expect(findProduct(LOOKUP, "__proto__")).toBeUndefined();
  });
});
