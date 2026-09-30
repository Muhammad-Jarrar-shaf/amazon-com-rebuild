import { addBusinessDays, formatDeliveryDate } from "@/lib/delivery";
import type { Cents } from "@/lib/pricing";
import type { DeliveryId } from "./types";

export interface DeliveryOption {
  id: DeliveryId;
  label: string;
  priceCents: Cents;
  businessDays: number;
}

// Our own mock delivery choices (docs/requirements.md FR-CHK-3): fixed prices and speeds, not Amazon's.
export const DELIVERY_OPTIONS: readonly DeliveryOption[] = [
  { id: "standard", label: "Standard delivery", priceCents: 0, businessDays: 5 },
  { id: "expedited", label: "Expedited delivery", priceCents: 999, businessDays: 2 },
  { id: "one-day", label: "One-day delivery", priceCents: 1999, businessDays: 1 },
];

export const DEFAULT_DELIVERY: DeliveryId = "standard";

export function isDeliveryId(value: unknown): value is DeliveryId {
  return DELIVERY_OPTIONS.some((option) => option.id === value);
}

export function getDeliveryOption(id: DeliveryId): DeliveryOption {
  const option = DELIVERY_OPTIONS.find((candidate) => candidate.id === id);
  if (!option) throw new RangeError(`unknown delivery option ${String(id)}`);
  return option;
}

/** The estimated arrival, from the injected clock (the caller passes `now`), so it is deterministic in tests. */
export function estimatedArrival(option: DeliveryOption, now: Date): Date {
  return addBusinessDays(now, option.businessDays);
}

export const arrivalLabel = (option: DeliveryOption, now: Date): string => formatDeliveryDate(estimatedArrival(option, now));
