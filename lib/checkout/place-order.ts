import type { StoreApi } from "zustand";
import type { CartStore } from "@/lib/cart/store";
import type { CartLookup } from "@/lib/cart/types";
import { createOrder, type OrderFailure } from "@/lib/orders/create";
import type { OrdersStore } from "@/lib/orders/store";
import type { CheckoutStore } from "./store";

export type PlaceOrderResult = { ok: true; orderId: string; created: boolean } | { ok: false; reason: OrderFailure };

/**
 * Places the order. Order matters for safety: the order is written first (idempotent per submission id), and only
 * then are the cart and the checkout state cleared, so a failure part-way can never lose the shopper's cart and a
 * repeated call returns the same order instead of creating another.
 */
export function placeOrder(stores: { cart: StoreApi<CartStore>; orders: StoreApi<OrdersStore>; checkout: StoreApi<CheckoutStore> }, lookup: CartLookup, now: Date): PlaceOrderResult {
  const { lines } = stores.cart.getState();
  const { state } = stores.checkout.getState();
  const result = stores.orders.getState().place((data) => createOrder({ lines, lookup, checkout: state, now, data }));
  if (!result.ok) return { ok: false, reason: result.reason };
  stores.cart.getState().clear();
  stores.checkout.getState().reset();
  return { ok: true, orderId: result.order.id, created: result.created };
}
