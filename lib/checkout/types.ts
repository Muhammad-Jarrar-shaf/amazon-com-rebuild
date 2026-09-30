export const CHECKOUT_STEPS = ["address", "delivery", "payment", "review"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const STEP_LABELS: Record<CheckoutStep, string> = {
  address: "Address",
  delivery: "Delivery",
  payment: "Payment",
  review: "Review",
};

/** The address as typed (strings). Completeness is derived by validating it, never stored as a flag. */
export interface AddressFields {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export type DeliveryId = "standard" | "expedited" | "one-day";

/** All that is ever kept of a payment: brand and last four digits. The number and CVC are never stored. */
export interface PaymentSummary {
  brand: string;
  last4: string;
}

/** The one checkout state: what the shopper has entered so far, persisted so a reload keeps the progress. */
export interface CheckoutState {
  address: AddressFields;
  deliveryId: DeliveryId | null;
  payment: PaymentSummary | null;
  /** One per checkout attempt; the order is created at most once for it (idempotency). */
  submissionId: string;
}
