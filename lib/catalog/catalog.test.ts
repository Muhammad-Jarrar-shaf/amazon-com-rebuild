import { describe, expect, it } from "vitest";
import { addToCart } from "@/lib/cart-boundary";
import {
  getAllProducts,
  getBreadcrumb,
  getDefaultVariant,
  getDisplayPrice,
  getFeaturedProducts,
  getProductById,
  getProductsByDepartment,
  getRelatedProducts,
  getSearchIndex,
  getVariant,
  getVariantAvailability,
  isPurchasable,
  normalizeSearchText,
} from "@/lib/catalog";
import { DEPARTMENTS } from "@/lib/departments";
import { discountPercent, formatMoney } from "@/lib/pricing";
import { PURCHASE_FAILURE_MESSAGES, resolvePurchase } from "@/lib/purchase";

const HERO = "B0HALO0AUR";
const LOW_STOCK = "B0HALO0PUL";
const OUT_OF_STOCK = "B0VOXL0SPK";
const RESTRICTED = "B0NIMB0PWR";

const buy = (id: string, variantId: string, quantity: number) => resolvePurchase(getProductById(id), variantId, quantity);

const product = (id: string) => {
  const found = getProductById(id);
  if (!found) throw new Error(`missing test product ${id}`);
  return found;
};

describe("product lookup", () => {
  it("finds products by id and returns undefined for anything else", () => {
    expect(getProductById(HERO)?.title).toMatch(/Halo Audio Aura/);
    for (const bad of ["", "nope", "b0halo0aur", " B0HALO0AUR", "B0HALO0AUR/extra", "__proto__", "constructor"]) {
      expect(getProductById(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it("lists products by department and covers the whole catalog", () => {
    let total = 0;
    for (const department of DEPARTMENTS) {
      const list = getProductsByDepartment(department.slug);
      expect(list.length).toBeGreaterThan(0);
      for (const item of list) expect(item.department).toBe(department.slug);
      total += list.length;
    }
    expect(total).toBe(getAllProducts().length);
  });

  it("builds a two-step breadcrumb from department and category", () => {
    expect(getBreadcrumb(product(HERO))).toEqual([
      { label: "Electronics", href: "/s?dept=electronics" },
      { label: "Over-Ear Headphones", href: "/s?dept=electronics" },
    ]);
  });
});

describe("related and featured products", () => {
  it("resolves related products in authored order, without the product itself", () => {
    const hero = product(HERO);
    const related = getRelatedProducts(hero);
    expect(related.map((item) => item.id)).toEqual(hero.relatedIds);
    expect(related.length).toBeGreaterThanOrEqual(4);
    expect(related.some((item) => item.id === HERO)).toBe(false);
  });

  it("respects the limit and skips unknown or duplicate ids", () => {
    const hero = product(HERO);
    expect(getRelatedProducts(hero, 2)).toHaveLength(2);
    const noisy = { ...hero, relatedIds: ["B0MISSING0", HERO, LOW_STOCK, LOW_STOCK, OUT_OF_STOCK] };
    expect(getRelatedProducts(noisy).map((item) => item.id)).toEqual([LOW_STOCK, OUT_OF_STOCK]);
  });

  it("returns featured products in a stable rank order, hero first", () => {
    const first = getFeaturedProducts(8).map((item) => item.id);
    expect(first[0]).toBe(HERO);
    expect(getFeaturedProducts(8).map((item) => item.id)).toEqual(first);
    const ranks = getFeaturedProducts(8).map((item) => item.featuredRank as number);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(getFeaturedProducts(3)).toHaveLength(3);
  });
});

describe("variant selection", () => {
  it("defaults to the first purchasable variant", () => {
    expect(getDefaultVariant(product(HERO)).id).toBe("midnight-black");
    expect(getDefaultVariant(product("B0HALO0KID")).id).toBe("sky-blue");
  });

  it("falls back to the first variant when nothing can be bought", () => {
    expect(getDefaultVariant(product(OUT_OF_STOCK)).id).toBe("charcoal");
    expect(getDefaultVariant(product(RESTRICTED)).id).toBe("slate");
  });

  it("resolves a requested variant and ignores unknown ones", () => {
    const hero = product(HERO);
    expect(getVariant(hero, "space-silver").label).toBe("Space Silver");
    expect(getVariant(hero, "nope").id).toBe("midnight-black");
    expect(getVariant(hero, undefined).id).toBe("midnight-black");
    expect(getVariant(hero, "").id).toBe("midnight-black");
  });

  it("gives each hero variant its own price, image and availability", () => {
    const [black, silver, rose] = product(HERO).variants;
    expect([black!.priceCents, silver!.priceCents, rose!.priceCents]).toEqual([7999, 8499, 8999]);
    expect(black!.images[0]!.src).not.toBe(silver!.images[0]!.src);
    expect(isPurchasable(black!)).toBe(true);
    expect(isPurchasable(silver!)).toBe(true);
    expect(isPurchasable(rose!)).toBe(false);
    expect(getVariantAvailability(rose!).kind).toBe("out_of_stock");
  });

  it("derives display price and discount from the default variant", () => {
    const display = getDisplayPrice(product(HERO));
    expect(formatMoney(display.priceCents)).toBe("$79.99");
    expect(discountPercent(display.priceCents, display.listPriceCents)).toBe(38);
  });
});

describe("availability states", () => {
  it("covers in stock, low stock, out of stock and unavailable to ship", () => {
    expect(getVariantAvailability(getDefaultVariant(product(HERO))).kind).toBe("in_stock");
    expect(getVariantAvailability(getDefaultVariant(product(LOW_STOCK))).kind).toBe("low_stock");
    expect(getVariantAvailability(getDefaultVariant(product(OUT_OF_STOCK))).kind).toBe("out_of_stock");
    expect(getVariantAvailability(getDefaultVariant(product(RESTRICTED))).kind).toBe("unavailable_to_ship");
  });

  it("never lets an unavailable variant be purchased", () => {
    for (const item of getAllProducts()) {
      for (const variant of item.variants) {
        const result = resolvePurchase(item, variant.id, 1);
        expect(result.ok, `${item.id}/${variant.id}`).toBe(isPurchasable(variant));
      }
    }
  });
});

describe("resolvePurchase", () => {
  it("accepts a valid selection and prices it from the catalog", () => {
    const result = buy(HERO, "midnight-black", 2);
    expect(result).toEqual({
      ok: true,
      request: { productId: HERO, variantId: "midnight-black", quantity: 2 },
      unitPriceCents: 7999,
      lineTotalCents: 15998,
    });
  });

  it("uses the variant's own price", () => {
    const silver = buy(HERO, "space-silver", 1);
    expect(silver.ok && silver.unitPriceCents).toBe(8499);
  });

  it("rejects unknown products and variants", () => {
    expect(buy("nope", "x", 1)).toEqual({ ok: false, reason: "unknown_product" });
    expect(buy(HERO, "nope", 1)).toEqual({ ok: false, reason: "unknown_variant" });
  });

  it("rejects unavailable variants of any kind", () => {
    expect(buy(HERO, "sunset-rose", 1)).toEqual({ ok: false, reason: "unavailable" });
    expect(buy(OUT_OF_STOCK, "charcoal", 1)).toEqual({ ok: false, reason: "unavailable" });
    expect(buy(RESTRICTED, "slate", 1)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("rejects quantities that are out of bounds, fractional or above stock, without clamping", () => {
    for (const quantity of [0, -1, 11, 1.5, Number.NaN]) {
      expect(buy(HERO, "midnight-black", quantity), String(quantity)).toEqual({ ok: false, reason: "invalid_quantity" });
    }
    expect(buy(LOW_STOCK, "graphite", 3).ok).toBe(true);
    expect(buy(LOW_STOCK, "graphite", 4)).toEqual({ ok: false, reason: "invalid_quantity" });
  });

  it("has a message for every failure", () => {
    for (const reason of ["unknown_product", "unknown_variant", "unavailable", "invalid_quantity"] as const) {
      expect(PURCHASE_FAILURE_MESSAGES[reason].length).toBeGreaterThan(5);
    }
  });
});

describe("cart boundary", () => {
  it("does not pretend to add anything until the cart exists", () => {
    expect(addToCart({ productId: HERO, variantId: "midnight-black", quantity: 1 })).toEqual({ added: false, reason: "cart-not-built" });
  });
});

describe("search-ready records", () => {
  it("normalizes text", () => {
    expect(normalizeSearchText("  Café  Ünïcode—Test!  ")).toBe("cafe unicode test");
  });

  it("has one lower-cased record per product covering title, brand, category and tags", () => {
    const index = getSearchIndex();
    expect(index).toHaveLength(getAllProducts().length);
    const hero = index.find((record) => record.id === HERO);
    expect(hero?.text).toContain("halo audio");
    expect(hero?.text).toContain("noise cancelling");
    expect(hero?.text).toContain("over ear headphones");
    for (const record of index) expect(record.text).toBe(record.text.toLowerCase());
  });
});
