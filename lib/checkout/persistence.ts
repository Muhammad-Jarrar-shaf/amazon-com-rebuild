import { EMPTY_ADDRESS } from "./address";
import { isDeliveryId } from "./delivery";
import { initialCheckoutState, isPaymentSummary } from "./state";
import type { AddressFields, CheckoutState } from "./types";

/** The number is the schema version; a shape change uses a new key. Only ids/text the shopper typed and last-4 are stored. */
export const CHECKOUT_STORAGE_KEY = "checkout:v1";
export const CHECKOUT_SCHEMA_VERSION = 1;

/** Serializes the state. The card number and CVC never reach this function (they are not part of CheckoutState). */
export function serializeCheckout(state: CheckoutState): string {
  return JSON.stringify({ version: CHECKOUT_SCHEMA_VERSION, ...state });
}

export interface ParsedCheckout {
  state: CheckoutState;
  /** True when stored data existed but could not be used (corrupt, wrong version, wrong shape). */
  recovered: boolean;
}

const text = (value: unknown, max: number): string => (typeof value === "string" ? value.slice(0, max) : "");

/** Never throws. Anything unusable becomes a fresh state with a new submission id; a usable-but-partial state is kept field by field. */
export function parseStoredCheckout(raw: string | null, newSubmissionId: () => string): ParsedCheckout {
  const fresh = (recovered: boolean): ParsedCheckout => ({ state: initialCheckoutState(newSubmissionId()), recovered });
  if (raw === null) return fresh(false);
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fresh(true);
  }
  const record = data as Record<string, unknown> | null;
  if (!record || typeof record !== "object" || Array.isArray(record) || record.version !== CHECKOUT_SCHEMA_VERSION) return fresh(true);

  const stored = (record.address ?? {}) as Partial<Record<keyof AddressFields, unknown>>;
  const address: AddressFields = {
    fullName: text(stored.fullName, 120),
    street: text(stored.street, 160),
    city: text(stored.city, 80),
    state: text(stored.state, 2),
    zip: text(stored.zip, 10),
    phone: text(stored.phone, 30),
  };
  const submissionId = typeof record.submissionId === "string" && /^[\w-]{8,64}$/.test(record.submissionId) ? record.submissionId : newSubmissionId();
  return {
    state: {
      address: { ...EMPTY_ADDRESS, ...address },
      deliveryId: isDeliveryId(record.deliveryId) ? record.deliveryId : null,
      payment: isPaymentSummary(record.payment) ? { brand: record.payment.brand, last4: record.payment.last4 } : null,
      submissionId,
    },
    recovered: false,
  };
}
