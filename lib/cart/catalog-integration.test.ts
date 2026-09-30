import { describe, expect, it } from "vitest";
import { getAllProducts, getProductById } from "@/lib/catalog";
import { getVariantAvailability } from "@/lib/catalog/variants";
import { lineTotalCents } from "@/lib/pricing";
import { addToLines, cartSubtotalCents, resolveLines } from "./model";
import { buildCartLookup } from "./lookup";

// The cart against the REAL seed catalog (through the compact projection the app ships to the browser).
const lookup = buildCartLookup(getAllProducts());

describe("cart against the seed catalog", () => {
  it("projects every product and variant, with the catalog's own prices", () => {
    for (const product of getAllProducts()) {
      const projected = lookup[product.id];
      expect(projected?.variants.map((v) => [v.id, v.priceCents, v.listPriceCents])).toEqual(product.variants.map((v) => [v.id, v.priceCents, v.listPriceCents]));
    }
  });

  it("totals every purchasable variant exactly as catalog price x quantity", () => {
    for (const product of getAllProducts()) {
      for (const variant of product.variants) {
        if (!getVariantAvailability(variant).purchasable) continue;
        const outcome = addToLines([], { productId: product.id, variantId: variant.id, quantity: 2 }, lookup);
        expect(outcome.ok).toBe(true);
        if (outcome.ok) expect(cartSubtotalCents(outcome.lines, lookup)).toBe(lineTotalCents(variant.priceCents, 2));
      }
    }
  });

  it("refuses every unavailable variant in the catalog", () => {
    let seen = 0;
    for (const product of getAllProducts()) {
      for (const variant of product.variants) {
        if (getVariantAvailability(variant).purchasable) continue;
        seen += 1;
        expect(addToLines([], { productId: product.id, variantId: variant.id, quantity: 1 }, lookup).ok).toBe(false);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("keeps two variants of a real product as two lines with their own prices", () => {
    const product = getProductById("B0HALO0AUR");
    expect(product).toBeDefined();
    const [a, b] = product!.variants.filter((v) => getVariantAvailability(v).purchasable);
    const lines = addToLines([], { productId: product!.id, variantId: a!.id, quantity: 1 }, lookup);
    if (!lines.ok) throw new Error("add failed");
    const second = addToLines(lines.lines, { productId: product!.id, variantId: b!.id, quantity: 3 }, lookup);
    if (!second.ok) throw new Error("add failed");
    expect(resolveLines(second.lines, lookup)).toHaveLength(2);
    expect(cartSubtotalCents(second.lines, lookup)).toBe(a!.priceCents + 3 * b!.priceCents);
  });
});
