import { describe, expect, it } from "vitest";
import { LOOKUP } from "@/lib/cart/fixtures";
import { createCartStore } from "@/lib/cart/store";
import { placeOrder } from "@/lib/checkout/place-order";
import { createCheckoutStore } from "@/lib/checkout/store";
import type { AddressFields, CheckoutState } from "@/lib/checkout/types";
import { createOrder, formatOrderId } from "./create";
import { EMPTY_ORDERS, ORDERS_STORAGE_KEY, isOrder, parseStoredOrders, serializeOrders } from "./persistence";
import { connectOrdersStorage, createOrdersStore } from "./store";
import type { CartStorage } from "@/lib/cart/persistence";
import type { CartLine } from "@/lib/cart/types";

const NOW = new Date("2026-10-01T12:00:00Z");
const address: AddressFields = { fullName: "Ada Lovelace", street: "12 Analytical Way", city: "Seattle", state: "WA", zip: "98101", phone: "(206) 555-0142" };
const checkout = (overrides: Partial<CheckoutState> = {}): CheckoutState => ({
  address,
  deliveryId: "expedited",
  payment: { brand: "Visa", last4: "4242" },
  submissionId: "sub-aaaaaaaa",
  ...overrides,
});
const lines: CartLine[] = [
  { productId: "headphones", variantId: "black", quantity: 2 },
  { productId: "mug", variantId: "one", quantity: 1 },
];

function memoryStorage(initial: Record<string, string> = {}): CartStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k]! : null), setItem: (k, v) => void (data[k] = v) };
}

describe("formatOrderId", () => {
  it("has the 111-NNNNNNN-NNNNNNN shape, is deterministic and unique across a sequence", () => {
    expect(formatOrderId(1)).toMatch(/^111-\d{7}-\d{7}$/);
    expect(formatOrderId(1)).toBe(formatOrderId(1));
    const ids = new Set(Array.from({ length: 5000 }, (_, i) => formatOrderId(i + 1)));
    expect(ids.size).toBe(5000);
  });
});

describe("createOrder", () => {
  it("recomputes items and totals from authoritative data", () => {
    const result = createOrder({ lines, lookup: LOOKUP, checkout: checkout(), now: NOW, data: EMPTY_ORDERS });
    if (!result.ok) throw new Error(result.reason);
    // 2 x 79.99 + 12.99 = 172.97; expedited 9.99; tax 8% of 172.97 = 13.84 (13.8376)
    expect(result.order).toMatchObject({
      status: "confirmed",
      subtotalCents: 17297,
      shippingCents: 999,
      taxCents: 1384,
      totalCents: 19680,
      createdAt: "2026-10-01T12:00:00.000Z",
      delivery: { id: "expedited", label: "Expedited delivery", estimatedArrivalIso: "2026-10-05T12:00:00.000Z" },
      payment: { brand: "Visa", last4: "4242" },
      shipTo: { fullName: "Ada Lovelace", city: "Seattle", state: "WA", zip: "98101" },
    });
    expect(result.order.items).toEqual([
      { productId: "headphones", variantId: "black", title: "Halo Wireless Headphones", variantText: "Color: Black", quantity: 2, unitPriceCents: 7999, lineTotalCents: 15998 },
      { productId: "mug", variantId: "one", title: "Ceramic Mug", variantText: null, quantity: 1, unitPriceCents: 1299, lineTotalCents: 1299 },
    ]);
    expect(result.data).toEqual({ seq: 1, orders: [result.order] });
    expect(result.created).toBe(true);
  });

  it("stores no phone, card number or CVC", () => {
    const result = createOrder({ lines, lookup: LOOKUP, checkout: checkout(), now: NOW, data: EMPTY_ORDERS });
    const json = JSON.stringify(result);
    expect(json).not.toContain("555-0142");
    expect(json).not.toContain("cvc");
  });

  it("is idempotent per submission: the same submission returns the same order and creates nothing", () => {
    const first = createOrder({ lines, lookup: LOOKUP, checkout: checkout(), now: NOW, data: EMPTY_ORDERS });
    if (!first.ok) throw new Error();
    const again = createOrder({ lines, lookup: LOOKUP, checkout: checkout(), now: NOW, data: first.data });
    expect(again).toMatchObject({ ok: true, created: false });
    if (again.ok) {
      expect(again.order.id).toBe(first.order.id);
      expect(again.data.orders).toHaveLength(1);
    }
    // ... even when the cart was already cleared by the first attempt.
    expect(createOrder({ lines: [], lookup: LOOKUP, checkout: checkout(), now: NOW, data: first.data })).toMatchObject({ ok: true, created: false });
  });

  it("a new submission gets the next sequence number", () => {
    const first = createOrder({ lines, lookup: LOOKUP, checkout: checkout(), now: NOW, data: EMPTY_ORDERS });
    if (!first.ok) throw new Error();
    const second = createOrder({ lines, lookup: LOOKUP, checkout: checkout({ submissionId: "sub-bbbbbbbb" }), now: NOW, data: first.data });
    if (!second.ok) throw new Error();
    expect(second.data.seq).toBe(2);
    expect(second.order.id).not.toBe(first.order.id);
  });

  it.each([
    ["an empty cart", { lines: [] as CartLine[] }, "empty_cart"],
    ["a vanished product", { lines: [{ productId: "ghost", variantId: "x", quantity: 1 }] }, "invalid_cart"],
    ["an unavailable variant", { lines: [{ productId: "headphones", variantId: "red", quantity: 1 }] }, "invalid_cart"],
    ["a quantity above the stock", { lines: [{ productId: "headphones", variantId: "blue", quantity: 5 }] }, "invalid_cart"],
    ["an invalid address", { checkout: checkout({ address: { ...address, zip: "1" } }) }, "invalid_address"],
    ["no delivery choice", { checkout: checkout({ deliveryId: null }) }, "missing_delivery"],
    ["no payment", { checkout: checkout({ payment: null }) }, "missing_payment"],
  ])("refuses %s and creates nothing", (_name, override, reason) => {
    const input = { lines, lookup: LOOKUP, checkout: checkout(), now: NOW, data: EMPTY_ORDERS, ...override };
    expect(createOrder(input)).toEqual({ ok: false, reason });
  });
});

describe("orders persistence", () => {
  const order = () => {
    const result = createOrder({ lines, lookup: LOOKUP, checkout: checkout(), now: NOW, data: EMPTY_ORDERS });
    if (!result.ok) throw new Error();
    return result.order;
  };

  it("round-trips", () => {
    const data = { seq: 1, orders: [order()] };
    expect(parseStoredOrders(serializeOrders(data))).toEqual({ data, dropped: 0, unreadable: false });
  });

  it("treats nothing stored as no orders", () => {
    expect(parseStoredOrders(null)).toEqual({ data: EMPTY_ORDERS, dropped: 0, unreadable: false });
  });

  it.each([["{nope"], ["null"], ["[]"], ['{"version":2,"orders":[]}'], ['{"version":1}']])("recovers from unreadable %s", (raw) => {
    expect(parseStoredOrders(raw)).toMatchObject({ data: { seq: 0, orders: [] }, unreadable: true });
  });

  it("drops damaged and inconsistent orders one by one", () => {
    const good = order();
    const tampered = { ...good, id: "111-0000000-0000000", submissionId: "sub-other000", totalCents: 1 };
    const missing = { ...good, id: "111-0000001-0000001", submissionId: "sub-other001", shipTo: undefined };
    const raw = JSON.stringify({ version: 1, seq: 3, orders: [good, tampered, missing, 7, null] });
    const parsed = parseStoredOrders(raw);
    expect(parsed.data.orders).toEqual([good]);
    expect(parsed.dropped).toBe(4);
    expect(parsed.data.seq).toBe(3);
  });

  it("drops duplicate order ids and submissions", () => {
    const good = order();
    expect(parseStoredOrders(JSON.stringify({ version: 1, seq: 1, orders: [good, good] })).data.orders).toHaveLength(1);
  });

  it("validates order shape", () => {
    expect(isOrder(order())).toBe(true);
    expect(isOrder({ ...order(), items: [] })).toBe(false);
    expect(isOrder({ ...order(), status: "shipped" })).toBe(false);
  });
});

describe("placeOrder (the whole idempotent operation)", () => {
  function setup(storage = memoryStorage()) {
    const cart = createCartStore();
    cart.getState().hydrate(null, LOOKUP);
    cart.getState().add({ productId: "headphones", variantId: "black", quantity: 2 }, LOOKUP);
    let n = 0;
    const checkoutStore = createCheckoutStore(() => `sub-0000000${++n}`);
    checkoutStore.getState().hydrate(null);
    checkoutStore.getState().setAddress(address);
    checkoutStore.getState().setDelivery("standard");
    checkoutStore.getState().setPayment({ brand: "Visa", last4: "4242" });
    const orders = createOrdersStore();
    connectOrdersStorage(orders, storage);
    return { cart, checkout: checkoutStore, orders, storage };
  }

  it("creates one order, persists it, then clears the cart and starts a new checkout attempt", () => {
    const stores = setup();
    const before = stores.checkout.getState().state.submissionId;
    const result = placeOrder(stores, LOOKUP, NOW);
    expect(result).toMatchObject({ ok: true, created: true });
    expect(stores.orders.getState().data.orders).toHaveLength(1);
    expect(JSON.parse(stores.storage.data[ORDERS_STORAGE_KEY]!).orders).toHaveLength(1);
    expect(stores.cart.getState().lines).toEqual([]);
    expect(stores.checkout.getState().state).toMatchObject({ deliveryId: null, payment: null });
    expect(stores.checkout.getState().state.submissionId).not.toBe(before);
  });

  it("double submission creates exactly one order", () => {
    const stores = setup();
    // Simulate a double click with the same in-memory state: the second call sees a cleared cart AND the same order.
    const snapshotCheckout = stores.checkout.getState().state;
    const first = placeOrder(stores, LOOKUP, NOW);
    stores.checkout.setState({ state: snapshotCheckout }); // the stale attempt is replayed (reload / second tab)
    const second = placeOrder(stores, LOOKUP, NOW);
    expect(first.ok && second.ok && first.orderId === second.orderId).toBe(true);
    expect(second).toMatchObject({ ok: true, created: false });
    expect(stores.orders.getState().data.orders).toHaveLength(1);
    expect(JSON.parse(stores.storage.data[ORDERS_STORAGE_KEY]!).orders).toHaveLength(1);
  });

  it("sees an order another tab already wrote (storage is re-read at placement)", () => {
    const stores = setup();
    const other = createOrder({ lines, lookup: LOOKUP, checkout: checkout({ submissionId: "sub-othertab" }), now: NOW, data: EMPTY_ORDERS });
    if (!other.ok) throw new Error();
    stores.storage.setItem(ORDERS_STORAGE_KEY, serializeOrders(other.data));
    const result = placeOrder(stores, LOOKUP, NOW);
    if (!result.ok) throw new Error(result.reason);
    expect(stores.orders.getState().data.seq).toBe(2);
    expect(result.orderId).not.toBe(other.order.id);
  });

  it("failure leaves the cart and checkout untouched and creates no order", () => {
    const stores = setup();
    stores.checkout.getState().setPayment(null);
    expect(placeOrder(stores, LOOKUP, NOW)).toEqual({ ok: false, reason: "missing_payment" });
    expect(stores.cart.getState().lines).toHaveLength(1);
    expect(stores.orders.getState().data.orders).toEqual([]);
  });

  it("an empty cart cannot be ordered", () => {
    const stores = setup();
    stores.cart.getState().clear();
    expect(placeOrder(stores, LOOKUP, NOW)).toEqual({ ok: false, reason: "empty_cart" });
  });

  it("recovers from corrupted stored orders with a notice and still works", () => {
    const stores = setup(memoryStorage({ [ORDERS_STORAGE_KEY]: "{{{" }));
    expect(stores.orders.getState().notice).toMatch(/could not be read/);
    expect(placeOrder(stores, LOOKUP, NOW).ok).toBe(true);
  });

  it("keeps working when storage is unavailable", () => {
    const cart = createCartStore();
    cart.getState().hydrate(null, LOOKUP);
    cart.getState().add({ productId: "mug", variantId: "one", quantity: 1 }, LOOKUP);
    const checkoutStore = createCheckoutStore(() => "sub-00000001");
    checkoutStore.getState().setAddress(address);
    checkoutStore.getState().setDelivery("standard");
    checkoutStore.getState().setPayment({ brand: "Visa", last4: "4242" });
    const orders = createOrdersStore();
    connectOrdersStorage(orders, null);
    expect(placeOrder({ cart, orders, checkout: checkoutStore }, LOOKUP, NOW).ok).toBe(true);
    expect(orders.getState().data.orders).toHaveLength(1);
  });
});
