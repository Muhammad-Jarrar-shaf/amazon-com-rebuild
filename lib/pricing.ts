// All money in the app is integer cents. This module is the only place that formats or derives prices,
// so no component does its own arithmetic and nothing uses floating-point money.

export type Cents = number;

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function assertCents(value: number, name = "amount"): asserts value is Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer number of cents, got ${String(value)}`);
  }
}

/** "$1,234.56": built from integer parts, never from a float division. */
export function formatMoney(cents: Cents): string {
  const { symbol, whole: dollars, fraction } = splitMoney(cents);
  return `${symbol}${dollars}.${fraction}`;
}

/** Parts for the large-dollars, small-cents price display. */
export function splitMoney(cents: Cents): { symbol: string; whole: string; fraction: string } {
  assertCents(cents);
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return { symbol: "$", whole: whole.format(dollars), fraction: String(remainder).padStart(2, "0") };
}

/** A discount exists only when the compare-at price is strictly above the selling price. */
export function hasDiscount(priceCents: Cents, listPriceCents: Cents | undefined): listPriceCents is Cents {
  if (listPriceCents === undefined) return false;
  assertCents(priceCents, "price");
  assertCents(listPriceCents, "list price");
  return listPriceCents > priceCents;
}

export function savingsCents(priceCents: Cents, listPriceCents: Cents | undefined): Cents {
  return hasDiscount(priceCents, listPriceCents) ? listPriceCents - priceCents : 0;
}

/** Whole-number discount percent, derived (never stored) and rounded half up in integer math. 0 when there is no discount. */
export function discountPercent(priceCents: Cents, listPriceCents: Cents | undefined): number {
  if (!hasDiscount(priceCents, listPriceCents)) return 0;
  const savings = listPriceCents - priceCents;
  return Math.floor((savings * 200 + listPriceCents) / (2 * listPriceCents));
}

export function lineTotalCents(unitPriceCents: Cents, quantity: number): Cents {
  assertCents(unitPriceCents, "unit price");
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError(`quantity must be a positive integer, got ${String(quantity)}`);
  }
  const total = unitPriceCents * quantity;
  assertCents(total, "line total");
  return total;
}
