import { maxQuantityFor } from "@/lib/quantity";

export type AvailabilityKind = "in_stock" | "low_stock" | "out_of_stock" | "unavailable_to_ship";

/** At or below this many units the product page says "Only N left". */
export const LOW_STOCK_THRESHOLD = 5;

export interface Availability {
  kind: AvailabilityKind;
  label: string;
  purchasable: boolean;
  /** Largest orderable quantity (0 when not purchasable). */
  maxQuantity: number;
  tone: "positive" | "warning" | "negative";
}

/**
 * The single rule for what a shopper can do with a variant. The state is derived from stock and the shipping
 * flag (never stored separately), so data cannot contradict itself.
 */
export function getAvailability(stock: number, shippingRestricted = false): Availability {
  if (shippingRestricted) {
    return {
      kind: "unavailable_to_ship",
      label: "This item cannot be shipped to your selected delivery location.",
      purchasable: false,
      maxQuantity: 0,
      tone: "negative",
    };
  }
  const units = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  if (units === 0) {
    return { kind: "out_of_stock", label: "Currently unavailable.", purchasable: false, maxQuantity: 0, tone: "negative" };
  }
  if (units <= LOW_STOCK_THRESHOLD) {
    return {
      kind: "low_stock",
      label: `Only ${units} left in stock - order soon.`,
      purchasable: true,
      maxQuantity: maxQuantityFor(units),
      tone: "warning",
    };
  }
  return { kind: "in_stock", label: "In Stock", purchasable: true, maxQuantity: maxQuantityFor(units), tone: "positive" };
}
