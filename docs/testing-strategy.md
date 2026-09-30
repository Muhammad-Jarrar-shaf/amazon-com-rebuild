# Testing Strategy

Test the behavior that decides whether the golden path works and whether money is right; do not maximize test count. Tests are written **with** each slice ([delivery-plan.md](delivery-plan.md)). IDs refer to [requirements.md](requirements.md).

## 1. Layers
| Layer | Tool | What | Covers |
|---|---|---|---|
| Unit | Vitest | `lib/pricing`, `lib/cart-store`, `lib/catalog`, `lib/url`, `lib/checkout`, `lib/orders`, catalog data validation | NFR-TEST-1, NFR-DET-1 |
| E2E | Playwright vs `next build && next start` | J1 desktop golden path; J4 mobile smoke; cheap smokes for J2/J3/J5 | NFR-TEST-2 |
| Accessibility | `@axe-core/playwright` inside the E2E run | Home, Results, PDP, Cart, Checkout, Confirmation | NFR-A11Y-1, -4, -5 |
| Manual | checklist below | keyboard, focus, 375px overflow, tap targets, visual | NFR-A11Y-2, -3, -6, NFR-RESP-* |
| Production smoke | Playwright against the deployed URL | J1 after every deploy | NFR-DEP-1 |

## 2. Unit tests (minimum set)
- **Pricing:** line total, savings % (rounded), subtotal, shipping per option, tax = 8% half-up, order total; rounding edge cases (e.g. 1 cent, half-cent boundaries); no floating point (FR-CHK-8, NFR-DET-1).
- **Cart:** add new, add same variant merges, qty clamp 1-10, `setQty`, remove, Undo restores the exact line and position, clear, persistence round-trip, corrupt/unknown storage is discarded without throwing (FR-CART-1..4).
- **Search/filter/sort:** keyword hits title/brand/tags, no-match returns empty, suggestions (max 8, needs >=2 chars), Brand OR-within/AND-across, rating and price bounds, each sort key, pagination boundaries (page 1, last, out of range), URL parse/build round-trip (FR-SRCH-1..9).
- **Checkout:** address validation (each field, ZIP forms, phone), card validation (Luhn, expiry, CVC), `4242...` accepted, `4000 0000 0000 0002` declined, order totals recomputed from the catalog (tampered cart prices ignored), `createOrder` idempotent per `submissionId`, order number format and sequencing, full number/CVC absent from the returned order (FR-CHK-2..8, FR-ORD-1..2, NFR-SEC-3).
- **Data validation:** unique ids, valid variant/related references, positive integer prices, list price >= price, every image path exists or is intentionally fallback.

## 3. E2E scenarios
| Test | Journey | Steps (assert at each) |
|---|---|---|
| `golden-path.desktop` | J1 | Home loads -> type "headphones", suggestion list appears -> Enter -> results header shows count -> sort by price low-high, first price <= second -> open product -> pick second color (image/price change) -> qty 2 -> Add to cart (mini-cart shows item, header count 2) -> Go to Cart (subtotal matches `lib/pricing`) -> Proceed to checkout -> fill address (one invalid field first, error shown) -> select Expedited (total changes) -> pay with `4242...` -> Review totals match -> Place order -> confirmation shows order number pattern `111-\d{7}-\d{7}`, cart count 0 -> `/orders` lists it. Includes a double-click on Place order asserting exactly one order. |
| `mobile-smoke` (375px) | J4 | Same path shortened: home -> search -> PDP -> add to cart -> cart -> checkout -> confirmation; assert `scrollWidth <= innerWidth` on each page and >=44px targets on primary controls (NFR-RESP-1, NFR-A11Y-6). |
| `browse` | J2 | Category tile -> filter Brand + 4 stars -> page 2 -> reload restores the same URL state. |
| `cart` | J3 | Change qty, delete, Undo, reload keeps the cart. |
| `errors` | J5 | "zzzz" empty state; `/dp/does-not-exist` 404 with search; declined card `4000 0000 0000 0002` shows the alert and keeps form data. |
| `a11y` | | axe scan per critical page; fail on `critical` or `serious`. |
The clock is pinned in test builds so ETAs and dates are asserted exactly.

## 4. Manual acceptance checks (per slice, and again in S7/S9)
1. Keyboard-only J1: every control reachable, order logical, focus visible, Esc closes the drawer/mini-cart and returns focus.
2. 375 / 768 / 1440 visual pass on the six critical pages; no horizontal overflow at 375.
3. Tap targets >=44px on mobile for header icons, swatches, quantity, primary buttons.
4. States: loading, empty, error, success for each surface in the [ux-spec.md](ux-spec.md) catalog.
5. No console errors or failed requests on the golden path; no request to any `amazon.*` host.
6. Lighthouse recorded as a diagnostic only (NFR-PERF-1).

## 5. Production smoke
After each deploy (and in S9 from a cold clone): run the J1 test against the public URL (`E2E_BASE_URL=<url> pnpm e2e`; Playwright then skips the local build/server), check `/`, `/s?k=headphones`, one `/dp/...`, `/cart`, `/checkout` respond 200 and render, and confirm the deployed `next` version is 16.3.7 (or the recorded patched version). Any failure blocks the next slice.

## 6. Gates
- Every slice ends with `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green ([CLAUDE.md](../CLAUDE.md)).
- **G1** (after S5 and the test harness): J1 desktop + J4 mobile smoke + axe pass on the **deployed** build.
- Submission gate: [delivery-plan.md acceptance criteria](delivery-plan.md#acceptance-criteria).
