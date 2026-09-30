import { getAvailability, type Availability } from "@/lib/availability";
import type { Product, Variant } from "./types";

// Pure variant helpers that operate on a product object and import no catalog data, so client components
// (the product page's interactive parts) can use them without shipping the whole catalog to the browser.

export function getVariantAvailability(variant: Pick<Variant, "stock" | "shippingRestricted">): Availability {
  return getAvailability(variant.stock, variant.shippingRestricted);
}

export function isPurchasable(variant: Variant): boolean {
  return getVariantAvailability(variant).purchasable;
}

/** The first purchasable variant, or the first variant when none can be bought. */
export function getDefaultVariant(product: Product): Variant {
  const fallback = product.variants[0];
  if (!fallback) throw new Error(`product ${product.id} has no variants`);
  return product.variants.find(isPurchasable) ?? fallback;
}

/** The requested variant, or the default when the id is missing or unknown. */
export function getVariant(product: Product, variantId?: string): Variant {
  if (variantId) {
    const match = product.variants.find((variant) => variant.id === variantId);
    if (match) return match;
  }
  return getDefaultVariant(product);
}
