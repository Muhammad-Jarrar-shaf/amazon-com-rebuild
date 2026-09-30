export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 10;

/** Largest quantity that can be ordered for a given stock level (0 when nothing can be ordered). */
export function maxQuantityFor(stock: number): number {
  if (!Number.isFinite(stock) || stock <= 0) return 0;
  return Math.min(MAX_QUANTITY, Math.floor(stock));
}

/** Clamps to [MIN_QUANTITY, max]. Non-numeric input becomes the minimum. */
export function clampQuantity(value: number, max: number = MAX_QUANTITY): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY;
  const upper = Math.max(MIN_QUANTITY, Math.floor(max));
  return Math.min(upper, Math.max(MIN_QUANTITY, Math.floor(value)));
}

export function stepQuantity(current: number, delta: 1 | -1, max: number = MAX_QUANTITY): number {
  return clampQuantity(current + delta, max);
}

/** Parses typed input ("7", " 07 ") into a whole number; anything else is null. */
export function parseQuantityInput(raw: string): number | null {
  const trimmed = raw.trim();
  return /^\d{1,3}$/.test(trimmed) ? Number(trimmed) : null;
}

export const isValidQuantity = (value: number, max: number = MAX_QUANTITY): boolean =>
  Number.isInteger(value) && value >= MIN_QUANTITY && value <= max;
