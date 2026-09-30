import { getFeaturedProducts, getProductById } from "@/lib/catalog";
import { getDefaultVariant } from "@/lib/catalog/variants";
import type { Product } from "@/lib/catalog/types";
import { DEFAULT_SEARCH_STATE, type SearchState } from "@/lib/search/types";
import { buildSearchUrl } from "@/lib/search/url";
import { CATEGORY_CARDS, HERO_SLIDES, HOME_RAIL } from "./content";
import type { CategoryCardView, HeroSlideView, HomePicture, HomeScope, ResolvedImage } from "./types";

// Server-side: resolves the authored home content against the seed catalog. Client components must not import this
// module (it pulls in the catalog); they receive the resolved view models as props.

export function scopeState(scope: HomeScope): SearchState {
  return { ...DEFAULT_SEARCH_STATE, ...scope };
}

export function scopeHref(scope: HomeScope): string {
  return buildSearchUrl(scopeState(scope));
}

/** Throws on an unknown product or variant: authored content is checked by unit tests, never silently dropped. */
export function resolvePicture(picture: HomePicture): ResolvedImage {
  const product = getProductById(picture.productId);
  if (!product) throw new Error(`home: unknown product ${picture.productId}`);
  // An exact match: getVariant would silently fall back to the default for a mistyped id.
  const variant = picture.variantId ? product.variants.find((candidate) => candidate.id === picture.variantId) : getDefaultVariant(product);
  if (!variant) throw new Error(`home: unknown variant ${picture.productId}/${picture.variantId}`);
  const image = variant.images[0];
  if (!image) throw new Error(`home: ${picture.productId} has no image`);
  return { image, department: product.department, tone: variant.swatch };
}

export function getHeroSlides(): HeroSlideView[] {
  return HERO_SLIDES.map((slide) => ({
    id: slide.id,
    headline: slide.headline,
    body: slide.body,
    cta: slide.cta,
    href: scopeHref(slide.scope),
    background: slide.background,
    ...resolvePicture(slide.picture),
  }));
}

export function getCategoryCards(): CategoryCardView[] {
  return CATEGORY_CARDS.map((card) => ({
    id: card.id,
    headline: card.headline,
    tiles: card.tiles.map((tile) => ({ id: tile.id, label: tile.label, href: scopeHref(tile.scope), ...resolvePicture(tile.picture) })),
    more: card.more ? { label: card.more.label, href: scopeHref(card.more.scope) } : undefined,
  }));
}

export function getHomeRailProducts(): Product[] {
  return getFeaturedProducts(HOME_RAIL.limit);
}
