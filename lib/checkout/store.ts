import { createStore, useStore, type StoreApi } from "zustand";
import { getBrowserStorage, type CartStorage } from "@/lib/cart/persistence";
import { CHECKOUT_STORAGE_KEY, parseStoredCheckout, serializeCheckout } from "./persistence";
import { initialCheckoutState } from "./state";
import type { AddressFields, CheckoutState, DeliveryId, PaymentSummary } from "./types";

export interface CheckoutStoreState {
  state: CheckoutState;
  hydrated: boolean;
  /** Stored checkout data was unusable and was reset. */
  recovered: boolean;
  /** Why the shopper was sent back to an earlier step; session only. */
  notice: string | null;
}

export interface CheckoutActions {
  hydrate(raw: string | null): void;
  setAddress(address: AddressFields): void;
  setDelivery(id: DeliveryId): void;
  setPayment(payment: PaymentSummary | null): void;
  /** Starts a new attempt: clears everything and issues a new submission id (after an order is placed). */
  reset(): void;
  dismissRecovered(): void;
  setNotice(notice: string | null): void;
}

export type CheckoutStore = CheckoutStoreState & CheckoutActions;

/** A unique id per checkout attempt. `crypto.randomUUID` where available, else a time+counter fallback. */
let counter = 0;
export function newSubmissionId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  counter += 1;
  return `sub-${Date.now().toString(36)}-${counter.toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function createCheckoutStore(newId: () => string = newSubmissionId): StoreApi<CheckoutStore> {
  return createStore<CheckoutStore>()((set) => ({
    state: initialCheckoutState(newId()),
    hydrated: false,
    recovered: false,
    notice: null,

    hydrate(raw) {
      const parsed = parseStoredCheckout(raw, newId);
      set((current) => ({ state: parsed.state, hydrated: true, recovered: parsed.recovered || current.recovered }));
    },
    setAddress: (address) => set((current) => ({ state: { ...current.state, address } })),
    setDelivery: (id) => set((current) => ({ state: { ...current.state, deliveryId: id } })),
    setPayment: (payment) => set((current) => ({ state: { ...current.state, payment } })),
    reset: () => set({ state: initialCheckoutState(newId()) }),
    dismissRecovered: () => set({ recovered: false }),
    setNotice: (notice) => set({ notice }),
  }));
}

export function connectCheckoutStorage(store: StoreApi<CheckoutStore>, storage: CartStorage | null = getBrowserStorage()): () => void {
  const read = () => {
    try {
      return storage ? storage.getItem(CHECKOUT_STORAGE_KEY) : null;
    } catch {
      return null;
    }
  };
  store.getState().hydrate(read());
  const write = () => {
    try {
      storage?.setItem(CHECKOUT_STORAGE_KEY, serializeCheckout(store.getState().state));
    } catch {
      // Storage full or blocked: checkout keeps working in memory for the visit.
    }
  };
  write();
  const unsubscribe = store.subscribe((current, previous) => {
    if (current.hydrated && current.state !== previous.state) write();
  });
  const onStorage = (event: StorageEvent) => {
    if (event.key === CHECKOUT_STORAGE_KEY) store.getState().hydrate(event.newValue);
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export const checkoutStore = createCheckoutStore();

export function useCheckout<T>(selector: (state: CheckoutStore) => T): T {
  return useStore(checkoutStore, selector);
}
