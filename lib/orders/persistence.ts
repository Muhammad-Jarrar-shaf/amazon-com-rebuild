import { isDeliveryId } from "@/lib/checkout/delivery";
import { isPaymentSummary } from "@/lib/checkout/state";
import type { CartStorage } from "@/lib/cart/persistence";
import type { Order, OrderItem, OrdersData } from "./types";

export const ORDERS_STORAGE_KEY = "orders:v1";
export const ORDERS_SCHEMA_VERSION = 1;

export const EMPTY_ORDERS: OrdersData = { seq: 0, orders: [] };

export function serializeOrders(data: OrdersData): string {
  return JSON.stringify({ version: ORDERS_SCHEMA_VERSION, seq: data.seq, orders: data.orders });
}

const isCents = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isText = (value: unknown, max = 300): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const isIso = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(new Date(value).getTime());

function isItem(value: unknown): value is OrderItem {
  const item = value as Partial<OrderItem> | null;
  return (
    !!item &&
    typeof item === "object" &&
    isText(item.productId) &&
    isText(item.variantId) &&
    isText(item.title, 400) &&
    (item.variantText === null || isText(item.variantText)) &&
    Number.isSafeInteger(item.quantity) &&
    (item.quantity as number) >= 1 &&
    isCents(item.unitPriceCents) &&
    isCents(item.lineTotalCents) &&
    item.lineTotalCents === item.unitPriceCents * (item.quantity as number)
  );
}

/** A stored order is kept only if it is structurally valid and its money is internally consistent. */
export function isOrder(value: unknown): value is Order {
  const order = value as Partial<Order> | null;
  if (!order || typeof order !== "object") return false;
  if (!isText(order.id, 40) || !isText(order.submissionId, 64) || !isIso(order.createdAt) || order.status !== "confirmed") return false;
  if (!Array.isArray(order.items) || order.items.length === 0 || !order.items.every(isItem)) return false;
  if (!isCents(order.subtotalCents) || !isCents(order.shippingCents) || !isCents(order.taxCents) || !isCents(order.totalCents)) return false;
  if (order.subtotalCents !== order.items.reduce((sum, item) => sum + item.lineTotalCents, 0)) return false;
  if (order.totalCents !== order.subtotalCents + order.shippingCents + order.taxCents) return false;
  const delivery = order.delivery;
  if (!delivery || !isDeliveryId(delivery.id) || !isText(delivery.label) || !isIso(delivery.estimatedArrivalIso)) return false;
  const ship = order.shipTo;
  if (!ship || ![ship.fullName, ship.street, ship.city, ship.state, ship.zip].every((part) => isText(part, 200))) return false;
  return isPaymentSummary(order.payment);
}

export interface ParsedOrders {
  data: OrdersData;
  /** Orders dropped as invalid, or the whole store as unreadable; drives a shopper-visible notice. */
  dropped: number;
  unreadable: boolean;
}

/** Never throws. Unreadable data resets to no orders; invalid orders are dropped one by one; duplicate ids/submissions are dropped. */
export function parseStoredOrders(raw: string | null): ParsedOrders {
  if (raw === null) return { data: { ...EMPTY_ORDERS }, dropped: 0, unreadable: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { data: { ...EMPTY_ORDERS }, dropped: 0, unreadable: true };
  }
  const record = data as { version?: unknown; seq?: unknown; orders?: unknown } | null;
  if (!record || typeof record !== "object" || record.version !== ORDERS_SCHEMA_VERSION || !Array.isArray(record.orders)) {
    return { data: { ...EMPTY_ORDERS }, dropped: 0, unreadable: true };
  }
  const orders: Order[] = [];
  let dropped = 0;
  for (const candidate of record.orders as unknown[]) {
    const duplicate = isOrder(candidate) && orders.some((known) => known.id === candidate.id || known.submissionId === candidate.submissionId);
    if (isOrder(candidate) && !duplicate) orders.push(candidate);
    else dropped += 1;
  }
  const storedSeq = typeof record.seq === "number" && Number.isSafeInteger(record.seq) && record.seq >= 0 ? record.seq : 0;
  // The sequence never goes backwards, so a new order number is never reused.
  return { data: { seq: Math.max(storedSeq, orders.length), orders }, dropped, unreadable: false };
}

export function readStoredOrders(storage: CartStorage | null): string | null {
  try {
    return storage ? storage.getItem(ORDERS_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

export function writeStoredOrders(storage: CartStorage | null, data: OrdersData): boolean {
  try {
    if (!storage) return false;
    storage.setItem(ORDERS_STORAGE_KEY, serializeOrders(data));
    return true;
  } catch {
    return false;
  }
}

export function ordersNotice(parsed: ParsedOrders): string | null {
  if (parsed.unreadable) return "Your saved orders could not be read, so the list was reset.";
  if (parsed.dropped > 0) return parsed.dropped === 1 ? "1 saved order was damaged and was removed." : `${parsed.dropped} saved orders were damaged and were removed.`;
  return null;
}
