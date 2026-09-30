# Requirements

Testable requirements derived from the approved plan. Each has an ID referenced by [ux-spec.md](ux-spec.md), [testing-strategy.md](testing-strategy.md) and [delivery-plan.md](delivery-plan.md). Origin tags: **[O]** modeled on observed Amazon behavior, **[D]** our design decision (see [product-recon.md](product-recon.md)). Priority: **MVP** is the hard gate; **Stretch** only after gate G1.

Journeys: **J1** golden path, **J2** browse, **J3** cart, **J4** mobile smoke, **J5** error/edge. Full definitions in [delivery-plan.md](delivery-plan.md#journeys).

## Functional

### Shell and navigation
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-NAV-1 | Every page has a header: logo links to `/`; search with department dropdown; "Returns & Orders" links to `/orders`; cart icon links to `/cart` and shows the live item count | O | MVP | all |
| FR-NAV-2 | A sub-nav lists departments; each links to results scoped to that department | O | MVP | J2 |
| FR-NAV-3 | Footer with link columns and a "Back to top" control that scrolls to top | O | MVP | |
| FR-NAV-4 | Below 768px: hamburger opens a drawer with departments; search is a full-width row under the top row; a horizontally scrollable chip nav is shown | O | MVP | J4 |

### Home
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-HOME-1 | Hero carousel with 3-4 slides, previous/next buttons (keyboard operable); each slide links to a results page | O | MVP (S6) | J1 |
| FR-HOME-2 | At least 8 category cards, 4 per row at >=1024px, each with a headline and 2x2 captioned tiles that link to scoped results | O | MVP (S6) | J2 |
| FR-HOME-3 | At least one product rail whose items link to PDPs | O | MVP (S6) | |
| FR-HOME-4 | A minimal home (search + a few category tiles) exists from S1 so J1 can start on `/` before S6 | D | MVP | J1 |

### Search and results
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-SRCH-1 | Submitting the header search (Enter or button) navigates to `/s?k=<query>` | O | MVP | J1 |
| FR-SRCH-2 | After >=2 typed characters, up to 8 local suggestions appear; Up/Down moves, Enter selects, Esc closes; suggestions come from product titles and a short popular-queries list | O/D | MVP | J1 |
| FR-SRCH-3 | Each result is a list row with image, title, rating + count, price (dollars + superscript cents), was-price when discounted, delivery estimate, and an Add to cart or "See options" button (See options when the product has >1 variant) | O | MVP | J1 |
| FR-SRCH-4 | Sort: Featured, Price low to high, Price high to low, Avg. review; the choice is in the URL (`sort=`) | O/D | MVP | J1, J2 |
| FR-SRCH-5 | Filters: Brand (multi-select), Rating (4 stars & up), Price range; filters combine with AND; each is in the URL; a "Clear filters" control resets them | O/D | MVP | J2 |
| FR-SRCH-6 | 16 results per page with numbered pagination (Previous, page numbers, Next); the page is in the URL (`page=`); the result count line reads "1-16 of N results for <query>" | O | MVP | J2 |
| FR-SRCH-7 | Zero results shows an explanatory empty state, the query, a Clear filters action when filters are active, and a link to browse departments | D | MVP | J5 |
| FR-SRCH-8 | The department dropdown scopes the search (`dept=`); Home category tiles and sub-nav use the same results view | O | MVP | J2 |
| FR-SRCH-9 | Reloading or sharing any results URL restores the same query, filters, sort and page | D | MVP | J2 |

### Product detail
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-PDP-1 | `/dp/<id>` renders one product; an unknown id renders the 404 page with a search box | O/D | MVP | J5 |
| FR-PDP-2 | Gallery: thumbnails plus a main image; selecting a thumbnail changes the main image | O | MVP | J1 |
| FR-PDP-3 | Shows title, byline, rating + review count, price, and when discounted the was-price and "Save N%" | O | MVP | J1 |
| FR-PDP-4 | Variant swatches (color) each show their own price; selecting one updates the main image, price, availability, and the `variant=` URL parameter | O | MVP | J1 |
| FR-PDP-5 | Availability states: In Stock; "Only N left" when stock <=5; Out of stock, which disables Add to cart and quantity and shows an unavailable message | O/D | MVP | J3, J5 |
| FR-PDP-6 | Delivery estimate: a date computed from the injectable clock, shown in the buy box | O/D | MVP | J1 |
| FR-PDP-7 | Quantity selector allows 1-10 | O/D | MVP | J1 |
| FR-PDP-8 | Add to cart adds the selected variant x quantity, opens the mini-cart, and updates the header count | O | MVP | J1 |
| FR-PDP-9 | "About this item" bullets and a specifications table | O | MVP | |
| FR-PDP-10 | A related-products rail with at least 4 items linking to PDPs | O | MVP | |
| FR-PDP-11 | Buy Now: adds the item and goes straight to `/checkout` | O | Stretch | |
| FR-PDP-12 | Lower-page content (frequently bought together, from the brand, what's in the box, reviews list) | O | Stretch | |

### Cart
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-CART-1 | Cart persists across reload and new tabs in the same browser (localStorage) | O | MVP | J3 |
| FR-CART-2 | Adding the same product+variant merges quantities; quantity per line is clamped to 1-10 | D | MVP | J3 |
| FR-CART-3 | Stepper (-, qty, +) updates the line quantity; the subtotal, "Subtotal (N items)" label and header count update inline with no page reload; a brief pending state is shown on the row | O | MVP | J3 |
| FR-CART-4 | Deleting a line shows an inline "<title> was removed from Shopping Cart." message with an Undo action that restores the line | O + D (Undo) | MVP | J3 |
| FR-CART-5 | The mini-cart opened by Add to cart shows the added item, subtotal, "Go to Cart" and "Proceed to checkout" | O/D | MVP | J1 |
| FR-CART-6 | Empty cart shows an empty state with a link to continue shopping; "Proceed to checkout" is not offered | D | MVP | J3 |
| FR-CART-7 | "Proceed to checkout" navigates to `/checkout` without any sign-in | D | MVP | J1 |

### Checkout (guest, deterministic mock; see [ADR-0002](decisions/0002-guest-checkout-deterministic-mock.md))
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-CHK-1 | `/checkout` is a stepper: Address, Delivery, Payment, Review; each step has a URL (`?step=`) and survives reload; visiting with an empty cart redirects to `/cart` | D | MVP | J1 |
| FR-CHK-2 | Address fields: full name, street, city, state, ZIP (5 digits or 5+4), phone (10 digits); each field has a visible label and inline error text; Continue is blocked until valid | D | MVP | J1, J5 |
| FR-CHK-3 | Three delivery options with fixed prices (Standard $0.00, Expedited $9.99, One-day $19.99) and ETAs from the injectable clock; the selected option changes the shipping line and the total immediately | D | MVP | J1 |
| FR-CHK-4 | Payment is labeled "Test mode": `4242 4242 4242 4242` is accepted; `4000 0000 0000 0002` yields a "Your card was declined" error state; any other number fails format/Luhn validation with an inline error; expiry must be in the future; CVC 3 digits | D | MVP | J1, J5 |
| FR-CHK-5 | Only the card's last 4 digits and brand label are retained after payment; the full number and CVC are never stored | D | MVP | J1 |
| FR-CHK-6 | Review shows items, address, delivery choice, payment last-4, and totals (items, shipping, estimated tax, order total) recomputed from the catalog, not from cart-stored prices | D | MVP | J1 |
| FR-CHK-7 | "Place your order" is disabled while submitting; a double-click or a reload during submit creates exactly one order | D | MVP | J1 |
| FR-CHK-8 | Estimated tax is a flat 8% of the items subtotal, rounded half up to the cent | D | MVP | J1 |

### Orders and confirmation
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-ORD-1 | After Place order: `/orders/<id>/confirmation` shows a success message, order number, items, address, delivery ETA and totals; the cart is emptied and the header count is 0 | D | MVP | J1 |
| FR-ORD-2 | Order number format `111-NNNNNNN-NNNNNNN`, derived deterministically from a per-browser order sequence | D | MVP | J1 |
| FR-ORD-3 | `/orders` lists orders newest first (order number, date, total, items); with none, it shows an empty state | D | MVP | J1 |

### Errors and states
| ID | Requirement | Origin | Pri | Journeys |
|---|---|---|---|---|
| FR-ERR-1 | Unknown routes render a 404 page with a search box and a home link | D | MVP | J5 |
| FR-ERR-2 | A runtime error boundary shows a recoverable error page (retry + home) without a blank screen | D | MVP | J5 |
| FR-ERR-3 | A missing or failed image renders the generated fallback illustration, never a broken-image icon | D | MVP | J5 |

## Non-functional
| ID | Requirement | Verification |
|---|---|---|
| NFR-A11Y-1 | axe reports **zero critical and zero serious** violations on Home, Results, PDP, Cart, Checkout, Confirmation | Playwright + axe |
| NFR-A11Y-2 | Every primary control (search, suggestions, sort, filters, swatches, quantity, Add to cart, stepper, checkout fields, Place order) is operable by keyboard alone | Manual pass of J1 + E2E keyboard steps |
| NFR-A11Y-3 | Visible focus indicator on every interactive element | Manual pass |
| NFR-A11Y-4 | Semantic landmarks on each page: `header`, `nav`, `main`, `footer`; one `h1` per page | axe + assertion |
| NFR-A11Y-5 | Every form control has a programmatically associated label; errors are announced (`aria-live` or `aria-describedby`) | axe + manual |
| NFR-A11Y-6 | Interactive targets are >=44x44 CSS px at 375px width | Playwright bounding-box check on primary controls |
| NFR-RESP-1 | No horizontal page overflow at 375px on Home, Results, PDP, Cart, Checkout, Confirmation | Playwright `scrollWidth <= innerWidth` |
| NFR-RESP-2 | Layouts verified at 375, 768 and 1440 widths | Manual visual check per slice |
| NFR-SEC-1 | No secrets, tokens or credentials in the repo; `.env.example` documents any variable | Secret scan before each commit |
| NFR-SEC-2 | No Amazon-hosted images, scripts, fonts or logos are loaded; the wordmark is our own text/SVG | Network/grep check |
| NFR-SEC-3 | Full card numbers and CVC never leave the input component's local state (never persisted, logged, or sent) | Unit test + review |
| NFR-DET-1 | All money is integer cents via `lib/pricing`; dates come from `lib/clock`; tests can pin both | Unit tests |
| NFR-TEST-1 | Unit tests cover pricing, cart, catalog search/filter/sort/paginate, checkout validation and order creation | `pnpm test` |
| NFR-TEST-2 | One desktop golden-path E2E (J1) and one mobile smoke (J4) pass against a production build | `pnpm e2e` |
| NFR-DEP-1 | A public HTTPS URL serves the app with no login | Manual + production smoke |
| NFR-DEP-2 | `pnpm build` succeeds; `next` is pinned exactly to `16.3.7` (or a later patched 16.3.x recorded in [ADR-0001](decisions/0001-next-16-3-7-pinned.md)); `pnpm audit` shows no known vulnerabilities for direct dependencies | CI-style script |
| NFR-DEP-3 | The deployment is reproducible from the README on a clean clone | Cold-clone check in S9 |
| NFR-LOG-1 | `.agent-logs/` stays committed and unmodified apart from automatic capture | `git log -p` review |
| NFR-PERF-1 | Lighthouse scores are recorded as a diagnostic; they are **not** a pass/fail gate | Recorded in the README |
