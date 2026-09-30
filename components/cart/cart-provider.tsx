"use client";

import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import { MiniCart } from "@/components/cart/mini-cart";
import { cartStore, connectCartStorage } from "@/lib/cart/store";
import { checkoutStore, connectCheckoutStorage } from "@/lib/checkout/store";
import { connectOrdersStorage, ordersStore } from "@/lib/orders/store";
import type { CartLookup } from "@/lib/cart/types";

const LookupContext = createContext<CartLookup>({});

/** The catalog projection the cart renders and validates against (provided by the server layout). */
export const useCartLookup = (): CartLookup => useContext(LookupContext);

/**
 * Mounts the persistent client state once for the whole app (cart, checkout progress, orders): reads the stored cart into the store (in a layout effect, so it is loaded
 * before any click that happened during hydration is replayed), keeps storage in step, and renders the mini-cart.
 */
export function CartProvider({ lookup, children }: { lookup: CartLookup; children: ReactNode }) {
  useLayoutEffect(() => {
    const disconnect = [connectCartStorage(cartStore, lookup), connectCheckoutStorage(checkoutStore), connectOrdersStorage(ordersStore)];
    return () => disconnect.forEach((stop) => stop());
  }, [lookup]);
  return (
    <LookupContext.Provider value={lookup}>
      {children}
      <MiniCart />
    </LookupContext.Provider>
  );
}
