# Delivery Plan

Slices, gate, time budget, cut order, deployment and demo. Requirements: [requirements.md](requirements.md). Architecture: [architecture.md](architecture.md). Tests: [testing-strategy.md](testing-strategy.md).

**Clock:** planning checkpoint **T0 = 2026-09-30T11:11Z**; hard budget **20.0h**, so the assumed deadline is **2026-10-01T07:11Z**. Budget is elapsed working hours; sleep and breaks are not scheduled, so if the real deadline is earlier, rescale by cutting from the cut order below (never the gate items).

## Journeys
| # | Journey | Steps | Expected | Success / edges |
|---|---|---|---|---|
| **J1** golden path | Home -> type "headphones" (suggestion or Enter) -> results -> sort by price -> open product -> choose color -> qty 2 -> Add to cart -> Cart -> Proceed to checkout -> address -> delivery -> test card -> review -> Place order | Confirmation with order #, items, totals, ETA; cart empties; badge 0 | Completes unaided; reload mid-checkout keeps state; Back works; double-click on Place order creates one order |
| J2 browse | Home category card -> results -> Brand + 4-star filter -> page 2 | List updates; URL reflects state; deep link restores | Zero results shows empty state + Clear filters |
| J3 cart | 2 items -> change qty -> delete -> Undo -> reload | Inline subtotal; persistence | qty clamped 1-10; out-of-stock cannot be added |
| J4 mobile smoke | J1 at 375px | No horizontal overflow; drawer nav; tap targets >=44px | Filters in a drawer |
| J5 error/edge | Search "zzzz"; bad `/dp/xxx`; invalid address; declined card | Empty state; 404 with search; inline errors; declined alert | No console errors |

## Scope summary
- **Core MVP (hard gate):** Home -> Search -> Results -> PDP -> Variant/Quantity -> Add to Cart -> Cart -> Guest Checkout -> Order Confirmation, plus shell, orders list, empty/error states, cart persistence, deployed.
- **Stretch (only after G1 and only if S0-S7 are green):** Buy Now (first), Save for later, wishlist, frequently bought together, recently viewed, review list/histogram, image zoom, promo code, hero autoplay, mock sign-in page, Today's Deals page, extra facets/sorts, PDP lower-page content.
- **Out of scope:** real payments/auth/accounts/DB, sellers/marketplace, Prime/Video/Music/Kindle, ads/sponsored/recommendation ML, order tracking, returns, i18n/currency/geolocation, admin, real catalog scale, review submission, Alexa/Rufus.

## Slices
Each slice ends with `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green, its own tests written, and a deploy. "Files" are target locations from [architecture.md](architecture.md#11-repository-layout-target).

| # | Objective | Files/modules | Depends on | Verification | Done when |
|---|---|---|---|---|---|
| **S0** | **Deployable skeleton**: scaffold Next 16.3.7 + TS strict + Tailwind, tokens, scripts (`typecheck`, `lint`, `test`, `e2e`, `build`), placeholder home, Vercel deploy | `app/`, `package.json`, `tailwind`/`tsconfig`, `.nvmrc`, `.env.example` | this plan approved; Vercel access | `pnpm build` green; `pnpm audit` clean; public URL loads; redeploy works; ADR-0001 updated with exact installed versions | URL live |
| **S1** | Shell: header (search + dept select + cart badge), sub-nav, footer, mobile drawer, minimal home | `components/layout/*`, `app/page.tsx` | S0 | FR-NAV-*, FR-HOME-4; visual at 375/768/1440; axe on home | No overflow at 375 |
| **S2** | Catalog + pricing + PDP: seed data, assets, `lib/catalog`, `lib/pricing`, `/dp/[id]` (gallery, variants, availability, qty, ETA, related, 404) | `data/`, `lib/`, `components/pdp/*`, `app/dp/` | S1 | FR-PDP-1..10; unit: pricing/catalog/data validation; axe on PDP | PDP matches [ux-spec.md](ux-spec.md) |
| **S3** | Search + results: box + suggestions, `/s`, sort, 3 filters, pagination, empty state | `lib/url.ts`, `components/search/*`, `app/s/` | S2 | FR-SRCH-*; unit: search/filter/sort/url; E2E browse | URL state restores |
| **S4** | Cart: store, mini-cart, `/cart`, stepper, delete/Undo, persistence | `lib/cart-store.ts`, `components/cart/*`, `app/cart/` | S2 | FR-CART-*; unit: cart; E2E cart | Survives reload |
| **S5** | Checkout + confirmation + orders: stepper, validation, mock payment, `createOrder`, confirmation, `/orders` | `lib/checkout.ts`, `lib/orders.ts`, `components/checkout/*`, `app/checkout/`, `app/orders/` | S4 | FR-CHK-*, FR-ORD-*; unit: checkout/orders | Order created once |
| **T** | **Test harness for G1**: Playwright config (desktop+mobile), fixed clock, axe helper, J1 desktop + J4 mobile smoke + errors | `tests/e2e/*`, `playwright.config.ts` | S5 | Tests pass locally on a prod build | Green locally |
| **G1** | **GATE: J1 desktop + J4 mobile smoke + axe zero critical/serious pass on the DEPLOYED build.** Occurs after S5 and T, before any polish or stretch. If it fails, all other work stops until it passes | | S0-S5, T | Production smoke | Signed off |
| **S6** | Full home: hero carousel, category cards, product rail | `app/page.tsx`, `components/home/*` | G1 | FR-HOME-1..3; axe; visual | Matches [product-recon.md](product-recon.md) |
| **S7** | Responsive + a11y + states pass | all | S6 | Manual checklist; axe zero serious; NFR-RESP-1/A11Y-* | Checklist complete |
| **S8** | Visual polish; time-boxed stretch (Buy Now first) | | S7 | Re-run all tests | No regressions |
| **S9** | Deployment hardening + production QA | | S8 | Production smoke; cold-clone rebuild from README | Acceptance met |
| **S10** | README, walkthrough rehearsal, final log commit | | S9 | Rehearse <=5 min | Submission ready |

## Time budget
Exactly **20.00h** from T0 (2026-09-30T11:11Z). Unit tests are inside each slice; row **T** is the E2E/axe harness and production smoke needed for G1.

| Item | h | Cumulative h | Ends at (UTC) |
|---|---|---|---|
| Planning docs + plan commit | 0.75 | 0.75 | 09-30 11:56 |
| S0 deployable skeleton | 1.25 | 2.00 | 13:11 |
| S1 shell | 1.00 | 3.00 | 14:11 |
| S2 catalog + pricing + PDP + assets | 2.50 | 5.50 | 16:41 |
| S3 search/results | 1.75 | 7.25 | 18:26 |
| S4 cart | 1.25 | 8.50 | 19:41 |
| S5 checkout + confirmation + orders | 2.25 | 10.75 | 21:56 |
| T harness + E2E + axe + G1 on deployed build | 1.75 | 12.50 | 23:41 (**G1 deadline**) |
| S6 full home | 1.00 | 13.50 | 10-01 00:41 |
| S7 responsive + a11y + states | 1.00 | 14.50 | 01:41 |
| S8 visual polish (+ stretch if time) | 1.25 | 15.75 | 02:56 |
| S9 deployment hardening + production QA | 1.00 | 16.75 | 03:56 |
| S10 README + walkthrough prep | 0.75 | 17.50 | 04:41 |
| **Contingency (12.5%)** | 2.50 | **20.00** | **07:11** |
Sum check: 0.75+1.25+1.00+2.50+1.75+1.25+2.25+1.75+1.00+1.00+1.25+1.00+0.75+2.50 = 20.00. Implementation slices S0-S6 = 11.0h + harness 1.75h.

## Checkpoints
| When | Must be true | If not |
|---|---|---|
| T+2.00 | Public URL live from the skeleton | Switch host now (fallback decided at S0) |
| T+5.50 | PDP complete, pricing tested | Cut PDP related rail polish, keep gallery/variants/qty/ATC |
| T+8.50 | Cart works end to end from PDP | Freeze search extras |
| T+10.75 | Checkout produces a confirmation | Simplify review UI, keep validation + idempotency |
| **T+12.50 (G1)** | J1 + J4 + axe pass on deployed build | Stop everything else; spend contingency here first |
| T+17.50 | README + rehearsal done | Use contingency for QA, not features |
Contingency is spent only when a checkpoint slips; unused contingency goes to production QA, never to new features.

## Cut order (if behind)
1. S8 stretch items. 2. Extra home rails beyond one, hero polish. 3. Visual polish. 4. Extra filters/sorts beyond the approved set. 5. Mobile refinements beyond NFR-RESP/NFR-A11Y. **Never cut:** S0-S5, T, G1, the axe gate, mobile no-overflow, the deploy.

## Deployment plan
- **Host:** Vercel, git-connected to https://github.com/Muhammad-Jarrar-shaf/amazon-com-rebuild; production from `main`; no environment secrets; `.env.example` documented.
- **Dependency on the owner:** a Vercel login and connecting the repo (pushing is done when the owner says so; fallback is a `vercel` CLI deploy from the owner's machine; other fallbacks Netlify/Cloudflare Pages, decided at S0).
- **Checkpoints:** S0 (skeleton live), every slice (redeploy), G1 (production smoke), S9 (cold-clone rebuild + smoke + `next` version check), S10 (final URL recorded in README).
- **Pinning:** `next` exact `16.3.7` unless re-verification at S0 finds a newer patched 16.3.x ([ADR-0001](decisions/0001-next-16-3-7-pinned.md)). Re-verified at S0: still `latest`.
- **S0 deployment status (2026-09-30): NOT DEPLOYED, external blocker.** The project builds and passes typecheck, lint, unit tests, E2E (desktop + 375px mobile) and `pnpm audit` locally, and is prepared for deployment (expected, not yet verified by a real Vercel build: Vercel should auto-detect Next.js and pnpm and use Node 24 from `engines.node >=24`, a version its docs list as supported; no env vars are needed). Blocker: no Vercel credentials exist on this machine (no CLI, no login state, no token in the environment), and Vercel login is an interactive browser step. No provider switch was made. Shortest unblock, either:
  1. **Owner runs the CLI (no push needed):** `pnpm dlx vercel login`, then `pnpm dlx vercel --prod` from the repo root; accept the detected Next.js defaults and create project `amazon-com-rebuild`.
  2. **Git-connected:** when the owner authorizes a push, push `main` and import the repo at vercel.com/new.
  After either, verify with `E2E_BASE_URL=<deployment url> pnpm e2e` and record the URL here. The T+2.00 checkpoint (public URL live) is **not met** until then.

## Acceptance criteria
Public HTTPS URL, no login (NFR-DEP-1) · J1 passes on the deployed build, desktop + mobile smoke · no broken primary controls (link/button audit along J1) · `pnpm build` succeeds (NFR-DEP-2) · critical unit + E2E tests pass (NFR-TEST-1/2) · axe: zero critical/serious on the six pages (NFR-A11Y-1) · keyboard-operable primary controls with visible focus, landmarks, labels (NFR-A11Y-2..5) · >=44px tap targets and no overflow at 375px (NFR-A11Y-6, NFR-RESP-1) · Lighthouse recorded as a diagnostic only (NFR-PERF-1) · no secrets committed and `.env.example` present (NFR-SEC-1) · no Amazon-hosted assets (NFR-SEC-2) · README covers run/test/deploy/decisions · `.agent-logs/` committed and unmodified (NFR-LOG-1) · deploy reproducible from the README (NFR-DEP-3) · walkthrough completable in <=5 minutes.

## Demo strategy (<=5 min)
1. **Home, desktop (0:30):** the search-first hierarchy and category cards.
2. **Search (1:00):** type "headphones", show suggestions, pick, sort by price, apply Brand + rating filter.
3. **PDP (0:45):** swatch changes image and price, quantity 2, Add to cart, mini-cart.
4. **Cart (0:30):** inline subtotal, delete + Undo.
5. **Guest checkout (1:00):** address, delivery, test card, review, place order, confirmation.
6. **Mobile 375 (0:30):** same path, no overflow.
7. **Architecture and trade-offs (1:00):** URL as state, integer-cent pricing, Server Components for the catalog, no DB/real auth on purpose, the guest-checkout deviation and that Amazon's checkout is auth-gated (so ours is designed, not copied).
- **Do not spend time on:** footer/static pages, stretch features, code tours, the capture tooling.
- **1-minute intro should convey:** how I scoped a 24-hour clone (observe first, cut monetization, protect the purchase path), how the committed agent logs show plan-first and verify-before-claim, and one reversed decision (the v1 schedule that did not add up; re-verifying the Next.js version instead of assuming it).
- Prep: rehearse twice against the production URL in S10; keep the test card written on a note.
