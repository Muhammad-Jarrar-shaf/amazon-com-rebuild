# UX Spec

Interaction model, visual tokens and states for the rebuild. Requirement IDs refer to [requirements.md](requirements.md); evidence for each Amazon-inspired choice is in [product-recon.md](product-recon.md). **Checkout, delivery, payment and confirmation are our own design** and are not presented as Amazon behavior.

## 1. Visual hierarchy
Search-first: the header search is the most prominent control on every page. Below it, content density is high and image-led. Primary CTA = yellow **Add to cart**; secondary purchase CTA (stretch) = orange **Buy Now**; everything else is text links or outlined buttons.

## 2. Tokens
Values from Amazon are *measured* (computed style, 2026-09-30). Values marked *design* are our choices (not measured from Amazon) and may be tuned in polish.

| Token | Value | Source |
|---|---|---|
| `--nav-bg` | `#131921` | measured |
| `--subnav-bg` / `--footer-bg` | `#232F3E` | measured |
| `--cart-count` | `#F08804`, 16px, 700 | measured |
| `--text` | `#0F1111` | measured |
| `--page-bg` | `#FFFFFF` (home/results/PDP); `#EAEDED` (cart/checkout) | white measured on home; gray design |
| `--cta-yellow` | `#FFD814` (hover `#F7CA00`) | design (approx) |
| `--buy-now` | `#FFA41C` | design (approx) |
| `--search-btn` | `#FEBD69` | design (approx) |
| `--link` | `#007185` | design (approx) |
| `--price` | `--text`; sale/savings `#B12704` | design (approx) |
| `--focus-ring` | 2px `#007185` + 2px white offset | design |
| Font | Arial, system sans fallback; 14px body, 15px search input, 24px/700 card headlines | body/headline measured |
| Radius | search input 8px; cards 0 (home); buttons fully rounded (pill) | input/card measured, button design |
| Card | 344px wide at 1440px, 12px padding, white | measured |
| Layout widths | header/sub-nav 60px/39px tall; sidebar 274px; results row ~1130x250 at 1440 | measured |
| Breakpoints | mobile `<768`, tablet `768-1023`, desktop `>=1024` | design (Amazon's exact breakpoints not measured) |
| Spacing scale | 4 / 8 / 12 / 16 / 24 / 32 | design |

## 3. Shell (FR-NAV-*)
- **Desktop (>=1280):** 60px top bar (logo, "Deliver to", search with department select, "EN", account, Returns & Orders, cart with count) over a 39px sub-nav ("All" trigger + observed links). Footer: Back-to-top bar, link columns, lower strip.
- **Laptop (1024-1279) [D]:** the top bar drops "Deliver to" and "EN" so search keeps >=400px; "Deliver to" moves to a row below the sub-nav.
- **Tablet (768-1023) [D]:** additionally drops Returns & Orders (still reachable from the drawer); the sub-nav drops Registry, Gift Cards and Sell. Search stays >=330px. The E2E test asserts these widths at 1440, 1280, 1024, 768 and 375.
- **Mobile (<768):** info strip; row 1 = hamburger, logo, "Sign in >" + person icon, cart with count; row 2 = full-width search (no department picker); row 3 = horizontally scrollable chip row; row 4 = "Deliver to" row. The hamburger opens the drawer. The header is not sticky (matches observation).
- **One DOM, no duplicated controls:** the top bar is a CSS grid whose areas change per breakpoint (`.header-grid` in `app/globals.css`); only the sub-nav/chip navs and the two "Deliver to" variants are separate elements.
- **Unbuilt destinations are intentionally inert [D]:** `NavLink` renders a real link only for routes listed in `AVAILABLE_ROUTES` (`lib/nav.ts`); every other destination renders as a disabled `role="link"` (`aria-disabled`, not focusable, no hover, tooltip "Not available in this build yet", "Soon" tag in the drawer). Each slice adds its routes to that list in the same commit (S3 `/s`, S4 `/cart`, S5 `/checkout` and `/orders`). "Sign in" is therefore inert text-styled entry in MVP (no account dependency).
- **Menu drawer [D]:** a native modal `<dialog>` (focus trap, Esc, inert background, focus restore to the trigger come from the platform); backdrop click and the close button also close it; sections: Home, Shop by Department (the six departments), Help & Settings. Its contents were not observed on amazon.com.
- **Mobile info strip [D]:** amazon.com shows an "install our app" strip; there is no app here, so the strip carries the project disclaimer and its dismiss button really dismisses it.
- **Chrome interaction [D]:** interactive items on dark chrome get a 1px white hover border and a white focus ring (the link blue lacks contrast on `#131921`); the search field shows an orange focus ring; the search button is `type="submit"` in a real GET form to `/s` whose destination arrives in S3.
- **Wordmark:** our own text wordmark ("Amazon" + orange "Rebuild"), not an Amazon asset. Departments: Electronics, Computers, Home & Kitchen, Books, Toys & Games, Beauty & Personal Care.
- The location banner is not built (geo behavior is out of scope).

## 4. Home (FR-HOME-*)
Hero carousel (3-4 slides, arrows, dots optional, no autoplay in MVP), then rows of 4 overlapping-hero cards, each a 2x2 grid of captioned image tiles. On mobile the cards stack full-width and the hero swipes with the next slide peeking. Minimal home from S1: search + a few category tiles; full home in S6.

## 5. Search and results (FR-SRCH-*)
- **Suggestions [as built]:** a popover under the header field, up to 8 rows (search icon, typed prefix normal, completion bold), rows at least 44px on touch. `role="combobox"` on the input with `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant`; `role="listbox"` / `role="option"` with `aria-selected`; a polite live region announces the count. Up/Down move (wrapping), Enter searches the active option or the typed text, Esc closes and keeps the text, clicking an option searches it, and leaving the field closes it. The active row is gray. The field follows the URL on the results page (including Back/Forward) and keeps typing untouched.
- **Results (>=1024px):** a 250px left sidebar (Customer Reviews "4 Stars & Up", Brand checkboxes with counts, Price ready-made ranges with counts plus Min/Max and Go) and the list on the right. The header row has "Results", the count line ("1-3 of 3 results for "headphones"") and the Sort select. Active filters show as removable chips with "Clear filters".
- **Results (<1024px) [as built]:** no sidebar. A "Filters" button (with the number of active filter groups) sits beside the Sort select and opens a native modal `<dialog>` drawer with the same refinements; selections apply immediately and stay in the URL, the drawer stays open while filtering, "Show N results" or the close button or Esc closes it and focus returns to the button.
- **Row [as built]:** image left (200px at >=640px, 112px on mobile), title as an `h2` link, stars and count, badge, "5K+ bought in past month", price with superscript cents plus "List: $129.99 (-38%)", delivery line, availability note ("Only 3 left...", "Currently unavailable."), "N color options", and one action: **See options** (multi-variant products), **Add to cart** (single-variant, purchasable) or nothing (unavailable). The action is full width on mobile. Add to cart adds the row's default variant (quantity 1) through the shared cart store, updates the badge and opens the mini-cart. The image link repeats the title link and is hidden from assistive tech.
- **Controls respond at once [as built]:** the sort select and the refinement checkboxes update immediately and the URL follows (they are optimistic), and price links are built from that same state.
- **Pagination [as built]:** Previous, numbers with ellipses (first, last and neighbours of the current page), Next; the current page is `aria-current="page"`; disabled ends are non-links; 44px targets; links keep the query, filters and sort.
- **Empty and no-results [as built]:** `/s` with nothing to search shows guidance ("What are you looking for?", popular searches, departments, featured products). A query with no matches shows `No results for "zzzz"` with spelling tips and the same discovery paths. Filters that remove everything keep the page and its chips, say how many results exist without them, and offer a prominent "Clear filters". A page past the end redirects to the last page.
- **Category browsing:** `/s?dept=<slug>` uses this same experience (no separate page).
- **Loading:** navigation is a normal server render; no skeleton or dimming is used because the controls already reflect the requested state.

## 6. Product detail (FR-PDP-*): the money screen
- **Desktop:** three columns: gallery (thumb strip + main image) / info (title, byline, rating, price, savings, swatches, bullets, spec table) / sticky-free buy box (price, delivery ETA, availability, quantity, Add to cart, later Buy Now).
- **Mobile:** single column in the observed order: brand + rating, title, gallery, price, delivery, availability, quantity, full-width Add to cart, bullets, related rail. A sticky bottom Add to cart bar is *not* used (not observed).
- **Variants:** a native radio group of swatch cards (each with the variant image and its own price); the legend reads "Color: <label>"; the selected card has a thick orange border. An unavailable variant is a **disabled radio** (so it cannot become the selection and is not focusable), dimmed, dashed, `cursor-not-allowed` and labeled "Unavailable" in red; opening one by URL (`?variant=`) is allowed and shows the unavailable state with no way to buy. The one exception is a product whose every option is unavailable: the current one stays selected. Products with one variant show no picker.
- **Primary CTA behavior:** Add to cart validates the selection (`resolvePurchase`), adds through the shared cart store (same product+variant merges, capped at 10 / stock) and opens the mini-cart as the confirmation; a rejected selection shows an inline error and adds nothing. **Buy Now is deferred** (FR-PDP-11, stretch): it is not rendered rather than shown inert.
- **Out of stock:** buy box replaces the buttons with "Currently unavailable" and a link to similar products (modeled on the observed unavailable state; text is ours).
- **Delivery ETA:** "FREE delivery <weekday, month day>" (or "$4.99 delivery ...") computed from `lib/clock` and the product's business days; no live countdown; hidden when the variant is not purchasable.
- **As built [D]:**
  - *Layout:* `>=1280` three columns (gallery / header, price, options, About / buy box); `768-1279` two columns (gallery left; header, price, options and buy box stacked in the right column; About below); `<768` one column in the order byline+title+rating, gallery, price, options, buy box, About. The price repeats inside the buy box only at `>=1280`.
  - *Gallery:* thumbnails are a vertical rail at `>=768` and a row under the image on mobile (48px targets, `aria-pressed`); the rail is omitted when a variant has one image; a mouse-only hover zoom (1.9x, "Roll over image to zoom in") replaces Amazon's click-to-enlarge; photos are cropped to a square (`object-cover`).
  - *Price:* large dollars with superscript symbol and cents; a derived "-38%" (red), "List Price: $129.99" struck through and "You save $50.00"; assistive tech reads the plain amount and "38 percent off".
  - *Quantity:* a stepper (minus, editable number, plus; 44px targets) with Arrow Up/Down, clamped to 1-10 or the stock limit, buttons disabled at the boundaries, and a note ("Limit 10 per order" / "Only 3 available").
  - *Badges:* our own "Top Pick", "Best Seller" and "Limited time deal" (no Amazon's Choice mark); "5K+ bought in past month" is seed data.
  - *Not-found:* `/dp/<unknown>` returns HTTP 404 with an illustration, an explanation, "Continue shopping" and a "Popular right now" rail of real products.
  - *Lower page:* only About this item, Product details (description and specification table) and one related-products rail (an overflow-scroll row of cards).

## 7. Cart (FR-CART-*)
Gray page; white item card(s) with image, title link, availability, variant, stepper (trash icon at quantity 1, else minus), Delete link (Save for later is stretch); right column subtotal card with "Subtotal (N items): $X" and the yellow **Proceed to checkout**.
- **Pending (observed, not built [D]):** amazon.com dims the row while a server updates the quantity. Our cart is local and updates synchronously, so no fake pending state is shown.
- **Removed (observed):** row replaced by "<title> was removed from Shopping Cart." + **Undo** (Undo is ours).
- **Empty:** "Your cart is empty" + Continue shopping. On mobile the subtotal card sits above the item list.
- **As built (S4):** gray page from 768px up. Each line: image, title link (to the product with its variant), stock state, "Color: X" (only for multi-variant products), unit price with struck compare-at, stepper (trash at 1, else minus; editable number; plus disabled at the limit; typed input is committed on blur/Enter, capped, and garbage restores the value with a message), Delete, line total at the right. Subtotal card: "Subtotal (N items): $X" and the yellow Proceed to checkout, which is honestly unavailable ("Checkout is not available in this build yet.") until S5 adds `/checkout`. The removal message and the recovery notice share one live region.
- **Mini-cart (S4):** native modal `<dialog>` sliding in from the right (full width up to 26rem), opened by a successful Add to cart (with an "Added to cart" confirmation naming the item) and by a plain click on the header cart (modified clicks and clicks on `/cart` follow the link). Lines with thumbnail, variant, stepper and line total; subtotal; Proceed to checkout and Go to Cart. Esc, the close button or a backdrop click close it and focus returns to the opener. The header badge is the total quantity, not the number of lines.

## 8. Checkout (FR-CHK-*): designed, not observed
A single `/checkout` route with a four-step stepper (Address, Delivery, Payment, Review) and a persistent order-summary panel (right on desktop, collapsible on top for mobile). Header is minimal (logo + "Checkout (N items)" + secure-lock text) to reduce distraction.
- **Address:** labeled fields, inline errors under each field on blur/submit, focus moves to the first invalid field on failed Continue.
- **Delivery:** radio group of three options with price and ETA; default Standard.
- **Payment:** a "Test mode - no real charge" banner, card number/expiry/CVC/name fields, helper text listing the test card. Declined card: an inline alert (`role="alert"`) "Your card was declined", form stays filled.
- **Review:** read-only summary with "Change" links to each step; **Place your order** (yellow) is disabled with a spinner while submitting.
- **Confirmation:** success heading, order number, ETA, items, totals, "Continue shopping" and "View your orders".
- **As built (S5), designed not observed:** the standard site header stays on checkout (the minimal header above is not built). A stepper (`Address / Delivery / Payment / Review`, `aria-current="step"`, completed steps are links) sits over a white step card and a sticky order-summary card (items, delivery, 8% estimated tax, total) on desktop; on mobile the summary sits below the form and the primary button is full width. Focus moves to the step heading on each step change; failed validation focuses the first invalid field and announces "There are problems..." in a `role="alert"`, with each error tied to its field by `aria-describedby`. Delivery: Standard FREE (5 business days), Expedited $9.99 (2), One-day $19.99 (1), ETAs from the pinned clock. Payment shows a "TEST MODE" banner naming the two test-only card numbers. Review lists address, delivery, masked payment, items and the total, each section with a Change link, and Place your order is disabled ("Placing your order…") once pressed. A missing/unreachable step is replaced by the first incomplete one with an inline explanation; an empty cart shows "Your cart is empty" with Continue shopping and Go to Cart. Confirmation and `/orders` say plainly that the order is simulated ("not an Amazon order"); `/orders` lists newest first (date, total, ship to, order number, arrival, items, "View order details") with an empty state; `/orders/<id>/confirmation` for an unsaved id explains that orders live in the browser that placed them.

## 9. States catalog
| Surface | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Suggestions | none (instant, local) | hidden if no match | n/a | rows shown |
| Results | reduced-opacity list | FR-SRCH-7 | error boundary | list |
| PDP | route-level skeleton for image/text blocks | n/a | 404 (FR-PDP-1) | mini-cart on add |
| Cart | pending row dim | empty cart page | error boundary | inline totals |
| Checkout | disabled Place order + spinner | redirect to `/cart` | inline field errors / declined alert | confirmation |
| Orders | n/a | "You have not placed any orders" | error boundary | list |
| Images | neutral block with fixed aspect | n/a | generated fallback (FR-ERR-3) | image |
Disabled buttons use reduced contrast but keep readable text; disabled is never the only indicator (accompanying message).

## 10. Accessibility requirements (NFR-A11Y-*)
axe: zero critical/serious on the six critical pages. Keyboard: full J1 without a mouse; logical tab order; no keyboard traps except the intentional focus trap in the open drawer/mini-cart (Esc closes and returns focus to the trigger). Visible focus ring on every interactive element. Landmarks `header/nav/main/footer`, one `h1` per page. Labels on all inputs; errors linked with `aria-describedby`; toasts/messages in `aria-live="polite"`. Tap targets >=44px on mobile. Color is never the only signal (stock, errors, selected swatch also have text/shape). Images have meaningful `alt`; decorative ones `alt=""`. Respect `prefers-reduced-motion` for carousel and drawers.

## 11. Responsive rules (NFR-RESP-*)
Design at 375, 768, 1440. No horizontal page overflow at 375. Cards reflow 4 -> 2 -> 1 columns; results sidebar collapses to the filter drawer below 1024; PDP columns stack below 768 (tablet may use two columns: gallery + buy box beside info).
