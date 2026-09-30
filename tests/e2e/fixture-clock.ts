/**
 * The clock the local E2E web server pins with APP_FIXED_NOW (lib/clock.ts): Thursday 2026-10-01, noon UTC.
 * Only local runs use it. A deployment (E2E_BASE_URL) runs on the real clock, as production intends.
 */
export const FIXED_NOW = "2026-10-01T12:00:00Z";
export const PINNED_CLOCK = !process.env.E2E_BASE_URL;
