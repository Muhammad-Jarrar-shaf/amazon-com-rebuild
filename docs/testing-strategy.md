# Testing Strategy

Test the behavior that decides whether the golden path works and whether money is right; do not maximize test count. Tests are written **with** each slice ([delivery-plan.md](delivery-plan.md)). IDs refer to [requirements.md](requirements.md).

## 1. Layers
| Layer | Tool | What | Covers |
|---|---|---|---|
| Unit | Vitest | `lib/pricing`, `lib/cart`, `lib/catalog`, `lib/url`, `lib/checkout`, `lib/orders`, catalog data validation | NFR-TEST-1, NFR-DET-1 |
| E2E | Playwright vs `next build && next start` | J1 desktop golden path; J4 mobile smoke; cheap smokes for J2/J3/J5 | NFR-TEST-2 |
| Accessibility | `@axe-core/playwright` inside the E2E run | Home, Results, PDP, Cart, Checkout, Confirmation | NFR-A11Y-1, -4, -5 |
| Manual | checklist below | keyboard, focus, 375px overflow, tap targets, visual | NFR-A11Y-2, -3, -6, NFR-RESP-* |
| Production smoke | Playwright against the deployed URL | J1 after every deploy | NFR-DEP-1 |

## 2. Unit tests (minimum set)
- **Pricing:** line total, savings % (rounded), subtotal, shipping per option, tax = 8% half-up, order total; rounding edge cases (e.g. 1 cent, half-cent boundaries); no floating point (FR-CHK-8, NFR-DET-1).
- **Cart:** add new, add same variant merges, different variants stay separate, qty clamp 1-10 and stock, `setQuantity` bounds, remove, Undo restores the exact line and position, subtotal/count aggregation in integer cents, persistence round-trip, corrupt/stale/other-version storage recovers with a notice, unavailable/vanished products removed, storage that throws (FR-CART-1..4).
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

**Recorded runs:** S0, 2026-09-30: `E2E_BASE_URL=https://amazon-com-rebuild.vercel.app pnpm e2e` passed 2/2 (desktop 1440, mobile 375) against the public deployment, with no local server.

## 6. Gates
- Every slice ends with `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green ([CLAUDE.md](../CLAUDE.md)).
- **G1** (after S5 and the test harness): J1 desktop + J4 mobile smoke + axe pass on the **deployed** build.
- Submission gate: [delivery-plan.md acceptance criteria](delivery-plan.md#acceptance-criteria).

## 7. As built (through S5)
**Unit (Vitest, `pnpm test`; 310 tests in 20 files at the end of S5):** `lib/pricing`, `quantity`, `availability`, `delivery` (+ `clock`), `format`/`color`, `nav`, `catalog/catalog.test.ts` (lookup, related, featured, variant selection, availability states, `resolvePurchase`, search records), `catalog/data.test.ts` (seed integrity: unique ids, integer cents, compare-at above price, every related id resolves, every asset file exists and is credited, demo states present) and `site`.

**E2E (Playwright, `pnpm e2e`, desktop 1440 + mobile 375):** `smoke.spec.ts`, `shell.spec.ts` (S1) and `pdp.spec.ts` (S2: content, gallery, variants incl. the disabled/unavailable variant and URL state, quantity bounds and keyboard, add-to-cart validation, product states, invalid id 404, related navigation, image-failure fallback, desktop layout at 1440/1280/1024/768/375, mobile order and 44px targets, axe on six PDP states, and every product page at both widths).

**Cart (S4):** unit `lib/cart/model.test.ts`, `store.test.ts` (fake storages, including ones that throw) and `catalog-integration.test.ts` (the real seed catalog through the projection); regression-checked by mutation (removing the merge cap or ignoring the variant in the line identity each fail tests). E2E `cart.spec.ts`: PDP variant/quantity through the mini-cart to `/cart`, merge vs separate variants, quantity limits, search-row add, the J3 journey (two products, quantity, delete, Undo, reload, stored shape), typed quantities, header cart opening the mini-cart, empty cart, corrupted/stale/old-version/blocked storage, Esc + focus return, a keyboard-only cart journey, backdrop close, the checkout entry point, axe (cart with items, empty, mini-cart open), overflow and 44px targets at 375.

**Checkout and orders (S5):** unit `lib/checkout/checkout.test.ts` (address, delivery ETAs, payment incl. approved/declined/unsupported/malformed, tax and totals, the step model, checkout persistence and recovery) and `lib/orders/orders.test.ts` (order ids, `createOrder` from authoritative data and every refusal, idempotency, orders persistence and recovery, the whole `placeOrder` operation incl. a stale replay, a second tab and unavailable storage). E2E `checkout.spec.ts`: **J1 golden path** (Home -> search "headphones" -> sort -> product -> Space Silver x2 -> cart -> checkout -> address -> delivery -> test card -> review -> place -> confirmation -> badge 0 -> Returns & Orders -> the order, cart empty; console clean, no card number in the DOM), empty cart, guarded steps, invalid address/card, declined card, double click and many clicks in one tick, stale replay, second order, no card data in storage, reload/Back/Forward, Change links, corrupted checkout/orders storage, unknown confirmation id, keyboard-only checkout, the Place order lock (no enabled button and an announced "Placing your order" status right after the first activation), a carried-over double-click press on the confirmation's links, rapid Enter/Space, a two-item two-variant order checked to the cent from review to confirmation to `/orders`, axe on every step (incl. error and declined states), confirmation and orders, and overflow/44px/layout at 1440 and 375.

**Determinism:** the Playwright web server sets `APP_FIXED_NOW=2026-10-01T12:00:00Z` (see `lib/clock.ts`), so delivery dates are asserted exactly ("Tuesday, October 6"); against an external `E2E_BASE_URL` the tests match the pattern instead. `reuseExistingServer` is off unless `E2E_REUSE_SERVER=1`, so a run always builds and tests the current code.

**Overflow metric (a real defect in the tests, found in S2):** `scrollWidth - innerWidth` is **not** a valid check under mobile emulation, because the browser widens the layout viewport to fit overflowing content and the difference reads 0. The tests use `documentElement.scrollWidth - documentElement.clientWidth`, and this was proven by a mutation check: removing the fix for a real overflow (sr-only text inside the related rail escaping its scroll container) makes `every product page ... fits the viewport` fail with `Received: 561`. Re-running the S1 shell tests with the corrected metric found no hidden overflow.

**When a fix is claimed for a defect, prove the test can fail:** temporarily revert the fix, confirm the test goes red, restore it (as done for the overflow above).

## 8. As built (S3)
**Unit (`pnpm test`):** `lib/search/{text,url,engine,suggest,summary,server}.test.ts` cover tokenization and stemming, relevance scoring and deterministic ordering (including independence of input order), suggestions (thresholds, ranking, dedupe, the 8 cap), brand, rating and price filters (inclusive/exclusive boundaries), facet counts, the four sorts, pagination (first, middle, last, out of range, empty, page window), URL parse/build round-trips, malformed and hostile parameters, and zero results. `server.test.ts` proves every popular query, department and brand returns results, so no suggestion or facet leads to an empty page. The seed catalog has five products rated below 4 so the 4-star filter is a real filter.

**E2E (`tests/e2e/search.spec.ts`, desktop and mobile):** suggestions (no request, combobox semantics, keyboard, click, outside click, the typing-overwritten regression), ranked results and their contents, unknown query, empty page, malformed parameters (including script injection), the four sorts checked against catalog data, every filter and combination with chips and Clear filters, the zero-match state, keyboard filtering, direct URLs, refresh, Back/Forward, pagination, category browsing from every entry point, the J2 journey, the mobile drawer (open, apply, Esc, focus return), row layout, 375px overflow for every state, the desktop layout at 1440/1024/768/375, the page title on client navigation, and axe on results, filtered, page 2, no-results, filter-no-match, empty, open suggestions and the open drawer.

**Real defects found by these tests or by inspection, each now covered:** (1) typed text was overwritten because the URL-sync callback was unstable; (2) suggestion de-duplication depended on the order of the terms; (3) the sidebar's "Price" heading preceded the page `h1`; (4) checkboxes and the sort select lagged behind the URL until the server responded (now optimistic); (5) a price link clicked right after a brand dropped the pending brand (links now use the optimistic state); (6) **the tab title was wrong after client navigation** because prefetched `/s?...` head data was reused (fixed by not prefetching `/s` links; an inline `<title>` was tried first and lost to the layout title on direct loads).

**Lessons:** Playwright's `.check()` fails with "did not change its state" when a control is controlled by the URL and updates late; that was an application defect, not a test problem. A name match is a case-insensitive substring, so `getByRole("link", { name: title })` also matches "See options: <title>": use `exact: true`. `getByLabel` ignores visibility, so scope it to the visible container. Next's `?_rsc=` requests are link prefetches, not data fetches.

## 9. S5 verification and defects
**Environment note.** The config asks for the `chrome` channel; the S5 verification container had no Google Chrome (downloads blocked), so the runs below used Playwright's Chromium 141 through a local, uncommitted override of `channel` (same projects, viewports, web server, clock). Node 24.21.0.

**J1 console 404: root cause (proven).** Symptom: J1's console check intermittently reported `Failed to load resource: 404` with no 4xx page `response` event, only under parallel load. Evidence:
1. A logging proxy in front of `next start` recorded every browser request across 144 checkout tests (7,167 requests): zero 4xx, so no app route or asset was missing.
2. A browser-initiated `/favicon.ico` fetch has exactly the reported signature: console `Failed to load resource: 404` with location `/favicon.ico` and **no** page `response` event (the app had only `app/icon.svg`; `/favicon.ico` returned 404).
3. A MutationObserver across J1 showed Next swapping `<link rel="icon">` atomically on every client navigation **except Review -> Confirmation**, where the document had zero icon links across a task boundary (about 11 ms).
4. Replaying that window (remove the icon links, `history.pushState`, re-add after 5-20 ms) made Chromium fetch `/favicon.ico` -> 404 -> the exact console error; gaps of 0 ms or 100+ ms did not, which is why it was intermittent and load-dependent.
Classification: framework/browser behavior exposing a genuinely missing application asset. **Fix (application):** `app/favicon.ico`, rendered from our own `app/icon.svg`. The J1 check was not relaxed; it now also prints each console error's source URL. **Regression:** `smoke.spec.ts` "the default /favicon.ico exists..." asserts `/favicon.ico` is served as an image and replays the window with a strict console check; with the file removed it fails on both projects with the original error.

**Defects found and fixed in S5 verification.**
| # | Defect | Layer | Fix | Proof |
|---|---|---|---|---|
| 1 | Intermittent J1 console 404 (above) | app asset (framework-triggered) | `app/favicon.ico` | replay test red without the file |
| 2 | Double click on Place order: the second press activated the footer "Computers" link that the shorter placing screen moved under the pointer (desktop), and could hit a confirmation button | application | announced "Placing your order" status + `ignoreRestOfGesture` (swallow `detail >= 2` clicks until a fresh press) | strengthened double-click test and the carried-over-press test fail without the guard |
| 3 | Continue/Review clicks sometimes did nothing on mobile under load: `scroll-behavior: smooth` animated Playwright's scroll-into-view, so the click hit the text above the button | test/timing | `reducedMotion: "reduce"` in `playwright.config.ts` | trace: "element is not stable", "<p> intercepts pointer events"; 162/162 checkout runs clean afterwards (5 workers x3) |
| 4 | "stored data never contains the CVC" failed when a random submission id contained "123" | test | walk every stored value: no card-like field, no value equal to the CVC, payments are exactly `{brand, last4}` | reproduced with `630e6123-...` |
| 5 | axe test (nine full-page scans) timed out under load | test/timing | `test.slow()` | timed out at 30 s with 6 workers |
| 6 | Mobile "backdrop closes the mini-cart" passed only because the press landed during the slide-in; at 375px the panel is full width, so there is no backdrop | test (S4) | desktop-only, with the reason | failed once animation was removed; panel measured `left 0, width 375` |
| 7 | "search field follows the URL on Back and Forward" typed before the post-hydration URL sync and got `k=headphoneslaptop` (1 in a full run, 0/80 alone) | test precondition; **the app race remains (S3, known issue)** | wait for the field to show the URL value first | the header field is filled from the URL by an effect after hydration; typing in that window merges text. Not fixed in S5 (out of scope); tracked as a follow-up |

**Final verification (fresh build, 2026-09-30):** `pnpm typecheck` 0, `pnpm lint` 0, `pnpm test` 310/310, `pnpm build` 0, `pnpm audit` no known vulnerabilities, `pnpm e2e` (fresh `next build` + `next start`, no reused server) 261 passed, 0 failed, 25 skipped (project-specific guards). Visual pass at 1440/1024/768/375 over empty checkout, empty orders, address (with errors), delivery, payment (with decline), review, confirmation and orders: no horizontal overflow, no clipped control, one `h1`, no console errors; primary controls >=44px at 375. Axe: zero critical/serious on every checkout state, confirmation, orders and both empty states (both projects). Secret, payment-data and Amazon-URL scans clean; the only full card numbers are the two documented test constants (and the input placeholder showing the approved one). Not yet done: redeploying and the production smoke (G1).

