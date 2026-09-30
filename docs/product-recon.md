# Product Reconnaissance: amazon.com

Captured **2026-09-30** from the live site (https://www.amazon.com/) in an automated browser, guest session, desktop 1440x900 and mobile 375x812. Values marked *measured* come from computed styles/DOM; *approx* means read off a screenshot, not measured.

Every statement is tagged: **[O] observed**, **[I] inferred / not observable**, **[D] our design decision**. Requirement IDs (`FR-*`, `NFR-*`) live in [requirements.md](requirements.md).

## 1. Method and limits
- Pages exercised: home, search suggestions, results (`/s?k=wireless+headphones`), two PDPs, add-to-cart, cart page, quantity change, delete, guest "Proceed to checkout", mobile home/results/PDP.
- The session **geolocated to Pakistan**: desktop prices were PKR, delivery said "Ships to Pakistan", and one item showed a "cannot be shipped" state. The mobile session showed USD. [O]
- **Checkout is auth-gated.** I stopped at the sign-in page: no credentials entered, no account created, no purchase. Everything after it is **[I]** or **[D]**.
- Not tested: hover/focus styles, keyboard navigation, carousel autoplay, sticky-bar behavior, filter application, mobile cart/checkout, empty-cart full page.
- The guest cart was cleaned up (item deleted) after testing.

## 2. Observed behavior [O]

### Header and shell (desktop)
| Element | Observation |
|---|---|
| Top bar | 60px, `#131921` *measured*. Logo, "Deliver to <country>", search, "EN", "Hello, sign in / Account & Lists", "Returns & Orders", cart icon |
| Search | Department dropdown ("All", 27 departments) + input 38px tall, radius 8px, 15px font *measured* + orange submit button (hex not measured, approx `#FEBD69`) |
| Cart count | `#F08804`, 16px, bold *measured* |
| Sub-nav | 39px, `#232F3E` *measured*: All (hamburger), Prime Video, Coupons, Customer Service, Today's Deals, Registry, Gift Cards, Sell |
| Location banner | Dismissable box: "We're showing you items that ship to <country>..." with Dismiss / Change Address |
| Footer | "Back to top" bar (89px), then 5-column link area, `#232F3E` *measured*, ~918px tall, then a sister-sites strip and legal links |
| Typography | Body Arial 14px, text `#0F1111` *measured*; card headlines 24px/700 (uses a proprietary display face; we substitute) |

### Home
- Hero carousel, ~6 slides, right-arrow control, full-bleed. [O]
- Below it, **overlapping 4-up cards**: 344px wide, 12px padding, white, 0 radius *measured* at 1440px. Each card = 24px bold headline + arrow, then a **2x2 grid of captioned image tiles** (e.g. Headphones, Tablets, Gaming, Speakers). Rows repeat (electronics, PCs, fitness, apparel under $25, home, fashion, beauty, pets). [O]
- Ends with "See personalized recommendations". [O]

### Search
- Suggestions: ~10 rows, bold completed portion, some thumbnails, plus a row of price-range chips. [O]
- Results bar: "1-16 of over 30,000 results for ...". Sort options: Featured, Price Low to High, Price High to Low, Avg. Customer Review, Newest Arrivals, Best Sellers. [O]
- Sidebar 274px: Popular Shopping Ideas, Customer Reviews (4 Stars & Up), Brands (checkboxes + See more), Deals & Discounts, and many category-specific facets (~35 headings for headphones). [O]
- **List rows** ~1130x250: image left; "Sponsored" tag, title, stars + count, "2K+ bought in past month", price (large dollars, superscript cents), coupon chip, delivery date, "Ships to ...", yellow **Add to cart** (or "See options" when the item has variants), "+N other colors/patterns". [O]
- Pagination: Previous, 1 2 3 ..., 20, Next. [O]

### Product detail (PDP)
- Breadcrumb; **3 columns**: thumbnail strip + main image ("Click to see full view") / title, "Visit the <Brand> Store", rating + count, "Amazon's Choice", "2K+ bought", price, **color swatch cards, each with its own price**, attribute table, "About this item" bullets / **buy box**. [O]
- Buy box: price, shipping/import charge, delivery date + "Order within 6 hrs 35 mins", "In Stock", Quantity select 1-50, yellow **Add to cart**, orange **Buy Now**, Ships from / Sold by / Returns (30-day) / Packaging, "Add to List". [O]
- Below: Frequently bought together, related carousels, description, From the brand, What's in the box, reviews, similar brands. [O]
- **Unavailable state:** red "This item cannot be shipped to your selected delivery location", swatches disabled with the same text, CTA becomes "See Similar Items". [O]

### Cart
- **Add to cart** shows a confirmation view: "Added to cart", "Cart Subtotal", yellow "Proceed to checkout (1 item)", "Go to Cart", a mini-cart rail with a stepper (trash / qty / +), header badge increments, then a "Based on what you added" carousel. [O]
- **Cart page:** gray page background; white item card with image, title, "In Stock", gift checkbox, variant, stepper, and links Delete / Save for later / Compare with similar items / Share; right column "Subtotal (N items): $X", gift checkbox, yellow **Proceed to checkout**; recommendations rail; disclaimer footnote. [O]
- **Quantity change:** the row dims (~1s), then updates **inline without reload**: subtotal 11,078.23 -> 22,156.46, label "(2 items)", header badge 2. [O]
- **Delete:** inline "<title> was removed from Shopping Cart."; badge clears; "No items saved for later". [O]
- **Guest checkout:** "Proceed to checkout" redirects to "Sign in or create account": one field "Enter mobile number or email", Continue, Conditions/Privacy links, business-account link; `return_to` = `/checkout/entry/cart`. [O]

### Responsive (375px) [O]
- Header: install-app banner; row of hamburger, logo, "Sign in >" + person icon, cart with count; **full-width search row** beneath; horizontally scrolling chip nav (Deals, Lists, Video, Music, Best Sellers, New Releases...); "Deliver to" row.
- Home: hero cards swipe with the next card peeking; cards stack full-width.
- Results: **no sidebar**; a chip bar (filter-drawer icon, "Most Purchased", star & up, dropdown chips); compact card (image ~40% left), full-width yellow Add to cart.
- PDP: single column in this order: brand + rating row, title, badge, social proof, gallery, price, delivery, full-width (345px) Add to cart and Buy Now stacked, bullets, recommendations. No horizontal page scroll.

### Observed UI states
| State | Observation |
|---|---|
| Loading | Cart row dims during quantity update |
| Unavailable | PDP "cannot be shipped" state (above) |
| Success | "Added to cart" confirmation; inline "removed" message |
| Empty | "No items saved for later" section |
| Selected | Selected swatch has a highlighted border; selected variant shown in label ("Color: Purple") |
| Not observed | Hover/focus, disabled buttons, error states, skeletons |

## 3. Inferred, not observable [I]
Address entry, delivery-speed selection, payment step, order review, confirmation and Your Orders content, Buy Now path, Save for later mechanics, filter application results, mobile cart and checkout, hover/focus behavior. These are **not** claimed as Amazon behavior anywhere in this repo.

## 4. Our decisions [D]
| Amazon behavior | Decision | Class |
|---|---|---|
| Header, department dropdown, suggestions | Faithful header; local suggestions | Faithful / simplified |
| Home overlapping category cards + hero | Faithful; 3-4 hero slides | Faithful |
| List-row results, sort, facets, pagination | List rows; 3 filters (Brand, Rating, Price); 4 sorts; numbered pagination | Simplified |
| PDP 3-column + buy box + swatches + qty | High fidelity | Faithful |
| Countdown, "bought in past month", Amazon's Choice | Seed-derived badges; deterministic, no live timers | Simulated |
| Sponsored, coupons, Prime, ads, Buy More Save More | Omit | Omit |
| Add-to-cart redirect page | Slide-in mini-cart + badge bump | Simplified equivalent |
| Cart stepper, inline subtotal, delete message | Faithful, with pending state and Undo (Undo is ours) | Faithful + addition |
| Sign-in gate before checkout | **Guest checkout**, no account dependency | Deliberate deviation |
| Address -> delivery -> payment -> review -> confirmation | Deterministic mock flow, see [ADR-0002](decisions/0002-guest-checkout-deterministic-mock.md) | Designed, not observed |
| Geo-dependent currency and shipping | USD, US English, everything shippable except designated out-of-stock items | Simplified |
