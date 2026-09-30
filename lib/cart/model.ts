import { getVariantAvailability } from "@/lib/catalog/variants";
import { lineTotalCents, type Cents } from "@/lib/pricing";
import { MIN_QUANTITY } from "@/lib/quantity";
import { resolvePurchase, type AddToCartRequest, type PurchaseFailure } from "@/lib/purchase";
import type { CartLine, CartLineView, CartLookup, CartProduct, CartVariant, LineIdentity, RecoveryReport } from "./types";

// The cart's pure logic: no React, no storage, no catalog import. The store (store.ts) wraps these functions.

export const lineKey = (line: LineIdentity): string => `${line.productId}/${line.variantId}`;
export const sameLine = (a: LineIdentity, b: LineIdentity): boolean => a.productId === b.productId && a.variantId === b.variantId;

/** Own-property lookup, so ids like "constructor" or "__proto__" from a corrupted store can never resolve. */
export function findProduct(lookup: CartLookup, productId: string): CartProduct | undefined {
  return Object.hasOwn(lookup, productId) ? lookup[productId] : undefined;
}

export function findVariant(lookup: CartLookup, identity: LineIdentity): { product: CartProduct; variant: CartVariant } | undefined {
  const product = findProduct(lookup, identity.productId);
  const variant = product?.variants.find((candidate) => candidate.id === identity.variantId);
  return product && variant ? { product, variant } : undefined;
}

export type AddOutcome =
  | { ok: true; lines: CartLine[]; quantity: number; capped: boolean }
  | { ok: false; reason: PurchaseFailure };

/**
 * Adds a validated request. The same product and variant merges into one line (quantities add up); the result is
 * limited to what can be ordered (at most 10, and never more than the stock), and `capped` says when it was.
 */
export function addToLines(lines: readonly CartLine[], request: AddToCartRequest, lookup: CartLookup): AddOutcome {
  const purchase = resolvePurchase(findProduct(lookup, request.productId), request.variantId, request.quantity);
  if (!purchase.ok) return { ok: false, reason: purchase.reason };
  const found = findVariant(lookup, request);
  if (!found) return { ok: false, reason: "unknown_variant" };
  const max = getVariantAvailability(found.variant).maxQuantity;

  const existing = lines.find((line) => sameLine(line, request));
  const wanted = (existing?.quantity ?? 0) + request.quantity;
  const quantity = Math.min(wanted, max);
  const capped = wanted > max;
  const next = existing
    ? lines.map((line) => (line === existing ? { ...line, quantity } : line))
    : [...lines, { productId: request.productId, variantId: request.variantId, quantity }];
  return { ok: true, lines: next, quantity, capped };
}

export type SetQuantityOutcome =
  | { ok: true; lines: CartLine[]; quantity: number; capped: boolean }
  | { ok: false; reason: "not_in_cart" | "unavailable" | "invalid_quantity" };

/** Sets a line's quantity. Fractions, zero and negatives are rejected (removal is a separate action); too large is capped. */
export function setLineQuantity(lines: readonly CartLine[], identity: LineIdentity, quantity: number, lookup: CartLookup): SetQuantityOutcome {
  const existing = lines.find((line) => sameLine(line, identity));
  if (!existing) return { ok: false, reason: "not_in_cart" };
  if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY) return { ok: false, reason: "invalid_quantity" };
  const found = findVariant(lookup, identity);
  if (!found) return { ok: false, reason: "unavailable" };
  const max = getVariantAvailability(found.variant).maxQuantity;
  if (max < MIN_QUANTITY) return { ok: false, reason: "unavailable" };
  const next = Math.min(quantity, max);
  return { ok: true, lines: lines.map((line) => (line === existing ? { ...line, quantity: next } : line)), quantity: next, capped: quantity > max };
}

/** The one slot Undo restores: the removed line exactly as it was, and where it sat in the list. */
export interface RemovedLine {
  line: CartLine;
  index: number;
}

export function removeFromLines(lines: readonly CartLine[], identity: LineIdentity): { lines: CartLine[]; removed: RemovedLine | null } {
  const index = lines.findIndex((line) => sameLine(line, identity));
  const line = lines[index];
  if (index < 0 || !line) return { lines: [...lines], removed: null };
  return { lines: lines.filter((_, position) => position !== index), removed: { line, index } };
}

/** Puts a removed line back at its old position with its exact quantity; merges if the same variant was re-added meanwhile. */
export function restoreLine(lines: readonly CartLine[], removed: RemovedLine, lookup: CartLookup): CartLine[] {
  const found = findVariant(lookup, removed.line);
  if (!found) return [...lines];
  const max = getVariantAvailability(found.variant).maxQuantity;
  if (max < MIN_QUANTITY) return [...lines];
  const existing = lines.find((line) => sameLine(line, removed.line));
  if (existing) {
    const quantity = Math.min(existing.quantity + removed.line.quantity, max);
    return lines.map((line) => (line === existing ? { ...line, quantity } : line));
  }
  const restored = { ...removed.line, quantity: Math.min(removed.line.quantity, max) };
  const next = [...lines];
  next.splice(Math.min(removed.index, next.length), 0, restored);
  return next;
}

/** Header badge and "N items": the total quantity across lines (2 + 4 is 6, not 2). */
export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Joins each line with its catalog data; a line whose product or variant no longer resolves is skipped. */
export function resolveLines(lines: readonly CartLine[], lookup: CartLookup): CartLineView[] {
  const views: CartLineView[] = [];
  for (const line of lines) {
    const found = findVariant(lookup, line);
    if (!found) continue;
    const { product, variant } = found;
    const availability = getVariantAvailability(variant);
    views.push({
      key: lineKey(line),
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      title: product.title,
      variantDimension: product.variantLabel,
      variantLabel: variant.label,
      showVariant: product.variants.length > 1,
      image: variant.image,
      swatch: variant.swatch,
      department: product.department,
      unitPriceCents: variant.priceCents,
      listPriceCents: variant.listPriceCents,
      lineTotalCents: lineTotalCents(variant.priceCents, line.quantity),
      availabilityLabel: availability.label,
      availabilityTone: availability.tone,
      maxQuantity: availability.maxQuantity,
    });
  }
  return views;
}

/** Cart subtotal in integer cents: the sum of line totals, each computed by lib/pricing. Zero for an empty cart. */
export function cartSubtotalCents(lines: readonly CartLine[], lookup: CartLookup): Cents {
  return resolveLines(lines, lookup).reduce((sum, view) => sum + view.lineTotalCents, 0);
}

/**
 * Turns untrusted stored data into valid lines. Entries that are not objects, have an unknown product or variant, an
 * unavailable variant or a non-integer / non-positive quantity are removed; a quantity above what is available is
 * reduced; duplicates of one product and variant are merged. The report says what happened.
 */
export function sanitizeLines(raw: unknown, lookup: CartLookup): { lines: CartLine[]; report: RecoveryReport } {
  const report: RecoveryReport = { unreadable: false, removed: 0, adjusted: 0 };
  if (!Array.isArray(raw)) return { lines: [], report: { ...report, unreadable: true } };

  let lines: CartLine[] = [];
  for (const entry of raw as unknown[]) {
    const candidate = entry as Partial<Record<keyof CartLine, unknown>> | null;
    if (
      !candidate ||
      typeof candidate !== "object" ||
      typeof candidate.productId !== "string" ||
      typeof candidate.variantId !== "string" ||
      typeof candidate.quantity !== "number" ||
      !Number.isInteger(candidate.quantity) ||
      candidate.quantity < MIN_QUANTITY
    ) {
      report.removed += 1;
      continue;
    }
    const request: AddToCartRequest = { productId: candidate.productId, variantId: candidate.variantId, quantity: candidate.quantity };
    const found = findVariant(lookup, request);
    const max = found ? getVariantAvailability(found.variant).maxQuantity : 0;
    if (!found || max < MIN_QUANTITY) {
      report.removed += 1;
      continue;
    }
    const quantity = Math.min(request.quantity, max);
    if (quantity < request.quantity) report.adjusted += 1;
    const existing = lines.find((line) => sameLine(line, request));
    if (existing) {
      const merged = Math.min(existing.quantity + quantity, max);
      lines = lines.map((line) => (line === existing ? { ...line, quantity: merged } : line));
    } else {
      lines.push({ productId: request.productId, variantId: request.variantId, quantity });
    }
  }
  return { lines, report };
}

/** The shopper-facing sentence for a recovery, or null when nothing needed recovering. */
export function recoveryMessage(report: RecoveryReport): string | null {
  const parts: string[] = [];
  if (report.unreadable) parts.push("Your saved cart could not be read, so it was reset.");
  if (report.removed > 0) {
    parts.push(report.removed === 1 ? "1 item is no longer available and was removed from your cart." : `${report.removed} items are no longer available and were removed from your cart.`);
  }
  if (report.adjusted > 0) parts.push("Some quantities were reduced to what is available.");
  return parts.length > 0 ? parts.join(" ") : null;
}
