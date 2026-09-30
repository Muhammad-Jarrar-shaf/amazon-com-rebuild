import { EMPTY_ADDRESS, isAddressValid } from "./address";
import { isDeliveryId } from "./delivery";
import { CHECKOUT_STEPS, type AddressFields, type CheckoutState, type CheckoutStep, type PaymentSummary } from "./types";

// The checkout state model: one typed state, pure transitions and guards. No React, no storage.

export function initialCheckoutState(submissionId: string): CheckoutState {
  return { address: { ...EMPTY_ADDRESS }, deliveryId: null, payment: null, submissionId };
}

export const isPaymentSummary = (value: unknown): value is PaymentSummary => {
  const candidate = value as Partial<PaymentSummary> | null;
  return (
    !!candidate &&
    typeof candidate === "object" &&
    typeof candidate.brand === "string" &&
    candidate.brand.length > 0 &&
    candidate.brand.length <= 20 &&
    typeof candidate.last4 === "string" &&
    /^\d{4}$/.test(candidate.last4)
  );
};

export function isStepComplete(state: CheckoutState, step: CheckoutStep): boolean {
  switch (step) {
    case "address":
      return isAddressValid(state.address);
    case "delivery":
      return isDeliveryId(state.deliveryId);
    case "payment":
      return isPaymentSummary(state.payment);
    case "review":
      return false; // Review is the last step: it is "completed" by placing the order.
  }
}

/** The earliest step that still needs input; "review" when everything before it is done. */
export function firstIncompleteStep(state: CheckoutState): CheckoutStep {
  return CHECKOUT_STEPS.find((step) => step !== "review" && !isStepComplete(state, step)) ?? "review";
}

/** A step can be opened only when every step before it is complete, so direct URLs cannot skip ahead. */
export function canEnterStep(state: CheckoutState, step: CheckoutStep): boolean {
  const target = CHECKOUT_STEPS.indexOf(step);
  return CHECKOUT_STEPS.slice(0, target).every((earlier) => isStepComplete(state, earlier));
}

export function parseStep(raw: string | null | undefined): CheckoutStep | null {
  return CHECKOUT_STEPS.find((step) => step === raw) ?? null;
}

export function nextStep(step: CheckoutStep): CheckoutStep {
  const next = CHECKOUT_STEPS[CHECKOUT_STEPS.indexOf(step) + 1];
  return next ?? step;
}

export const stepHref = (step: CheckoutStep): string => `/checkout?step=${step}`;

/** Why a step was refused, in words the shopper can act on. */
export function missingStepMessage(state: CheckoutState, requested: CheckoutStep): string {
  const missing = firstIncompleteStep(state);
  const what = { address: "your shipping address", delivery: "a delivery option", payment: "your payment details", review: "" }[missing];
  return requested === missing ? "" : `Please add ${what} before continuing.`;
}

export function withAddress(state: CheckoutState, address: AddressFields): CheckoutState {
  return { ...state, address };
}
