# Architecture

The simplest architecture that can deliver a polished, reliable golden path (J1) in the time available. Requirements: [requirements.md](requirements.md). Decisions with rationale: [ADR-0001](decisions/0001-next-16-3-7-pinned.md), [ADR-0002](decisions/0002-guest-checkout-deterministic-mock.md), [ADR-0003](decisions/0003-seeded-catalog-no-db.md), [ADR-0004](decisions/0004-asset-strategy.md).

## 1. System overview
One Next.js app, no database, no external services, no secrets. Catalog data ships in the repo and is read on the server; the cart and orders live in the visitor's browser. Deployed to Vercel.

```
Browser ── server-rendered pages (Server Components) ── lib/catalog ── data/products.ts
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
- **Client Components (opt-in with `"use client"`):** `SearchBox` (suggestions, keyboard), `FilterDrawer`/`SortSelect` (URL updates), `Gallery` + `VariantPicker` + `BuyBox` (PDP interactivity), `MiniCart`, cart page, checkout stepper, `HeroCarousel`.
- Client components receive plain serializable props (product DTOs), never functions or class instances.
- Anything reading `localStorage` renders a stable server placeholder first and hydrates after mount to avoid hydration mismatch (e.g. cart count shows after mount).

## 4. Data
- `data/products.ts`: typed array of `Product` (id, slug, title, brand, department, tags, priceCents, listPriceCents?, rating, ratingCount, variants[], images, bullets[], specs{}, stock, shipping flags). About 30 products across about 6 departments; the hero journey (headphones family) is fully populated with 3 color variants; supporting products may have one variant. Validated at build/test time with a schema check (unique ids, variant references valid, images exist or fallback allowed).
- `lib/catalog`: pure functions: `search(query, {dept})`, `suggest(prefix)`, `applyFilters(list, {brands, minRating, priceMin, priceMax})`, `sortBy(list, key)`, `paginate(list, page, size=16)`, `getById`, `related(product)`. All deterministic and unit-tested.
- Search scoring: tokenized case-insensitive match over title, brand, tags, department; weighted (title > brand > tags); ties by featured rank.

## 5. URL-driven search state
`/s?k=<q>&dept=<d>&brand=<b1,b2>&rating=4&min=<cents>&max=<cents>&sort=<key>&page=<n>` is the single source of truth. A pure `parseSearchParams`/`buildSearchUrl` pair (unit-tested round-trip) is shared by server pages and client controls. Changing a control pushes a new URL; results are re-rendered on the server. PDP variant is `?variant=<id>`; checkout step is `?step=`.

## 6. Cart and orders
- Zustand store `useCart`: lines `{productId, variantId, qty}` only (no prices stored; prices always resolved from the catalog). Actions: `add`, `setQty`, `remove` (keeps a one-slot `lastRemoved` for Undo), `clear`. Persist middleware -> `localStorage` key `cart:v1`, with a version field and safe parse (corrupt/unknown data is discarded, never crashes).
- `orders:v1` in `localStorage`: array of order snapshots `{id, createdAt, lines (with priced snapshot), address, delivery, paymentLast4, totals}`; a monotonic `orderSeq` derives the order number (FR-ORD-2).
- Cross-tab consistency: the store listens to the `storage` event.

## 7. Money, time, determinism
- **Integer cents** everywhere; `lib/pricing` is the only place that computes line totals, savings %, shipping, tax (flat 8%, round half up) and order total. UI formats with one `formatMoney(cents)`.
- `lib/clock` exposes `now()`; production returns real time, tests set a fixed instant. Delivery ETAs and order dates go through it.

## 8. Deterministic mock checkout
Pure `lib/checkout`: `validateAddress`, `validatePayment` (Luhn + test-card table: `4242...` OK, `4000 0000 0000 0002` declined), `deliveryOptions(clock)`, `createOrder(cart, catalog, input)` which recomputes totals from the catalog and returns an order or a typed error. Idempotency: the checkout holds a `submissionId` per attempt; `createOrder` refuses a second order for the same `submissionId` and the button is disabled while pending. Only last-4 and brand are kept; full number and CVC live in component state and are discarded after validation (NFR-SEC-3). No network calls.

## 9. Assets
Per [ADR-0004](decisions/0004-asset-strategy.md): about 8-10 licensed photographs for the demo journey (pre-sized WebP in `public/products/`, credited in `public/products/CREDITS.md`), plus a generated `ProductImage` illustration fallback for all other products. No Amazon-hosted assets. Images are static files, so nothing depends on runtime image optimization.

## 10. Error handling
`app/not-found.tsx` (FR-ERR-1), `app/error.tsx` and `app/global-error.tsx` (FR-ERR-2), image `onError` fallback (FR-ERR-3), route-level `loading.tsx` for PDP/results skeletons.

## 11. Repository layout (target)
```
app/            routes (page.tsx, s/, dp/[id]/, cart/, checkout/, orders/, not-found.tsx, error.tsx)
components/     layout/, search/, pdp/, cart/, checkout/, ui/
lib/            catalog/, pricing.ts, cart-store.ts, orders.ts, checkout.ts, clock.ts, url.ts
data/           products.ts
public/         products/ (+CREDITS.md), fonts/ if any
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
