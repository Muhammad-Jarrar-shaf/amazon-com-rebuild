import { getVariantAvailability } from "@/lib/catalog/variants";
import type { Product } from "@/lib/catalog/types";
import { lineTotalCents, type Cents } from "@/lib/pricing";
import { isValidQuantity } from "@/lib/quantity";

/** What the cart (S4) will receive: ids and a quantity only. Prices are always resolved from the catalog. */
export interface AddToCartRequest {
  productId: string;
  variantId: string;
  quantity: number;
}

export type PurchaseFailure = "unknown_product" | "unknown_variant" | "unavailable" | "invalid_quantity";

export type PurchaseResult =
  | { ok: true; request: AddToCartRequest; unitPriceCents: Cents; lineTotalCents: Cents }
  | { ok: false; reason: PurchaseFailure };

export const PURCHASE_FAILURE_MESSAGES: Record<PurchaseFailure, string> = {
  unknown_product: "This product is no longer available.",
  unknown_variant: "Please choose an available option.",
  unavailable: "This option is currently unavailable and cannot be added.",
  invalid_quantity: "Please choose a valid quantity.",
};

/**
 * Validates a purchase: the product and variant must exist, the variant must be purchasable and the quantity must
 * be a whole number within [1, min(10, stock)]. Nothing is silently clamped or coerced. Takes the product object
 * (looked up by the caller) so client components can use it without importing the catalog data.
 */
export function resolvePurchase(product: Product | undefined, variantId: string, quantity: number): PurchaseResult {
  if (!product) return { ok: false, reason: "unknown_product" };
  const variant = product.variants.find((candidate) => candidate.id === variantId);
  if (!variant) return { ok: false, reason: "unknown_variant" };
  const availability = getVariantAvailability(variant);
  if (!availability.purchasable) return { ok: false, reason: "unavailable" };
  if (!isValidQuantity(quantity, availability.maxQuantity)) return { ok: false, reason: "invalid_quantity" };
  return {
    ok: true,
    request: { productId: product.id, variantId, quantity },
    unitPriceCents: variant.priceCents,
    lineTotalCents: lineTotalCents(variant.priceCents, quantity),
  };
}
