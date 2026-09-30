import type { AddToCartRequest } from "@/lib/purchase";

export type AddToCartOutcome = { added: true } | { added: false; reason: "cart-not-built" };

/**
 * Integration boundary for the cart (S4). The product page already validates with `resolvePurchase` and calls this;
 * S4 replaces the body with the cart store's add action and keeps the signature. Until then nothing is added and the
 * page says so honestly.
 */
export function addToCart(request: AddToCartRequest): AddToCartOutcome {
  void request;
  return { added: false, reason: "cart-not-built" };
}
