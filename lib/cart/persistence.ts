import { recoveryMessage, sanitizeLines } from "./model";
import type { CartLine, CartLookup, RecoveryReport } from "./types";

/** Storage key; the number is the schema version, so a future shape change uses a new key and old data is ignored. */
export const CART_STORAGE_KEY = "cart:v1";
export const CART_SCHEMA_VERSION = 1;

/** The minimal storage surface the cart needs (satisfied by window.localStorage). */
export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Only ids and quantities are persisted; totals, titles and prices are recomputed from the catalog on load. */
export function serializeCart(lines: readonly CartLine[]): string {
  return JSON.stringify({ version: CART_SCHEMA_VERSION, lines });
}

export interface ParsedCart {
  lines: CartLine[];
  report: RecoveryReport;
  message: string | null;
}

/** Never throws: null means "nothing stored"; invalid JSON, a wrong shape or another version resets to an empty cart with a report. */
export function parseStoredCart(raw: string | null, lookup: CartLookup): ParsedCart {
  const empty: RecoveryReport = { unreadable: false, removed: 0, adjusted: 0 };
  if (raw === null) return { lines: [], report: empty, message: null };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const report = { ...empty, unreadable: true };
    return { lines: [], report, message: recoveryMessage(report) };
  }
  const record = data as { version?: unknown; lines?: unknown } | null;
  if (!record || typeof record !== "object" || record.version !== CART_SCHEMA_VERSION) {
    const report = { ...empty, unreadable: true };
    return { lines: [], report, message: recoveryMessage(report) };
  }
  const { lines, report } = sanitizeLines(record.lines, lookup);
  return { lines, report, message: recoveryMessage(report) };
}

/** window.localStorage when it works (it can throw or be absent: private mode, blocked site data, SSR); otherwise null. */
export function getBrowserStorage(): CartStorage | null {
  try {
    if (typeof window === "undefined") return null;
    const storage = window.localStorage;
    const probe = "cart:probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Reads without ever throwing. */
export function readStoredCart(storage: CartStorage | null): string | null {
  try {
    return storage ? storage.getItem(CART_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

/** Writes without ever throwing (quota exceeded and disabled storage leave the in-memory cart working). */
export function writeStoredCart(storage: CartStorage | null, lines: readonly CartLine[]): boolean {
  try {
    if (!storage) return false;
    storage.setItem(CART_STORAGE_KEY, serializeCart(lines));
    return true;
  } catch {
    return false;
  }
}
