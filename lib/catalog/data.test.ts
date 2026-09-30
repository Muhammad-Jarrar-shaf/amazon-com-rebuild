import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/data/products";
import { DEPARTMENTS } from "@/lib/departments";
import { getAvailability } from "@/lib/availability";
import { BADGE_LABELS } from "@/lib/catalog/types";

// Seed-data integrity: the catalog must be internally coherent so no page can render a contradiction.

const publicDir = join(process.cwd(), "public");
const byId = new Map(PRODUCTS.map((product) => [product.id, product]));
const isCents = (value: number) => Number.isSafeInteger(value) && value > 0;

describe("catalog shape", () => {
  it("has about 30 products across the 6 departments", () => {
    expect(PRODUCTS.length).toBe(30);
    for (const department of DEPARTMENTS) {
      expect(PRODUCTS.filter((product) => product.department === department.slug).length, department.slug).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(PRODUCTS.map((product) => product.department)).size).toBe(DEPARTMENTS.length);
  });

  it("has unique, URL-safe ids and unique titles", () => {
    expect(byId.size).toBe(PRODUCTS.length);
    for (const product of PRODUCTS) expect(product.id, product.title).toMatch(/^B0[A-Z0-9]{8}$/);
    expect(new Set(PRODUCTS.map((product) => product.title)).size).toBe(PRODUCTS.length);
  });

  it("has complete metadata on every product", () => {
    for (const product of PRODUCTS) {
      const where = product.id;
      expect(product.brand.length, where).toBeGreaterThan(0);
      expect(product.byline.length, where).toBeGreaterThan(0);
      expect(product.description.length, where).toBeGreaterThanOrEqual(80);
      expect(product.bullets.length, where).toBeGreaterThanOrEqual(3);
      expect(product.specs.length, where).toBeGreaterThanOrEqual(3);
      expect(product.tags.length, where).toBeGreaterThan(0);
      for (const tag of product.tags) expect(tag, where).toBe(tag.toLowerCase());
      expect(product.rating, where).toBeGreaterThanOrEqual(0);
      expect(product.rating, where).toBeLessThanOrEqual(5);
      expect(Math.round(product.rating * 10) / 10, `${where} rating has one decimal`).toBe(product.rating);
      expect(Number.isInteger(product.ratingCount) && product.ratingCount >= 0, where).toBe(true);
      expect(Number.isInteger(product.shipping.costCents) && product.shipping.costCents >= 0, where).toBe(true);
      expect(Number.isInteger(product.shipping.businessDays) && product.shipping.businessDays >= 0, where).toBe(true);
      if (product.badge) expect(Object.keys(BADGE_LABELS), where).toContain(product.badge);
    }
  });
});

describe("variants and pricing", () => {
  it("has at least one variant per product with unique ids", () => {
    for (const product of PRODUCTS) {
      expect(product.variants.length, product.id).toBeGreaterThanOrEqual(1);
      const ids = product.variants.map((variant) => variant.id);
      expect(new Set(ids).size, `${product.id} variant ids`).toBe(ids.length);
      for (const id of ids) expect(id, product.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("uses positive integer cents and a compare-at price strictly above the price", () => {
    for (const product of PRODUCTS) {
      for (const variant of product.variants) {
        const where = `${product.id}/${variant.id}`;
        expect(isCents(variant.priceCents), `${where} price`).toBe(true);
        if (variant.listPriceCents !== undefined) {
          expect(isCents(variant.listPriceCents), `${where} list price`).toBe(true);
          expect(variant.listPriceCents, `${where} list > price`).toBeGreaterThan(variant.priceCents);
        }
        expect(variant.swatch, where).toMatch(/^#[0-9a-f]{6}$/i);
        expect(Number.isInteger(variant.stock) && variant.stock >= 0, `${where} stock`).toBe(true);
      }
    }
  });

  it("gives every variant at least one image with alt text", () => {
    for (const product of PRODUCTS) {
      for (const variant of product.variants) {
        expect(variant.images.length, `${product.id}/${variant.id}`).toBeGreaterThanOrEqual(1);
        for (const image of variant.images) expect(image.alt.length, `${product.id}/${variant.id}`).toBeGreaterThan(5);
      }
    }
  });

  it("makes the hero product a real variant demo: distinct prices, a gallery and an unavailable variant", () => {
    const hero = byId.get("B0HALO0AUR");
    expect(hero).toBeDefined();
    const variants = hero!.variants;
    expect(variants.length).toBe(3);
    expect(new Set(variants.map((variant) => variant.priceCents)).size).toBe(3);
    expect(variants.some((variant) => !getAvailability(variant.stock).purchasable)).toBe(true);
    expect(variants[0]!.images.length).toBeGreaterThanOrEqual(3);
    expect(new Set(variants.map((variant) => variant.images[0]!.src)).size).toBe(3);
  });

  it("demonstrates every availability state on some product's default variant", () => {
    const kinds = new Set(
      PRODUCTS.map((product) => {
        const first = product.variants.find((variant) => getAvailability(variant.stock, variant.shippingRestricted).purchasable) ?? product.variants[0]!;
        return getAvailability(first.stock, first.shippingRestricted).kind;
      }),
    );
    expect([...kinds].sort()).toEqual(["in_stock", "low_stock", "out_of_stock", "unavailable_to_ship"]);
  });
});

describe("references", () => {
  it("resolves every related id to a different, unique product, at least 4 per product", () => {
    for (const product of PRODUCTS) {
      expect(product.relatedIds.length, product.id).toBeGreaterThanOrEqual(4);
      expect(new Set(product.relatedIds).size, `${product.id} duplicates`).toBe(product.relatedIds.length);
      for (const id of product.relatedIds) {
        expect(id, `${product.id} relates to itself`).not.toBe(product.id);
        expect(byId.has(id), `${product.id} -> ${id}`).toBe(true);
      }
    }
  });

  it("has unique featured ranks", () => {
    const ranks = PRODUCTS.flatMap((product) => (product.featuredRank === undefined ? [] : [product.featuredRank]));
    expect(ranks.length).toBeGreaterThanOrEqual(8);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
});

describe("assets", () => {
  const sources = PRODUCTS.flatMap((product) => product.variants.flatMap((variant) => variant.images.map((image) => image.src))).filter(
    (src): src is string => src !== null,
  );

  it("uses only local, static, Amazon-free image paths that exist on disk", () => {
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) {
      expect(src, src).toMatch(/^\/assets\/products\/[a-z0-9-]+\.webp$/);
      expect(existsSync(join(publicDir, src)), `${src} exists`).toBe(true);
    }
    for (const product of PRODUCTS) {
      const text = JSON.stringify(product).toLowerCase();
      expect(text, product.id).not.toContain("http");
      expect(text, product.id).not.toContain("media-amazon");
    }
  });

  it("has real photographs for about 9 Tier A products and none of the rest", () => {
    const withPhotos = PRODUCTS.filter((product) => product.variants.some((variant) => variant.images.some((image) => image.src !== null)));
    expect(withPhotos.length).toBeGreaterThanOrEqual(8);
    expect(withPhotos.length).toBeLessThanOrEqual(10);
  });

  it("credits every photo file and has no unused or uncredited files", () => {
    const credits = readFileSync(join(publicDir, "assets", "CREDITS.md"), "utf8");
    const used = new Set(sources.map((src) => src.split("/").pop()!));
    const onDisk = readdirSync(join(publicDir, "assets", "products")).filter((file) => file.endsWith(".webp"));
    expect([...used].sort()).toEqual(onDisk.sort());
    for (const file of onDisk) expect(credits, `credit for ${file}`).toContain(`products/${file}`);
    expect(credits).toContain("Unsplash License");
    expect(credits).not.toMatch(/amazon\.com\/|media-amazon/i);
  });
});
