"use client";

import { useMemo } from "react";
import { useCartLookup } from "@/components/cart/cart-provider";
import { cartCount, cartSubtotalCents, resolveLines } from "@/lib/cart/model";
import { cartStore, useCart } from "@/lib/cart/store";
import type { AddToCartRequest } from "@/lib/purchase";
import type { LineIdentity } from "@/lib/cart/types";

/** The cart as the UI shows it: resolved lines, item count and subtotal, all derived from the one store. */
export function useCartView() {
  const lookup = useCartLookup();
  const lines = useCart((state) => state.lines);
  const hydrated = useCart((state) => state.hydrated);
  return useMemo(() => {
    const views = resolveLines(lines, lookup);
    return { hydrated, views, count: cartCount(lines), subtotalCents: cartSubtotalCents(lines, lookup) };
  }, [lines, lookup, hydrated]);
}

/** Cart actions bound to the catalog projection. Every entry point (product page, result row, mini-cart, cart page) uses these. */
export function useCartActions() {
  const lookup = useCartLookup();
  return useMemo(() => {
    const state = () => cartStore.getState();
    return {
      add: (request: AddToCartRequest) => state().add(request, lookup),
      setQuantity: (identity: LineIdentity, quantity: number) => state().setQuantity(identity, quantity, lookup),
      remove: (identity: LineIdentity) => state().remove(identity),
      undo: () => state().undo(lookup),
    };
  }, [lookup]);
}
