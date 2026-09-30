import { formatMoney, type Cents } from "@/lib/pricing";

const dateFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Adds business days (Mon-Fri) in UTC, so the result never depends on the server's time zone. */
export function addBusinessDays(from: Date, businessDays: number): Date {
  if (!Number.isInteger(businessDays) || businessDays < 0) {
    throw new RangeError(`businessDays must be a non-negative integer, got ${String(businessDays)}`);
  }
  const result = new Date(from.getTime());
  let remaining = businessDays;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

export function formatDeliveryDate(date: Date): string {
  return dateFormat.format(date);
}

export interface DeliveryEstimate {
  /** "FREE delivery" or "$4.99 delivery". */
  prefix: string;
  /** "Thursday, October 8". */
  date: string;
}

export function estimateDelivery(from: Date, businessDays: number, shippingCents: Cents): DeliveryEstimate {
  return {
    prefix: shippingCents === 0 ? "FREE delivery" : `${formatMoney(shippingCents)} delivery`,
    date: formatDeliveryDate(addBusinessDays(from, businessDays)),
  };
}
