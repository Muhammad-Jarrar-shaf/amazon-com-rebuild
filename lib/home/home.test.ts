import { describe, expect, it } from "vitest";
import { getProductById } from "@/lib/catalog";
import { searchCatalog } from "@/lib/search/server";
import { buildSearchUrl, parseSearchParams } from "@/lib/search/url";
import { CATEGORY_CARDS, HERO_SLIDES, HOME_RAIL } from "./content";
import { getCategoryCards, getHeroSlides, getHomeRailProducts, resolvePicture, scopeHref, scopeState } from "./server";
import type { HomePicture, HomeScope } from "./types";

// Home content (FR-HOME-1..3): counts, canonical destinations, and no dead ends.

/** Every scoped destination on the page: slides, tiles and "See more" links. */
const DESTINATIONS: { name: string; scope: HomeScope; picture?: HomePicture }[] = [
  ...HERO_SLIDES.map((slide) => ({ name: slide.id, scope: slide.scope, picture: slide.picture })),
  ...CATEGORY_CARDS.flatMap((card) => [
    ...card.tiles.map((tile) => ({ name: tile.id, scope: tile.scope, picture: tile.picture })),
    ...(card.more ? [{ name: `${card.id} (more)`, scope: card.more.scope }] : []),
  ]),
];

const resultIds = (scope: HomeScope) => {
  const result = searchCatalog(scopeState(scope));
  return { total: result.page.total, ids: result.page.items.map((product) => product.id), pageCount: result.page.pageCount };
};

describe("hero carousel content (FR-HOME-1)", () => {
  it("has 3-4 slides with unique ids and copy", () => {
    expect(HERO_SLIDES.length).toBeGreaterThanOrEqual(3);
    expect(HERO_SLIDES.length).toBeLessThanOrEqual(4);
    expect(new Set(HERO_SLIDES.map((slide) => slide.id)).size).toBe(HERO_SLIDES.length);
    expect(new Set(HERO_SLIDES.map((slide) => slide.headline)).size).toBe(HERO_SLIDES.length);
    for (const slide of HERO_SLIDES) {
      expect(slide.headline.trim(), slide.id).not.toBe("");
      expect(slide.cta.trim(), slide.id).not.toBe("");
    }
  });

  it("keeps both gradient stops light enough for dark body text", () => {
    // Relative luminance >= 0.7 keeps #0f1111 text well above the 4.5:1 AA ratio.
    const luminance = (hex: string) => {
      const channel = (offset: number) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
    };
    for (const slide of HERO_SLIDES) {
      for (const stop of slide.background) {
        expect(stop, slide.id).toMatch(/^#[0-9a-f]{6}$/);
        expect(luminance(stop), `${slide.id} ${stop}`).toBeGreaterThanOrEqual(0.7);
      }
    }
  });
});

describe("category cards (FR-HOME-2)", () => {
  it("has at least 8 cards of exactly 4 tiles, with unique ids and headlines", () => {
    expect(CATEGORY_CARDS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(CATEGORY_CARDS.map((card) => card.id)).size).toBe(CATEGORY_CARDS.length);
    expect(new Set(CATEGORY_CARDS.map((card) => card.headline)).size).toBe(CATEGORY_CARDS.length);
    const tileIds = CATEGORY_CARDS.flatMap((card) => card.tiles.map((tile) => tile.id));
    expect(new Set(tileIds).size).toBe(tileIds.length);
    for (const card of CATEGORY_CARDS) {
      expect(card.tiles, card.id).toHaveLength(4);
      for (const tile of card.tiles) expect(tile.label.trim(), tile.id).not.toBe("");
    }
  });

  it("never repeats a destination or a picture within one card", () => {
    for (const card of CATEGORY_CARDS) {
      expect(new Set(card.tiles.map((tile) => scopeHref(tile.scope))).size, card.id).toBe(4);
      expect(new Set(card.tiles.map((tile) => `${tile.picture.productId}/${tile.picture.variantId ?? ""}`)).size, card.id).toBe(4);
      expect(new Set(card.tiles.map((tile) => tile.label)).size, card.id).toBe(4);
    }
  });
});

describe("destinations", () => {
  it("are canonical local results URLs that survive a parse/build round trip", () => {
    for (const { name, scope } of DESTINATIONS) {
      const href = scopeHref(scope);
      expect(href, name).toMatch(/^\/s\?/);
      const params = new URLSearchParams(href.slice("/s?".length));
      expect(buildSearchUrl(parseSearchParams(params)), name).toBe(href);
    }
  });

  it("every slide, tile and See more link leads to a non-empty results page", () => {
    for (const { name, scope } of DESTINATIONS) expect(resultIds(scope).total, name).toBeGreaterThan(0);
  });

  it("the pictured product is on the first page of the results it links to", () => {
    for (const { name, scope, picture } of DESTINATIONS) {
      if (!picture) continue;
      expect(resultIds(scope).ids, name).toContain(picture.productId);
    }
  });

  it("every department card's See more link browses that department", () => {
    for (const card of CATEGORY_CARDS) {
      if (!card.more) continue;
      expect(card.more.scope.dept, card.id).toBeDefined();
      expect(scopeHref(card.more.scope), card.id).toBe(`/s?dept=${card.more.scope.dept}`);
    }
  });
});

describe("pictures", () => {
  it("resolve to an existing product and variant image", () => {
    for (const { name, picture } of DESTINATIONS) {
      if (!picture) continue;
      const product = getProductById(picture.productId);
      expect(product, name).toBeDefined();
      const resolved = resolvePicture(picture);
      expect(resolved.department, name).toBe(product!.department);
      expect(resolved.image.alt.trim(), name).not.toBe("");
      if (resolved.image.src !== null) expect(resolved.image.src, name).toMatch(/^\/assets\/products\/[a-z0-9-]+\.webp$/);
    }
  });

  it("a named variant is used exactly, and an unknown one is an error rather than a silent fallback", () => {
    const sage = resolvePicture({ productId: "B0DEWL0BRS", variantId: "sage" });
    expect(sage.tone).toBe(getProductById("B0DEWL0BRS")!.variants.find((variant) => variant.id === "sage")!.swatch);
    expect(() => resolvePicture({ productId: "B0DEWL0BRS", variantId: "nope" })).toThrow(/unknown variant/);
    expect(() => resolvePicture({ productId: "B0MISSING" })).toThrow(/unknown product/);
  });

  it("every hero slide uses a photograph, not the generated illustration", () => {
    for (const slide of getHeroSlides()) expect(slide.image.src, slide.id).not.toBeNull();
  });
});

describe("resolved view models", () => {
  it("carry the canonical hrefs and resolved images in authored order", () => {
    const slides = getHeroSlides();
    expect(slides.map((slide) => slide.id)).toEqual(HERO_SLIDES.map((slide) => slide.id));
    expect(slides[0]!.href).toBe("/s?k=headphones");

    const cards = getCategoryCards();
    expect(cards.map((card) => card.id)).toEqual(CATEGORY_CARDS.map((card) => card.id));
    expect(cards[0]!.tiles[0]!.href).toBe("/s?k=headphones&dept=electronics");
    expect(cards.find((card) => card.id === "beauty")!.tiles[3]!.href).toBe("/s?dept=beauty&max=29");
    expect(cards.find((card) => card.id === "record-stream-play")!.more).toBeUndefined();
  });

  it("are deterministic", () => {
    expect(getHeroSlides()).toEqual(getHeroSlides());
    expect(getCategoryCards()).toEqual(getCategoryCards());
  });
});

describe("product rail (FR-HOME-3)", () => {
  it("shows up to the limit of featured products, each an existing product page", () => {
    const products = getHomeRailProducts();
    expect(products.length).toBeGreaterThanOrEqual(4);
    expect(products.length).toBeLessThanOrEqual(HOME_RAIL.limit);
    expect(new Set(products.map((product) => product.id)).size).toBe(products.length);
    for (const product of products) expect(getProductById(product.id)).toBe(product);
  });
});
