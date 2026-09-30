import { createStore, useStore, type StoreApi } from "zustand";
import { addToLines, removeFromLines, restoreLine, setLineQuantity, type AddOutcome, type RemovedLine } from "./model";
import { CART_STORAGE_KEY, getBrowserStorage, parseStoredCart, readStoredCart, writeStoredCart, type CartStorage } from "./persistence";
import type { AddToCartRequest } from "@/lib/purchase";
import type { CartLine, CartLookup, LineIdentity } from "./types";

export interface CartState {
  lines: CartLine[];
  /** False until the stored cart has been read on the client; the server render and first paint show it as empty. */
  hydrated: boolean;
  /** Shopper-facing recovery message (invalid stored entries were removed); null when there is none. */
  notice: string | null;
  /** The one-slot Undo: the most recently removed line. Session only, not persisted. */
  lastRemoved: RemovedLine | null;
  /** What the last successful add did, for the mini-cart's confirmation. */
  lastAdded: { productId: string; variantId: string; quantity: number; capped: boolean } | null;
  miniCartOpen: boolean;
}

export interface CartActions {
  hydrate(raw: string | null, lookup: CartLookup): void;
  add(request: AddToCartRequest, lookup: CartLookup): AddOutcome;
  setQuantity(identity: LineIdentity, quantity: number, lookup: CartLookup): { capped: boolean } | null;
  remove(identity: LineIdentity): void;
  undo(lookup: CartLookup): void;
  dismissNotice(): void;
  clearRemoved(): void;
  /** Empties the cart (after an order is placed). */
  clear(): void;
  openMiniCart(): void;
  closeMiniCart(): void;
}

export type CartStore = CartState & CartActions;

/** A fresh, independent store (tests use this; the app uses the singleton below). */
export function createCartStore(): StoreApi<CartStore> {
  return createStore<CartStore>()((set, get) => ({
    lines: [],
    hydrated: false,
    notice: null,
    lastRemoved: null,
    lastAdded: null,
    miniCartOpen: false,

    hydrate(raw, lookup) {
      const parsed = parseStoredCart(raw, lookup);
      set((state) => ({ lines: parsed.lines, hydrated: true, notice: parsed.message ?? state.notice }));
    },

    add(request, lookup) {
      const outcome = addToLines(get().lines, request, lookup);
      if (outcome.ok) {
        set({
          lines: outcome.lines,
          lastAdded: { productId: request.productId, variantId: request.variantId, quantity: request.quantity, capped: outcome.capped },
          lastRemoved: null,
          miniCartOpen: true,
        });
      }
      return outcome;
    },

    setQuantity(identity, quantity, lookup) {
      const outcome = setLineQuantity(get().lines, identity, quantity, lookup);
      if (!outcome.ok) return null;
      set({ lines: outcome.lines });
      return { capped: outcome.capped };
    },

    remove(identity) {
      const { lines, removed } = removeFromLines(get().lines, identity);
      if (removed) set({ lines, lastRemoved: removed });
    },

    undo(lookup) {
      const { lastRemoved, lines } = get();
      if (!lastRemoved) return;
      set({ lines: restoreLine(lines, lastRemoved, lookup), lastRemoved: null });
    },

    dismissNotice: () => set({ notice: null }),
    clearRemoved: () => set({ lastRemoved: null }),
    clear: () => set({ lines: [], lastRemoved: null, lastAdded: null, miniCartOpen: false }),
    openMiniCart: () => set({ miniCartOpen: true, lastAdded: null }),
    closeMiniCart: () => set({ miniCartOpen: false, lastAdded: null, lastRemoved: null }),
  }));
}

/**
 * Loads the stored cart into the store, then keeps storage in step with it (writes only after hydration, so an
 * unread cart is never overwritten) and follows changes made in other tabs. Returns a cleanup function.
 */
export function connectCartStorage(store: StoreApi<CartStore>, lookup: CartLookup, storage: CartStorage | null = getBrowserStorage()): () => void {
  store.getState().hydrate(readStoredCart(storage), lookup);
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.hydrated && state.lines !== previous.lines) writeStoredCart(storage, state.lines);
  });
  // Normalize what is stored right away (drops invalid entries from the storage itself).
  writeStoredCart(storage, store.getState().lines);

  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) store.getState().hydrate(event.newValue, lookup);
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** The one canonical cart for the whole app: product page, result rows, mini-cart, cart page and header badge. */
export const cartStore = createCartStore();

export function useCart<T>(selector: (state: CartStore) => T): T {
  return useStore(cartStore, selector);
}
