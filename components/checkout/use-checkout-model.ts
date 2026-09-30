"use client";

import { useMemo } from "react";
import { useCartView } from "@/components/cart/use-cart-view";
import { getDeliveryOption, isDeliveryId } from "@/lib/checkout/delivery";
import { useCheckout } from "@/lib/checkout/store";
import { orderTotals } from "@/lib/pricing";

/** The checkout as the UI sees it: live cart lines, checkout state and the totals derived from them (lib/pricing). */
export function useCheckoutModel() {
  const cart = useCartView();
  const state = useCheckout((current) => current.state);
  const checkoutHydrated = useCheckout((current) => current.hydrated);
  return useMemo(() => {
    const option = isDeliveryId(state.deliveryId) ? getDeliveryOption(state.deliveryId) : null;
    return {
      ready: cart.hydrated && checkoutHydrated,
      cart,
      state,
      option,
      totals: orderTotals(cart.subtotalCents, option?.priceCents ?? 0),
    };
  }, [cart, state, checkoutHydrated]);
}
