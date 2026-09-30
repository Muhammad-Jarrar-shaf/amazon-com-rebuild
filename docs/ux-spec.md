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
- **Unbuilt destinations are intentionally inert [D]:** `NavLink` renders a real link only for routes listed in `AVAILABLE_ROUTES` (`lib/nav.ts`); every other destination renders as a disabled `role="link"` (`aria-disabled`, not focusable, no hover, tooltip "Not available in this build yet", "Soon" tag in the drawer). Each slice adds its routes to that list in the same commit (S3 `/s`, S4 `/cart`, S5 `/orders`). "Sign in" is therefore inert text-styled entry in MVP (no account dependency).
- **Menu drawer [D]:** a native modal `<dialog>` (focus trap, Esc, inert background, focus restore to the trigger come from the platform); backdrop click and the close button also close it; sections: Home, Shop by Department (the six departments), Help & Settings. Its contents were not observed on amazon.com.
- **Mobile info strip [D]:** amazon.com shows an "install our app" strip; there is no app here, so the strip carries the project disclaimer and its dismiss button really dismisses it.
- **Chrome interaction [D]:** interactive items on dark chrome get a 1px white hover border and a white focus ring (the link blue lacks contrast on `#131921`); the search field shows an orange focus ring; the search button is `type="submit"` in a real GET form to `/s` whose destination arrives in S3.
- **Wordmark:** our own text wordmark ("Amazon" + orange "Rebuild"), not an Amazon asset. Departments: Electronics, Computers, Home & Kitchen, Books, Toys & Games, Beauty & Personal Care.
- The location banner is not built (geo behavior is out of scope).

## 4. Home (FR-HOME-*)
Hero carousel (3-4 slides, arrows, dots optional, no autoplay in MVP), then rows of 4 overlapping-hero cards, each a 2x2 grid of captioned image tiles. On mobile the cards stack full-width and the hero swipes with the next slide peeking. Minimal home from S1: search + a few category tiles; full home in S6.

## 5. Search and results (FR-SRCH-*)
- **Suggestions:** dropdown under the input, up to 8 rows, matched prefix normal weight and completion bold; Up/Down highlights, Enter submits the highlighted row or the raw text, Esc closes; `role="combobox"` with `aria-activedescendant`.
- **Results (desktop):** left sidebar (Brand checkboxes, Rating "4 Stars & Up", Price range) + list rows on the right; toolbar shows the count line and Sort select.
- **Results (mobile):** no sidebar; a chip bar: filter-drawer button, Sort chip, Rating chip; the drawer holds Brand, Rating, Price with an Apply action and a Clear action.
- **Row:** image left (fixed aspect), title (2-line clamp), stars + count, price, was-price, delivery line, primary button. Discount and rating use the shared price/rating components.
- **Pagination:** numbered, current page marked `aria-current="page"`.
- **Empty (FR-SRCH-7):** "No results for <query>", the active filters as removable chips, Clear filters, and department links.
- **Loading:** filter/sort changes are URL navigations; show the previous list at reduced opacity while the next renders (no layout jump).

## 6. Product detail (FR-PDP-*): the money screen
- **Desktop:** three columns: gallery (thumb strip + main image) / info (title, byline, rating, price, savings, swatches, bullets, spec table) / sticky-free buy box (price, delivery ETA, availability, quantity, Add to cart, later Buy Now).
- **Mobile:** single column in the observed order: brand + rating, title, gallery, price, delivery, availability, quantity, full-width Add to cart, bullets, related rail. A sticky bottom Add to cart bar is *not* used (not observed).
- **Variants:** swatch cards with the price under each; selected swatch has a thick border and the label reads "Color: <name>"; an out-of-stock swatch is dimmed and struck through with an "Unavailable" label but still focusable/readable.
- **Primary CTA behavior:** Add to cart -> button shows a brief pressed/pending state -> mini-cart slides in with the item, subtotal, "Go to Cart", "Proceed to checkout"; header count bumps. Double clicks add once per click (quantity increments by the selected quantity each time, which is expected).
- **Out of stock:** buy box replaces the buttons with "Currently unavailable" and a link to similar products (modeled on the observed unavailable state; text is ours).
- **Delivery ETA:** "Delivery <weekday, month day>" computed from `lib/clock`; no live countdown.

## 7. Cart (FR-CART-*)
Gray page; white item card(s) with image, title link, availability, variant, stepper (trash icon at quantity 1, else minus), Delete link (Save for later is stretch); right column subtotal card with "Subtotal (N items): $X" and the yellow **Proceed to checkout**.
- **Pending (observed):** the row dims and controls are disabled ~250ms while the quantity updates.
- **Removed (observed):** row replaced by "<title> was removed from Shopping Cart." + **Undo** (Undo is ours).
- **Empty:** "Your cart is empty" + Continue shopping. On mobile the subtotal card sits above the item list.

## 8. Checkout (FR-CHK-*): designed, not observed
A single `/checkout` route with a four-step stepper (Address, Delivery, Payment, Review) and a persistent order-summary panel (right on desktop, collapsible on top for mobile). Header is minimal (logo + "Checkout (N items)" + secure-lock text) to reduce distraction.
- **Address:** labeled fields, inline errors under each field on blur/submit, focus moves to the first invalid field on failed Continue.
- **Delivery:** radio group of three options with price and ETA; default Standard.
- **Payment:** a "Test mode - no real charge" banner, card number/expiry/CVC/name fields, helper text listing the test card. Declined card: an inline alert (`role="alert"`) "Your card was declined", form stays filled.
- **Review:** read-only summary with "Change" links to each step; **Place your order** (yellow) is disabled with a spinner while submitting.
- **Confirmation:** success heading, order number, ETA, items, totals, "Continue shopping" and "View your orders".

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
