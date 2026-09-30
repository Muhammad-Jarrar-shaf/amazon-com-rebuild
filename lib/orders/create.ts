import { validateAddress } from "@/lib/checkout/address";
import { estimatedArrival, getDeliveryOption, isDeliveryId } from "@/lib/checkout/delivery";
import { isPaymentSummary } from "@/lib/checkout/state";
import type { CheckoutState } from "@/lib/checkout/types";
import { findProduct, resolveLines } from "@/lib/cart/model";
import type { CartLine, CartLookup } from "@/lib/cart/types";
import { orderTotals } from "@/lib/pricing";
import { resolvePurchase } from "@/lib/purchase";
import type { Order, OrdersData, OrderItem } from "./types";

export type OrderFailure = "empty_cart" | "invalid_cart" | "invalid_address" | "missing_delivery" | "missing_payment";

export const ORDER_FAILURE_MESSAGES: Record<OrderFailure, string> = {
  empty_cart: "Your cart is empty, so there is nothing to order.",
  invalid_cart: "Something in your cart is no longer available. Review your cart and try again.",
  invalid_address: "Your shipping address is incomplete. Go back to the Address step.",
  missing_delivery: "Choose a delivery option before placing your order.",
  missing_payment: "Add your payment details before placing your order.",
};

export type CreateOrderResult =
  | { ok: true; order: Order; created: boolean; data: OrdersData }
  | { ok: false; reason: OrderFailure };

const pad = (value: number, width: number): string => String(value).padStart(width, "0");

/** "111-NNNNNNN-NNNNNNN": deterministic in the sequence number (FR-ORD-2), unique for the first ten million orders. */
export function formatOrderId(seq: number): string {
  return `111-${pad(1_000_000 + seq, 7)}-${pad((seq * 7_654_321 + 1_234_567) % 10_000_000, 7)}`;
}

export interface CreateOrderInput {
  lines: readonly CartLine[];
  lookup: CartLookup;
  checkout: CheckoutState;
  now: Date;
  data: OrdersData;
}

/**
 * Creates the order from authoritative data: the cart's ids and quantities are re-validated and re-priced from the
 * catalog projection, and the totals come from lib/pricing (nothing displayed earlier is trusted). Idempotent per
 * submission: a second call for the same `submissionId` returns the existing order and creates nothing.
 */
export function createOrder({ lines, lookup, checkout, now, data }: CreateOrderInput): CreateOrderResult {
  const existing = data.orders.find((order) => order.submissionId === checkout.submissionId);
  if (existing) return { ok: true, order: existing, created: false, data };

  if (lines.length === 0) return { ok: false, reason: "empty_cart" };
  const views = resolveLines(lines, lookup);
  const purchasable = lines.every((line) => resolvePurchase(findProduct(lookup, line.productId), line.variantId, line.quantity).ok);
  if (views.length !== lines.length || !purchasable) return { ok: false, reason: "invalid_cart" };

  const address = validateAddress(checkout.address);
  if (!address.ok) return { ok: false, reason: "invalid_address" };
  if (!isDeliveryId(checkout.deliveryId)) return { ok: false, reason: "missing_delivery" };
  if (!isPaymentSummary(checkout.payment)) return { ok: false, reason: "missing_payment" };

  const option = getDeliveryOption(checkout.deliveryId);
  const items: OrderItem[] = views.map((view) => ({
    productId: view.productId,
    variantId: view.variantId,
    title: view.title,
    variantText: view.showVariant ? `${view.variantDimension}: ${view.variantLabel}` : null,
    quantity: view.quantity,
    unitPriceCents: view.unitPriceCents,
    lineTotalCents: view.lineTotalCents,
  }));
  const totals = orderTotals(
    items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    option.priceCents,
  );

  const seq = data.seq + 1;
  const { fullName, street, city, state, zip } = address.address;
  const order: Order = {
    id: formatOrderId(seq),
    submissionId: checkout.submissionId,
    createdAt: now.toISOString(),
    status: "confirmed",
    items,
    ...totals,
    delivery: { id: option.id, label: option.label, estimatedArrivalIso: estimatedArrival(option, now).toISOString() },
    shipTo: { fullName, street, city, state, zip },
    payment: { brand: checkout.payment.brand, last4: checkout.payment.last4 },
  };
  return { ok: true, order, created: true, data: { seq, orders: [...data.orders, order] } };
}
