import { describe, expect, it, vi } from "vitest";
import { LOOKUP } from "./fixtures";
import { CART_STORAGE_KEY, parseStoredCart, readStoredCart, serializeCart, writeStoredCart, type CartStorage } from "./persistence";
import { connectCartStorage, createCartStore } from "./store";

function memoryStorage(initial: Record<string, string> = {}): CartStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const stored = (lines: unknown, version: unknown = 1) => JSON.stringify({ version, lines });

describe("persistence format", () => {
  it("serializes only ids and quantities, with a version", () => {
    const json = serializeCart([{ productId: "mug", variantId: "one", quantity: 2 }]);
    expect(JSON.parse(json)).toEqual({ version: 1, lines: [{ productId: "mug", variantId: "one", quantity: 2 }] });
    expect(json).not.toMatch(/price|title|total/i);
  });

  it("round-trips", () => {
    const lines = [
      { productId: "mug", variantId: "one", quantity: 2 },
      { productId: "headphones", variantId: "black", quantity: 1 },
    ];
    expect(parseStoredCart(serializeCart(lines), LOOKUP).lines).toEqual(lines);
  });

  it("treats nothing stored as an empty cart with no notice", () => {
    expect(parseStoredCart(null, LOOKUP)).toMatchObject({ lines: [], message: null });
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["a JSON string", '"cart"'],
    ["JSON null", "null"],
    ["a bare array", "[]"],
    ["a stale schema version", stored([{ productId: "mug", variantId: "one", quantity: 1 }], 0)],
    ["a future schema version", stored([], 2)],
    ["lines that are not an array", stored({ mug: 1 })],
  ])("recovers from %s with an empty cart and a notice", (_name, raw) => {
    const parsed = parseStoredCart(raw, LOOKUP);
    expect(parsed.lines).toEqual([]);
    expect(parsed.message).toMatch(/could not be read/);
  });

  it("drops stale products but keeps the valid ones and says how many were removed", () => {
    const parsed = parseStoredCart(stored([{ productId: "mug", variantId: "one", quantity: 1 }, { productId: "gone", variantId: "x", quantity: 1 }]), LOOKUP);
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.message).toMatch(/1 item is no longer available/);
  });
});

describe("safe storage access", () => {
  it("never throws when reading or writing throws", () => {
    const broken: CartStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(readStoredCart(broken)).toBeNull();
    expect(writeStoredCart(broken, [])).toBe(false);
  });

  it("tolerates missing storage", () => {
    expect(readStoredCart(null)).toBeNull();
    expect(writeStoredCart(null, [])).toBe(false);
  });

  it("keeps the cart working in memory when storage is unavailable", () => {
    const store = createCartStore();
    const disconnect = connectCartStorage(store, LOOKUP, null);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().add({ productId: "mug", variantId: "one", quantity: 1 }, LOOKUP).ok).toBe(true);
    expect(store.getState().lines).toHaveLength(1);
    disconnect();
  });
});

describe("cart store", () => {
  const request = (productId: string, variantId: string, quantity = 1) => ({ productId, variantId, quantity });

  it("adds, opens the mini-cart and records what was added", () => {
    const store = createCartStore();
    store.getState().hydrate(null, LOOKUP);
    const outcome = store.getState().add(request("mug", "one", 2), LOOKUP);
    expect(outcome.ok).toBe(true);
    expect(store.getState()).toMatchObject({ miniCartOpen: true, lastAdded: { productId: "mug", quantity: 2, capped: false } });
  });

  it("does not open the mini-cart or change lines when an add is rejected", () => {
    const store = createCartStore();
    store.getState().hydrate(null, LOOKUP);
    expect(store.getState().add(request("headphones", "red"), LOOKUP)).toEqual({ ok: false, reason: "unavailable" });
    expect(store.getState()).toMatchObject({ lines: [], miniCartOpen: false, lastAdded: null });
  });

  it("removes, then undo restores exactly and clears the undo slot", () => {
    const store = createCartStore();
    store.getState().hydrate(null, LOOKUP);
    store.getState().add(request("mug", "one", 3), LOOKUP);
    store.getState().add(request("cable", "1m", 2), LOOKUP);
    const before = store.getState().lines;
    store.getState().remove({ productId: "mug", variantId: "one" });
    expect(store.getState().lines).toHaveLength(1);
    expect(store.getState().lastRemoved?.line).toEqual({ productId: "mug", variantId: "one", quantity: 3 });
    store.getState().undo(LOOKUP);
    expect(store.getState().lines).toEqual(before);
    expect(store.getState().lastRemoved).toBeNull();
  });

  it("keeps a single undo slot: a second removal replaces the first", () => {
    const store = createCartStore();
    store.getState().hydrate(null, LOOKUP);
    store.getState().add(request("mug", "one"), LOOKUP);
    store.getState().add(request("cable", "1m"), LOOKUP);
    store.getState().remove({ productId: "mug", variantId: "one" });
    store.getState().remove({ productId: "cable", variantId: "1m" });
    expect(store.getState().lastRemoved?.line.productId).toBe("cable");
  });

  it("rejects an invalid quantity update without changing the cart", () => {
    const store = createCartStore();
    store.getState().hydrate(null, LOOKUP);
    store.getState().add(request("mug", "one", 2), LOOKUP);
    expect(store.getState().setQuantity({ productId: "mug", variantId: "one" }, 0, LOOKUP)).toBeNull();
    expect(store.getState().lines[0]?.quantity).toBe(2);
  });
});

describe("connectCartStorage", () => {
  it("loads the stored cart and persists changes after hydration", () => {
    const storage = memoryStorage({ [CART_STORAGE_KEY]: stored([{ productId: "mug", variantId: "one", quantity: 2 }]) });
    const store = createCartStore();
    const disconnect = connectCartStorage(store, LOOKUP, storage);
    expect(store.getState().lines).toEqual([{ productId: "mug", variantId: "one", quantity: 2 }]);
    store.getState().add({ productId: "cable", variantId: "1m", quantity: 1 }, LOOKUP);
    expect(JSON.parse(storage.data[CART_STORAGE_KEY]!).lines).toHaveLength(2);
    disconnect();
  });

  it("does not overwrite the stored cart before it has been read", () => {
    const original = stored([{ productId: "mug", variantId: "one", quantity: 2 }]);
    const storage = memoryStorage({ [CART_STORAGE_KEY]: original });
    const store = createCartStore();
    // Nothing connected yet: an early action must not write an empty cart over the stored one.
    store.getState().dismissNotice();
    expect(storage.data[CART_STORAGE_KEY]).toBe(original);
  });

  it("recovers from corrupted storage: empty cart, a visible notice, and storage rewritten as valid", () => {
    const storage = memoryStorage({ [CART_STORAGE_KEY]: "{{{corrupt" });
    const store = createCartStore();
    const disconnect = connectCartStorage(store, LOOKUP, storage);
    expect(store.getState().lines).toEqual([]);
    expect(store.getState().notice).toMatch(/could not be read/);
    expect(JSON.parse(storage.data[CART_STORAGE_KEY]!)).toEqual({ version: 1, lines: [] });
    disconnect();
  });

  it("removes stale entries with a notice and normalizes storage", () => {
    const storage = memoryStorage({
      [CART_STORAGE_KEY]: stored([{ productId: "mug", variantId: "one", quantity: 1 }, { productId: "gone", variantId: "x", quantity: 1 }]),
    });
    const store = createCartStore();
    const disconnect = connectCartStorage(store, LOOKUP, storage);
    expect(store.getState().lines).toHaveLength(1);
    expect(store.getState().notice).toMatch(/no longer available/);
    expect(JSON.parse(storage.data[CART_STORAGE_KEY]!).lines).toHaveLength(1);
    disconnect();
  });

  it("survives a storage that throws on every call", () => {
    const store = createCartStore();
    const broken: CartStorage = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };
    const disconnect = connectCartStorage(store, LOOKUP, broken);
    expect(() => store.getState().add({ productId: "mug", variantId: "one", quantity: 1 }, LOOKUP)).not.toThrow();
    expect(store.getState().lines).toHaveLength(1);
    disconnect();
  });
});
