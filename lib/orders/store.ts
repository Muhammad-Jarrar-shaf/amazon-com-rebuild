import { createStore, useStore, type StoreApi } from "zustand";
import { getBrowserStorage, type CartStorage } from "@/lib/cart/persistence";
import { EMPTY_ORDERS, ORDERS_STORAGE_KEY, ordersNotice, parseStoredOrders, readStoredOrders, writeStoredOrders } from "./persistence";
import type { CreateOrderResult } from "./create";
import type { OrdersData } from "./types";

export interface OrdersState {
  data: OrdersData;
  hydrated: boolean;
  notice: string | null;
  /** Where orders are persisted (null: unavailable, orders live in memory for the visit). */
  storage: CartStorage | null;
}

export interface OrdersActions {
  hydrate(raw: string | null): void;
  /**
   * Runs `create` against the orders as they are stored RIGHT NOW (re-read from storage, so another tab's order or a
   * repeated call is seen), and commits and persists its result synchronously. This is what makes placing an order
   * idempotent without a backend.
   */
  place(create: (data: OrdersData) => CreateOrderResult): CreateOrderResult;
  dismissNotice(): void;
}

export type OrdersStore = OrdersState & OrdersActions;

export function createOrdersStore(): StoreApi<OrdersStore> {
  return createStore<OrdersStore>()((set, get) => ({
    data: EMPTY_ORDERS,
    hydrated: false,
    notice: null,
    storage: null,

    hydrate(raw) {
      const parsed = parseStoredOrders(raw);
      set((state) => ({ data: parsed.data, hydrated: true, notice: ordersNotice(parsed) ?? state.notice }));
    },

    place(create) {
      const { storage } = get();
      const fresh = storage ? parseStoredOrders(readStoredOrders(storage)).data : get().data;
      // Storage is the truth, but never let a stale copy reuse a sequence number the in-memory data has already passed.
      const memory = get().data;
      const base = fresh.seq >= memory.seq ? fresh : memory;
      const result = create(base);
      if (result.ok && result.created) {
        writeStoredOrders(storage, result.data);
        set({ data: result.data });
      } else if (result.ok) {
        set({ data: result.data });
      }
      return result;
    },

    dismissNotice: () => set({ notice: null }),
  }));
}

export function connectOrdersStorage(store: StoreApi<OrdersStore>, storage: CartStorage | null = getBrowserStorage()): () => void {
  store.setState({ storage });
  store.getState().hydrate(readStoredOrders(storage));
  // Normalize what is stored (drops damaged orders from storage itself).
  writeStoredOrders(storage, store.getState().data);
  const onStorage = (event: StorageEvent) => {
    if (event.key === ORDERS_STORAGE_KEY) store.getState().hydrate(event.newValue);
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export const ordersStore = createOrdersStore();

export function useOrders<T>(selector: (state: OrdersStore) => T): T {
  return useStore(ordersStore, selector);
}
