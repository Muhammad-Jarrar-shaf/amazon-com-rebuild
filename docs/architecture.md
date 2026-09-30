# Architecture

The simplest architecture that can deliver a polished, reliable golden path (J1) in the time available. Requirements: [requirements.md](requirements.md). Decisions with rationale: [ADR-0001](decisions/0001-next-16-3-7-pinned.md), [ADR-0002](decisions/0002-guest-checkout-deterministic-mock.md), [ADR-0003](decisions/0003-seeded-catalog-no-db.md), [ADR-0004](decisions/0004-asset-strategy.md).

## 1. System overview
One Next.js app, no database, no external services, no secrets. Catalog data ships in the repo and is read on the server; the cart and orders live in the visitor's browser. Deployed to Vercel.

```
Browser ── server-rendered pages (Server Components) ── lib/catalog ── data/products/*
   │                                                        ▲
   └── client islands: SearchBox, Gallery/Variants, Cart, Checkout
            │  Zustand store (cart, orders) ⇄ localStorage
            └─ lib/pricing, lib/checkout, lib/clock (pure, shared)
```

## 2. Stack (exact versions verified 2026-09-30; re-verified at S0, see ADR-0001)
| Piece | Choice |
|---|---|
| Framework | `next@16.3.7`, exact pin, App Router (16.x = Active LTS) |
| UI runtime | `react@19.3.0`, `react-dom@19.3.0` |
| Language | TypeScript `6.0.3` (7.0.2 has no JS API and is incompatible with typescript-eslint and Next's typecheck; see ADR-0001), `strict: true`, `noUncheckedIndexedAccess: true` |
| Lint | ESLint `9.39.5` + `eslint-config-next@16.3.7` (flat config); ESLint 10 is outside the peer range of the bundled plugins |
| Styling | Tailwind CSS 4.3.3 via `@tailwindcss/postcss`; design tokens as CSS variables (see [ux-spec.md](ux-spec.md)) |
| State | `zustand@5.0.15` for the cart/order store only |
| Tests | `vitest@5.0.2`, `@playwright/test@1.63.0` (S0); `@axe-core/playwright@4.13.0` and `zustand@5.0.15` are added when first used (row T and S4) |
| Package manager / runtime | pnpm 11.22.0; deploy runtime Node 24 (`engines.node >=24`, `.nvmrc` 24; Vercel offers 24/22/20, not 26); local dev on Node 26.7.0 |
No other runtime dependencies without an ADR or a written justification in the commit message ([CLAUDE.md](../CLAUDE.md)).

## 3. Server / client boundary
- **Server Components (default):** layout shell, home, results (`/s`), PDP (`/dp/[id]`), category pages, static footer. They call `lib/catalog` directly; no Route Handlers or Server Actions in MVP.
- **Client Components (opt-in with `"use client"`):** shell interactivity (`SearchBar`, `MenuButton`, `NavDrawer` on a native `<dialog>`, `MobileBanner`), `SearchBox` (suggestions, keyboard, built on the shell's `SearchBar` in S3), `FilterDrawer`/`SortSelect` (URL updates), `Gallery` + `VariantPicker` + `BuyBox` (PDP interactivity), `MiniCart`, cart page, checkout stepper, `HeroCarousel`.
- Client components receive plain serializable props (product DTOs), never functions or class instances.
- **Bundle rule (S2):** client components must not import `lib/catalog` (its index imports the seed data, so the whole catalog would ship to every browser). They use the data-free modules instead: `lib/catalog/types`, `lib/catalog/variants` (default/selected variant, availability), `lib/pricing`, `lib/quantity`, `lib/purchase` (takes a product or the cart's projection) and `lib/cart/{types,model,lookup,persistence,store}`.
- **Product page composition (S2):** `app/dp/[id]/page.tsx` (server, dynamic: it reads `?variant=`) looks up the product and renders one `.pdp-grid` inside a client `ProductProvider`, which holds the selected variant and quantity. Server components (header/rating, About, details, related rail) stay static; client components (`ProductGallery`, `PriceBlock`, `VariantPicker`, `BuyBox`) read the provider so one variant change updates image, price, availability and the URL together. Grid areas rearrange the same DOM per breakpoint (`.pdp-grid` in `app/globals.css`).
- Anything reading `localStorage` renders a stable server placeholder first and hydrates after mount to avoid hydration mismatch (e.g. cart count shows after mount).

## 4. Data
- `data/products/<department>.ts` (six files, aggregated by `data/products/index.ts`): typed `Product` records (id, title, brand, byline, department, category, description, bullets, specs, variants, rating, ratingCount, boughtPastMonth, badge, shipping, seller, relatedIds, tags, featuredRank). Each variant carries its own price, compare-at price, images, stock and shipping restriction; availability is derived from stock and the restriction (`lib/availability`), never stored. 30 products across 6 departments; the headphone family is the fully populated hero (3 colors, a 3-image gallery, distinct prices, one unavailable variant). `data/images.ts` builds `ImageRef`s (a local photo path, or `null` for the generated illustration). Seed integrity is enforced by `lib/catalog/data.test.ts`.
- `lib/catalog` (server-side; imports the seed data): `getAllProducts`, `getProductById`, `getProductsByDepartment`, `getRelatedProducts`, `getFeaturedProducts` (rank order, stable), `getBreadcrumb`, `getDisplayPrice`, and the S3-ready `getSearchIndex`/`toSearchRecord`/`normalizeSearchText`. Variant helpers live in the data-free `lib/catalog/variants.ts` and are re-exported. Search lives in `lib/search` (section 5).
- Search modules (`lib/search/`): `text` (normalize, tokenize, stem), `types` (SearchState, sort keys, price ranges), `url` (parse/build/update helpers), `engine` (score, filter, facets, sort, paginate, `runSearch`), `suggest` (client-safe autocomplete), `summary` (count line, price labels) and `server` (the only module that imports the catalog: `searchCatalog`, `getSuggestionTerms`, `POPULAR_QUERIES`).

## 5. Search: URL contract, ranking, refinements (S3)
**The URL is the only search state.** `parseSearchParams` (`lib/search/url.ts`) turns it into a `SearchState`; nothing is mirrored in React state. `buildSearchUrl` is the inverse (stable parameter order, defaults omitted); a round-trip test covers it. Parsing never throws: malformed values fall back to the default for that parameter.

| Param | Meaning | Notes |
|---|---|---|
| `k` | free-text query | `q` is accepted as an alias when reading; control characters and whitespace are cleaned, capped at 100 characters |
| `dept` | department slug | unknown slugs are ignored |
| `brand` | brand name, **repeated** (`brand=A&brand=B`) | OR within the facet; deduplicated, at most 12 |
| `rating` | `4` | the only rating filter ("4 Stars & Up"); other values ignored |
| `min`, `max` | price bounds in **whole dollars** | `min` inclusive; `max` keeps prices up to `max.99` (`max=49` keeps $49.99); inverted bounds are swapped; compared against each product's default-variant price, in integer cents |
| `sort` | `price-asc` \| `price-desc` \| `rating` | `featured` is the default and is omitted |
| `page` | 1-based | omitted for page 1; invalid values mean 1; a page past the end **redirects (307) to the last page** |

`/s` needs a query, a department or a filter to show results; with none it shows search guidance (not an error). Category browsing is `dept=` on the same route (`/s?dept=books`): the header picker, the menu, the footer and the breadcrumb all use it. A product's byline links to `/s?k=<brand>`.

**Ranking** (`lib/search/engine.ts`, pure and deterministic): the query is normalized and split into words; every word must match (AND). A word's score is its best field: exact word = full weight, word prefix = 60%, with weights title 100, brand 80, category 60, tag 40, department 20 (light plural stemming, so "headphones" finds "headphone"). A phrase found in the title adds 300 and a title that starts with the query adds 100. Ties break by featured rank, then rating, review count and id, so the order never depends on input order. An empty query returns the department (or everything) in that default order. There is no search backend.

**Pipeline** (`runSearch`): search and department -> brand/rating/price filters -> sort (`featured` keeps relevance order; price and rating sorts are stable) -> paginate (16 per page, page clamped). Refinement counts are computed without the facet's own selection, so choosing a brand never hides the other brands.

**Suggestions** (`lib/search/suggest.ts`): computed in the browser from a small term list (popular queries, categories, brands, tags: about 4 KB) that the server derives from the catalog and passes to the search bar as a prop, so no request is made while typing and the client never imports the catalog. At least 2 characters, at most 8 results: terms that start with the input first, then terms where every typed word starts a word; popular queries outrank categories, brands and tags; ranking happens before de-duplication so the result never depends on the term order.

**Client behavior:** the header search bar and the refinements are client components that navigate with `router.push`. Controls that navigate are **optimistic** (`useOptimistic` in a transition) so a checkbox or the sort select responds at once, and links inside the refinements are built from that same optimistic state so a pending selection is never dropped. **Links to `/s` are not prefetched**: prefetched head data was reused across different search URLs on client navigation and showed the wrong tab title.

The product variant is `?variant=<id>` (PDP) and the checkout step `?step=` (S5).

## 6. Cart and orders
- **Cart store (S4, as built):** one canonical vanilla Zustand store (`lib/cart/store.ts`; `cartStore` + `useCart` selector hook; `createCartStore()` for tests) shared by the product page, result rows, mini-cart, cart page and header badge. Lines are `{productId, variantId, quantity}` only; **identity is product + variant** (two colors are two lines). Totals, titles and prices are never stored: `lib/cart/model.ts` (pure, unit-tested) recomputes them from the catalog through `lib/pricing` (integer cents). Actions: `add` (validates with `resolvePurchase`, merges, caps at 10 / stock), `setQuantity` (integers >= 1, capped; removal is a separate action), `remove` (one-slot `lastRemoved` for Undo, restored at its old position; session only), `undo`, `hydrate`, mini-cart open/close.
- **Catalog boundary:** the client never imports the catalog. The server layout passes `CartProvider` a compact `CartLookup` projection (title, variant labels, prices, stock, primary image per variant; `lib/cart/lookup.ts` is data-free, `lib/cart/server.ts` is the only server-side importer). Trade-off: about 15 KB of props on every page in exchange for no backend and no per-page fetch; revisit if the catalog grows.
- **Persistence:** `localStorage` key `cart:v1` holding `{version: 1, lines}` (`lib/cart/persistence.ts`). Hydration happens in a layout effect in `CartProvider`; storage is written only after hydration (an unread cart is never overwritten) and every read/write is wrapped so blocked or full storage leaves an in-memory cart. Untrusted data is sanitized line by line: unknown product/variant, unavailable variant or invalid quantity are removed, over-limit quantities reduced, duplicates merged, prototype-named ids ignored (`Object.hasOwn`). Unreadable JSON, wrong shape or another version resets to an empty cart. Any recovery sets a shopper-visible notice (mini-cart and cart page). Changing the shape means a new key/version, never in-place guessing.
- `orders:v1` in `localStorage` holds the order snapshots and a monotonic `seq` that derives the order number (FR-ORD-2); `checkout:v1` holds the checkout progress. Both are described under section 8.
- Cross-tab consistency: the cart re-hydrates from the `storage` event (implemented in `connectCartStorage`).

## 7. Money, time, determinism
- **Integer cents** everywhere; `lib/pricing` is the only place that computes line totals, savings %, shipping, tax (flat 8%, round half up) and order total. UI formats with one `formatMoney(cents)`.
- `lib/clock` exposes `now()`; production returns real time, and setting `APP_FIXED_NOW` (an ISO timestamp) pins it. The Playwright web server sets it to `2026-10-01T12:00:00Z`, so delivery estimates are exact in tests. Delivery ETAs and order dates go through it (`lib/delivery` adds business days in UTC).

## 8. Deterministic mock checkout
**As built (S5).** No network calls anywhere in checkout; everything is client-side and deterministic.

- **Modules.** `lib/checkout/*` is pure logic and small stores: `address.ts` (`validateAddress`, US states), `delivery.ts` (the three options, ETAs from an injected `now`), `payment.ts` (`validatePayment`: Luhn, expiry against the clock, CVC, the two test cards), `state.ts` (step guards and transitions), `persistence.ts` (`checkout:v1`), `store.ts` (Zustand store + storage connection), `place-order.ts` (the one operation that touches cart, orders and checkout stores). `lib/orders/*`: `types.ts`, `create.ts` (`createOrder`, `formatOrderId`), `persistence.ts` (`orders:v1`), `store.ts`. `lib/pricing.ts` gained `taxCents` and `orderTotals` (subtotal + delivery + 8% tax, half up). `components/checkout/*` and `components/orders/*` are presentation only; `app/checkout`, `app/orders`, `app/orders/[id]/confirmation` are thin routes.
- **Checkout state model.** One typed `CheckoutState`: `{address (raw strings), deliveryId | null, payment {brand, last4} | null, submissionId}`. Step completeness is *derived* by validating that state (no stored "step done" flags): `isStepComplete`, `firstIncompleteStep`, `canEnterStep` (a step opens only if every earlier one is complete). The step lives in the URL (`/checkout?step=address|delivery|payment|review`) and each transition is a `router.push`, so Back/Forward and reload work; a request for a step that is not yet reachable (or a missing/unknown `step`) is replaced with the first incomplete step and the shopper is told why. The address is saved as it is typed; the delivery choice is saved on selection; the payment step saves only `{brand, last4}` after validation. `checkout:v1` is versioned and parsed field by field (unreadable data starts a fresh attempt with a visible notice).
- **Payment (TEST MODE).** Labeled on the payment and review steps. `4242 4242 4242 4242` is approved; `4000 0000 0000 0002` yields an inline "Your card was declined" alert (the form stays filled, the decline is not remembered, no order can follow); any other Luhn-valid card is rejected as an unsupported test card; malformed numbers, bad or past expiry and a non-3-digit CVC get field errors. The card number and CVC exist only in the payment component's state and are cleared on success; only brand and last four go on. Nothing is logged, persisted or sent (NFR-SEC-3, asserted by a unit test on the result and an E2E scan of all storage).
- **Order creation and idempotency.** `createOrder` is pure: it re-validates the cart lines against the catalog projection (`resolvePurchase`), re-validates address, delivery and payment, and recomputes every total through `lib/pricing`, so nothing shown earlier is trusted. It is **idempotent per `submissionId`**: if an order already exists for the checkout attempt it returns that order and creates nothing (even if the cart was already cleared). `ordersStore.place` re-reads `orders:v1` at the moment of placement and commits synchronously, so a repeat call or a second tab sees the existing order. `placeOrder` writes the order first, *then* clears the cart, *then* starts a new checkout attempt (new `submissionId`), so a failure part-way can never lose the cart or duplicate an order. **Defense in depth in the UI (S5 hardening):** the Place order handler holds a synchronous ref guard (many clicks in one tick run it once) and disables the button while busy; on success the step is replaced by an announced "Placing your order…" status, so no enabled Place order remains; and `ignoreRestOfGesture` (`components/checkout/ignore-rest-of-gesture.ts`) swallows clicks with `detail >= 2` until a fresh press (`mousedown` with `detail` 1). That last guard exists because of a real defect found by the strengthened E2E: the second press of a double click landed on the footer's "Computers" link once the shorter placing screen moved it under the pointer (and could equally land on a confirmation button). It is deterministic (no timers) and leaves keyboard activation (`detail` 0) and deliberate clicks alone.
- **Orders.** `orders:v1` = `{version: 1, seq, orders[]}`; each `Order` is a snapshot (items with title/variant text/unit and line cents, subtotal, delivery, tax, total, shipping name/address, delivery option and ETA, `{brand, last4}`, status `confirmed`) with no card number, CVC or phone. The order number is `111-NNNNNNN-NNNNNNN`, a deterministic function of the per-browser `seq`, which never decreases. Loading validates each order (shape, integer cents, line totals = unit x quantity, total = subtotal + shipping + tax), drops damaged or duplicate ones, and resets an unreadable store, each with a visible notice.
- **Time.** The server page passes the pinned clock (`APP_FIXED_NOW`) to the client as a prop (`null` in production); ETAs and `createdAt` use it, otherwise the real time. The checkout route is `force-dynamic` so the pinned value is read per request.
- **Favicon (S5 404 root cause).** `app/favicon.ico` (16/32/48 px PNG-in-ICO rendered from our own `app/icon.svg`) is served at `/favicon.ico` next to `icon.svg`. Browsers request `/favicon.ico` by convention when a document has no icon link; on the Review -> Confirmation client navigation Next briefly leaves the document with no `<link rel="icon">` (observed: about 11 ms across a task boundary, only on that transition), and a same-document navigation inside that window makes Chromium fetch the default `/favicon.ico`. It used to 404, which surfaced as J1's intermittent console error. Details and evidence: [testing-strategy.md](testing-strategy.md#9-s5-verification-and-defects).
- **Deliberate simplifications.** The standard site header is kept on checkout (the minimal checkout header in the ux-spec is not built); the order summary sits below the form on mobile instead of collapsing on top.

## 9. Assets
Per [ADR-0004](decisions/0004-asset-strategy.md): 13 licensed Unsplash photographs (WebP, 1200px, `public/assets/products/`) cover 9 Tier A products; credits are in `public/assets/CREDITS.md` and a unit test enforces that every used file is credited and every file is used. Every other product uses the generated `FallbackIllustration` (department glyph on a variant-tinted gradient), which `ProductImage` also renders when a photo fails to load (FR-ERR-3). No Amazon-hosted assets and no runtime image optimization (`images.unoptimized`).

## 10. Error handling
`app/not-found.tsx` (FR-ERR-1), `app/error.tsx` and `app/global-error.tsx` (FR-ERR-2), image `onError` fallback (FR-ERR-3), route-level `loading.tsx` for PDP/results skeletons.

## 11. Repository layout (target)
```
app/            routes (page.tsx, s/, dp/[id]/, cart/, checkout/, orders/, not-found.tsx, error.tsx)
components/     layout/, pdp/, search/, cart/, checkout/, orders/, ui/
lib/            catalog/{types,variants,index}, search/{text,types,url,engine,suggest,summary,server}, pricing, quantity, availability, delivery, format, color, clock, purchase, nav, departments, cart/{types,model,lookup,server,persistence,store}, checkout/{types,address,delivery,payment,state,persistence,store,place-order}, orders/{types,create,persistence,store}
data/           products/<department>.ts + index.ts, images.ts
public/         assets/products/*.webp, assets/CREDITS.md
tests/          unit (colocated *.test.ts) and e2e/ (Playwright)
docs/           this documentation
```

## 12. Testing architecture
Vitest for pure modules (`lib/*`, `data` validation); Playwright against `next build && next start` with two projects (desktop 1440, mobile 375) and `@axe-core/playwright` scans; the fixed clock is injected via a query flag/env in test builds only. Detail in [testing-strategy.md](testing-strategy.md).

## 13. Deployment architecture
Vercel project git-connected to the GitHub repo; production deploy from `main`, preview per branch; no environment secrets; `.env.example` documents (empty) variables. First deploy happens at the end of S0 (skeleton) so hosting risk is retired on day one. Fallback hosts (Netlify / Cloudflare Pages) are decided at S0, not later. Details and checkpoints: [delivery-plan.md](delivery-plan.md#deployment-plan).

## 14. Rejected alternatives
| Alternative | Why rejected |
|---|---|
| Database (Postgres/SQLite/KV) | Adds a failure mode and setup with no evaluator-visible benefit; seed data is static ([ADR-0003](decisions/0003-seeded-catalog-no-db.md)) |
| Real auth / OAuth | Amazon's own checkout is auth-gated, but requiring an account would block evaluators; guest checkout is deliberate ([ADR-0002](decisions/0002-guest-checkout-deterministic-mock.md)) |
| Real payment provider (even test mode) | Needs keys/secrets and network at demo time; a deterministic mock is safer |
| Vite SPA | Loses server rendering, route-level loading/error conventions and shareable server-rendered URLs |
| Next.js 15 (Maintenance LTS) | Active LTS 16.x is the supported line; pinned patched 16.3.7 ([ADR-0001](decisions/0001-next-16-3-7-pinned.md)) |
| Redux/other state libs, GraphQL, microservices | Unneeded for one small store and static data |
| `next/og`, Server Actions, Route Handlers | Not needed; recent Next advisories touched `next/og`, Image Optimization and Server Actions, so we avoid the surface |
| Hotlinking or copying Amazon images | Legal and reliability risk ([ADR-0004](decisions/0004-asset-strategy.md)) |
| ~40 photographs | Time sink; visual quality comes from a tight, coherent asset set |
