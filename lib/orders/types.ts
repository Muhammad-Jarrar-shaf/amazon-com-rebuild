import type { DeliveryId, PaymentSummary } from "@/lib/checkout/types";
import type { Cents } from "@/lib/pricing";

/** A line as it was ordered: a snapshot, so the order stays true even if the catalog changes later. */
export interface OrderItem {
  productId: string;
  variantId: string;
  title: string;
  /** "Color: Space Silver", or null for a single-variant product. */
  variantText: string | null;
  quantity: number;
  unitPriceCents: Cents;
  lineTotalCents: Cents;
}

/** The order (mock, client-side only). No card number, CVC or phone number is kept. */
export interface Order {
  /** "111-NNNNNNN-NNNNNNN", derived from the per-browser sequence. */
  id: string;
  /** The checkout attempt that created it; at most one order exists per submission. */
  submissionId: string;
  /** ISO timestamp from the injectable clock. */
  createdAt: string;
  status: "confirmed";
  items: OrderItem[];
  subtotalCents: Cents;
  shippingCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
  delivery: { id: DeliveryId; label: string; estimatedArrivalIso: string };
  shipTo: { fullName: string; street: string; city: string; state: string; zip: string };
  payment: PaymentSummary;
}

export interface OrdersData {
  /** Number of orders ever placed in this browser; the next order number derives from it. */
  seq: number;
  orders: Order[];
}
