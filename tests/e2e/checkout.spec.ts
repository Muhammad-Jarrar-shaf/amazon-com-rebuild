import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { CART_STORAGE_KEY } from "@/lib/cart/persistence";
import { CHECKOUT_STORAGE_KEY } from "@/lib/checkout/persistence";
import { ORDERS_STORAGE_KEY } from "@/lib/orders/persistence";

// Guest checkout, order creation, confirmation and orders (FR-CHK-*, FR-ORD-*, J1, J4, J5). Runs in the desktop (1440)
// and mobile (375) projects against the production build. The clock is pinned to Thursday 2026-10-01.

const KNIFE = "B0HRTH0KNF";
const HERO = "B0HALO0AUR";
const APPROVED = "4242 4242 4242 4242";
const DECLINED = "4000 0000 0000 0002";
const ADDRESS = { name: "Ada Lovelace", street: "12 Analytical Way", city: "Seattle", state: "WA", zip: "98101", phone: "206-555-0142" };

const main = (page: Page) => page.getByRole("main");
const buyBox = (page: Page) => page.getByRole("region", { name: "Purchase options" });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Shopping Cart" });
const badge = (page: Page, count: number) => page.getByRole("link", { name: `Cart, ${count} ${count === 1 ? "item" : "items"}` });
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const storage = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);
const orders = async (page: Page) => (JSON.parse((await storage(page, ORDERS_STORAGE_KEY)) ?? '{"orders":[]}') as { orders: { id: string }[]; seq: number }).orders;

function trackErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`http ${response.status()}: ${response.url()}`);
  });
  return problems;
}

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
}

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  expect(found, "element has a bounding box").not.toBeNull();
  return found!;
}

async function addToCart(page: Page, id: string, options: { extra?: number; variant?: string } = {}) {
  await page.goto(`/dp/${id}${options.variant ? `?variant=${options.variant}` : ""}`);
  for (let i = 0; i < (options.extra ?? 0); i += 1) await page.getByRole("button", { name: "Increase quantity" }).click();
  await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
}

async function fillAddress(page: Page, overrides: Partial<typeof ADDRESS> = {}) {
  const a = { ...ADDRESS, ...overrides };
  await page.getByLabel("Full name").fill(a.name);
  await page.getByLabel("Street address").fill(a.street);
  await page.getByLabel("City").fill(a.city);
  await page.getByLabel("State").selectOption(a.state);
  await page.getByLabel("ZIP code").fill(a.zip);
  await page.getByLabel("Phone number").fill(a.phone);
}

async function fillCard(page: Page, number = APPROVED, overrides: { expiry?: string; cvc?: string; name?: string } = {}) {
  await page.getByLabel("Name on card").fill(overrides.name ?? "Ada Lovelace");
  await page.getByLabel("Card number").fill(number);
  await page.getByLabel("Expiration date").fill(overrides.expiry ?? "12/34");
  await page.getByLabel("Security code (CVC)").fill(overrides.cvc ?? "123");
}

const stepHeading = (page: Page, text: string | RegExp) => expect(page.locator("#checkout-step-heading")).toHaveText(text);

/** Cart with the knife, through address, delivery and payment, stopping on the review step. */
async function toReview(page: Page, delivery: "standard" | "expedited" | "one-day" = "standard") {
  await addToCart(page, KNIFE);
  await page.goto("/checkout");
  await expect(page).toHaveURL(/step=address/);
  await fillAddress(page);
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page).toHaveURL(/step=delivery/);
  await page.getByRole("radio", { name: new RegExp(delivery === "standard" ? "Standard" : delivery === "expedited" ? "Expedited" : "One-day") }).check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/step=payment/);
  await fillCard(page);
  await page.getByRole("button", { name: "Review your order" }).click();
  await expect(page).toHaveURL(/step=review/);
}

test.describe("J1: the golden path", () => {
  test("Home -> search -> product -> cart -> checkout -> order -> orders, on the production build", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Search Amazon Rebuild" });
    await search.fill("headphones");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/s\?k=headphones/);

    await page.getByLabel("Sort by:").selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    const firstPrices = await page.locator('[data-shell="result-row"]').first().textContent();
    expect(firstPrices).toBeTruthy();

    // Open the hero product (a multi-variant headphone), pick the second color, quantity 2.
    await page.locator(`[data-shell="result-row"][data-product-id="${HERO}"] h2 a`).click();
    await expect(page).toHaveURL(new RegExp(`/dp/${HERO}`));
    await page.locator("label", { hasText: "Space Silver" }).click();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
    await expect(dialog(page)).toContainText("Color: Space Silver");
    await expect(dialog(page).locator('[data-shell="mini-cart-subtotal"]')).toHaveText("$169.98");

    await dialog(page).getByRole("link", { name: "Go to Cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(main(page).locator('[data-shell="cart-subtotal"]')).toHaveText("$169.98");
    await main(page).locator('[data-shell="proceed-to-checkout"]').click();

    // Address
    await expect(page).toHaveURL(/\/checkout\?step=address$/);
    await stepHeading(page, /Shipping address/);
    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();

    // Delivery: the choice changes the total immediately (2 x 84.99 = 169.98; expedited 9.99; tax 8% = 13.60).
    await expect(page).toHaveURL(/step=delivery/);
    await expect(page.locator('[data-shell="summary-total"]')).toHaveText("$183.58");
    await page.getByRole("radio", { name: /Expedited/ }).check();
    await expect(page.locator('[data-shell="summary-shipping"]')).toHaveText("$9.99");
    await expect(page.locator('[data-shell="summary-total"]')).toHaveText("$193.57");
    await expect(page.locator('[data-shell="delivery-option"]').filter({ hasText: "Expedited" })).toContainText("Arrives Monday, October 5");
    await page.getByRole("button", { name: "Continue to payment" }).click();

    // Payment (test mode)
    await expect(page).toHaveURL(/step=payment/);
    await expect(page.locator('[data-shell="test-mode-banner"]')).toContainText("TEST MODE");
    await fillCard(page, APPROVED);
    await page.getByRole("button", { name: "Review your order" }).click();

    // Review
    await expect(page).toHaveURL(/step=review/);
    const review = page.locator('[data-shell="review"]');
    await expect(review).toContainText("Ada Lovelace");
    await expect(review).toContainText("12 Analytical Way");
    await expect(review).toContainText("Expedited delivery: arrives Monday, October 5");
    await expect(review.locator('[data-shell="review-payment"]')).toHaveText("Visa ending in 4242");
    await expect(review).toContainText("Color: Space Silver");
    await expect(review).toContainText("Qty 2 × $84.99");
    await expect(review.locator('[data-shell="review-total"]')).toHaveText("$193.57");
    expect(await page.content()).not.toContain("4242 4242 4242 4242");

    await page.locator('[data-shell="place-order"]').click();

    // Confirmation
    await expect(page).toHaveURL(/\/orders\/111-\d{7}-\d{7}\/confirmation$/);
    const confirmation = page.locator('[data-shell="confirmation"]');
    await expect(confirmation.getByRole("heading", { level: 1 })).toContainText("Order placed");
    const orderNumber = (await confirmation.locator('[data-shell="order-number"]').textContent())!;
    expect(orderNumber).toMatch(/^111-\d{7}-\d{7}$/);
    await expect(confirmation.locator('[data-shell="arrival"]')).toContainText("Monday, October 5");
    await expect(confirmation.locator('[data-shell="payment-method"]')).toContainText("Visa ending in 4242");
    await expect(confirmation).toContainText("Ada Lovelace");
    await expect(confirmation).toContainText("Seattle, WA 98101");
    await expect(confirmation).toContainText("Color: Space Silver");
    await expect(confirmation.locator('[data-shell="order-total"]')).toHaveText("$193.57");
    await expect(confirmation.locator('[data-shell="test-note"]')).toContainText("simulated order");

    // The cart is empty and the badge is zero.
    await expect(badge(page, 0)).toBeVisible();

    // Returns & Orders: on desktop the header entry, on mobile the menu drawer.
    if (test.info().project.name === "mobile") {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("dialog", { name: "Main menu" }).getByRole("link", { name: /Your Orders/ }).click();
    } else {
      await page.getByRole("link", { name: "Returns & Orders" }).click();
    }
    await expect(page).toHaveURL(/\/orders$/);
    const card = page.locator('[data-shell="order-card"]');
    await expect(card).toHaveCount(1);
    await expect(card.locator('[data-shell="order-list-id"]')).toHaveText(orderNumber);
    await expect(card.locator('[data-shell="order-list-total"]')).toHaveText("$193.57");
    await expect(card).toContainText("arriving Monday, October 5");
    await expect(card).toContainText("Aura Wireless");

    await page.goto("/cart");
    await expect(main(page).locator('[data-shell="cart-empty"]')).toBeVisible();
    expect(await storage(page, CART_STORAGE_KEY)).toContain('"lines":[]');
    expect(problems).toEqual([]);
  });
});

test.describe("checkout entry and guards", () => {
  test("an empty cart cannot check out: intentional empty state with a way back", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator('[data-shell="checkout-empty"]')).toContainText("Your cart is empty");
    await expect(main(page).getByRole("link", { name: "Continue shopping" })).toBeVisible();
    await expect(main(page).getByRole("link", { name: "Go to Cart" })).toBeVisible();
    await expect(page.locator('[data-shell="checkout-step"]')).toHaveCount(0);
    await page.goto("/checkout?step=review");
    await expect(page.locator('[data-shell="checkout-empty"]')).toBeVisible();
    expect(await orders(page)).toEqual([]);
  });

  test("direct navigation to a later step is redirected to the first incomplete one, with an explanation", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout?step=review");
    await expect(page).toHaveURL(/step=address$/);
    await stepHeading(page, /Shipping address/);
    await expect(page.locator('[data-shell="checkout-step"]')).toContainText("Please add your shipping address");
    await page.goto("/checkout?step=payment");
    await expect(page).toHaveURL(/step=address$/);
    await page.goto("/checkout?step=nonsense");
    await expect(page).toHaveURL(/step=address$/);
  });

  test("leaving checkout keeps the cart intact and creates no order", async ({ page }) => {
    await addToCart(page, KNIFE, { extra: 1 });
    await page.goto("/checkout");
    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.goto("/cart");
    await expect(badge(page, 2)).toBeVisible();
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$99.98");
    expect(await orders(page)).toEqual([]);
  });
});

test.describe("validation and error states", () => {
  test("an invalid address blocks progress, announces the errors and focuses the first bad field", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(page).toHaveURL(/step=address$/);
    await expect(page.getByRole("alert").filter({ hasText: "problems with your address" })).toContainText("6 highlighted fields");
    await expect(page.getByLabel("Full name")).toBeFocused();
    await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Full name")).toHaveAccessibleDescription(/Enter your full name/);
    await expect(page.getByLabel("ZIP code")).toHaveAccessibleDescription(/valid ZIP code/);

    await fillAddress(page, { zip: "9810", phone: "555" });
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(page).toHaveURL(/step=address$/);
    await expect(page.getByLabel("ZIP code")).toBeFocused();
    await expect(page.getByLabel("Phone number")).toHaveAccessibleDescription(/10-digit/);
    await page.getByLabel("ZIP code").fill("98101-1234");
    await page.getByLabel("Phone number").fill("(206) 555-0142");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(page).toHaveURL(/step=delivery$/);
  });

  test("invalid card details block progress with field errors; nothing advances", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page).toHaveURL(/step=payment$/);
    await expect(page.getByRole("alert").filter({ hasText: "problems with your card" })).toBeVisible();
    await expect(page.getByLabel("Name on card")).toBeFocused();

    await fillCard(page, "1234 5678 9012 3456", { expiry: "01/20", cvc: "1" });
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page.getByLabel("Card number")).toHaveAccessibleDescription(/valid card number/);
    await expect(page.getByLabel("Expiration date")).toHaveAccessibleDescription(/expired/);
    await expect(page.getByLabel("Security code (CVC)")).toHaveAccessibleDescription(/3-digit/);
    await expect(page).toHaveURL(/step=payment$/);

    await fillCard(page, "5555 5555 5555 4444");
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page.getByLabel("Card number")).toHaveAccessibleDescription(/Only the test cards/);
    await expect(page).toHaveURL(/step=payment$/);
    await page.goto("/checkout?step=review");
    await expect(page).toHaveURL(/step=payment$/);
  });

  test("the decline test card shows a declined state, keeps the form, and creates no order", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await fillCard(page, DECLINED);
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page.locator('[data-shell="card-declined"]')).toContainText("Your card was declined");
    await expect(page).toHaveURL(/step=payment$/);
    await expect(page.getByLabel("Card number")).toHaveValue(DECLINED);
    expect(await orders(page)).toEqual([]);
    await expect(badge(page, 1)).toBeVisible();
    // The declined card is not remembered: review stays locked.
    await page.goto("/checkout?step=review");
    await expect(page).toHaveURL(/step=payment$/);
    // The approved card then works.
    await fillCard(page, APPROVED);
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page).toHaveURL(/step=review$/);
  });
});

test.describe("order creation", () => {
  test("a double click on Place order creates exactly one order", async ({ page }) => {
    await toReview(page, "one-day");
    await page.locator('[data-shell="place-order"]').dblclick();
    // The second click of a real double click may land on whatever the new page shows under the cursor, so assert
    // on the outcome that matters: exactly one order, and the cart is empty.
    await expect.poll(async () => (await orders(page)).length).toBe(1);
    await page.goto("/checkout?step=review");
    await expect(page.locator('[data-shell="checkout-empty"]')).toBeVisible();
    expect(await orders(page)).toHaveLength(1);
    await expect(badge(page, 0)).toBeVisible();
  });

  test("clicking Place order many times in one tick still creates one order", async ({ page }) => {
    await toReview(page);
    await page.locator('[data-shell="place-order"]').evaluate((button) => {
      for (let i = 0; i < 5; i += 1) (button as HTMLButtonElement).click();
    });
    await expect(page).toHaveURL(/confirmation$/);
    expect(await orders(page)).toHaveLength(1);
  });

  test("a stale replay of the same checkout attempt returns the existing order instead of creating a second", async ({ page }) => {
    await toReview(page);
    const savedCheckout = await storage(page, CHECKOUT_STORAGE_KEY);
    await page.locator('[data-shell="place-order"]').click();
    await expect(page).toHaveURL(/confirmation$/);
    const first = (await orders(page))[0]!.id;

    // Put back the same checkout attempt AND a cart (as a second tab that has not seen the order would have).
    await page.evaluate(
      ([checkoutKey, checkoutValue, cartKey]) => {
        window.localStorage.setItem(checkoutKey!, checkoutValue!);
        window.localStorage.setItem(cartKey!, JSON.stringify({ version: 1, lines: [{ productId: "B0HRTH0KNF", variantId: "walnut", quantity: 1 }] }));
      },
      [CHECKOUT_STORAGE_KEY, savedCheckout!, CART_STORAGE_KEY],
    );
    await page.goto("/checkout?step=review");
    await page.locator('[data-shell="place-order"]').click();
    await expect(page).toHaveURL(new RegExp(`${first}/confirmation$`));
    expect(await orders(page)).toHaveLength(1);
    await expect(badge(page, 0)).toBeVisible();
  });

  test("the cart is cleared only after success, and a second order gets its own number", async ({ page }) => {
    await toReview(page);
    await expect(badge(page, 1)).toBeVisible();
    await page.locator('[data-shell="place-order"]').click();
    await expect(page).toHaveURL(/confirmation$/);
    const first = (await orders(page))[0]!.id;

    await toReview(page, "expedited");
    await page.locator('[data-shell="place-order"]').click();
    await expect(page).toHaveURL(/confirmation$/);
    const list = await orders(page);
    expect(list).toHaveLength(2);
    expect(new Set(list.map((order) => order.id)).size).toBe(2);
    await page.goto("/orders");
    const cards = page.locator('[data-shell="order-card"]');
    await expect(cards).toHaveCount(2);
    await expect(cards.first().locator('[data-shell="order-list-id"]')).not.toHaveText(first);
    // Newest first: the expedited order ($49.99 + $9.99 + 8% tax) arrives Monday, the standard one Thursday.
    await expect(cards.first().locator('[data-shell="order-list-total"]')).toHaveText("$63.98");
    await expect(cards.first()).toContainText("arriving Monday, October 5");
    await expect(cards.nth(1).locator('[data-shell="order-list-total"]')).toHaveText("$53.99");
  });

  test("stored data never contains the card number or CVC", async ({ page }) => {
    await toReview(page);
    await page.locator('[data-shell="place-order"]').click();
    await expect(page).toHaveURL(/confirmation$/);
    const everything = await page.evaluate(() => JSON.stringify({ ...window.localStorage }) + JSON.stringify({ ...window.sessionStorage }));
    expect(everything).not.toContain("4242424242424242");
    expect(everything).not.toContain("4242 4242");
    expect(everything).not.toContain("123");
    expect(everything).toContain("4242"); // the last four
    expect(everything).not.toContain("555-0142");
  });
});

test.describe("persistence: reload, Back and Forward", () => {
  test("a reload on every step keeps the progress and the entered data", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("City").fill("Seattle");
    await page.reload();
    await expect(page.getByLabel("Full name")).toHaveValue("Ada Lovelace");
    await expect(page.getByLabel("City")).toHaveValue("Seattle");

    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("radio", { name: /One-day/ }).check();
    await page.reload();
    await expect(page).toHaveURL(/step=delivery$/);
    await expect(page.getByRole("radio", { name: /One-day/ })).toBeChecked();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await fillCard(page);
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page).toHaveURL(/step=review$/);
    await page.reload();
    await expect(page).toHaveURL(/step=review$/);
    await expect(page.locator('[data-shell="review-payment"]')).toHaveText("Visa ending in 4242");
    await expect(page.locator('[data-shell="review"]')).toContainText("One-day delivery");
    expect(await orders(page)).toEqual([]);
  });

  test("Back and Forward move between steps predictably", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page).toHaveURL(/step=payment/);

    await page.goBack();
    await expect(page).toHaveURL(/step=delivery/);
    await stepHeading(page, /Delivery/);
    await page.goBack();
    await expect(page).toHaveURL(/step=address/);
    await expect(page.getByLabel("Full name")).toHaveValue("Ada Lovelace");
    await page.goForward();
    await expect(page).toHaveURL(/step=delivery/);
    await page.goForward();
    await expect(page).toHaveURL(/step=payment/);
    await stepHeading(page, /Payment/);
  });

  test("Change links return to a step with its data and forward again", async ({ page }) => {
    await toReview(page);
    await page.getByRole("link", { name: "Change shipping address" }).click();
    await expect(page).toHaveURL(/step=address$/);
    await expect(page.getByLabel("Street address")).toHaveValue("12 Analytical Way");
    await page.getByLabel("Street address").fill("99 New Street");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("link", { name: /Review/ }).click();
    await expect(page.locator('[data-shell="review"]')).toContainText("99 New Street");
  });

  test("an order survives a reload and a later visit", async ({ page }) => {
    await toReview(page);
    await page.locator('[data-shell="place-order"]').click();
    await expect(page).toHaveURL(/confirmation$/);
    const url = page.url();
    await page.reload();
    await expect(page.locator('[data-shell="order-number"]')).toBeVisible();
    await page.goto("/orders");
    await expect(page.locator('[data-shell="order-card"]')).toHaveCount(1);
    await page.goto(url);
    await expect(page.locator('[data-shell="confirmation"]')).toBeVisible();
  });
});

test.describe("recovery from corrupted storage", () => {
  const seed = async (page: Page, key: string, value: string) =>
    page.addInitScript(
      ([k, v]) => {
        if (!window.sessionStorage.getItem(`seeded:${k}`)) {
          window.localStorage.setItem(k!, v!);
          window.sessionStorage.setItem(`seeded:${k}`, "1");
        }
      },
      [key, value],
    );

  test("corrupted checkout state resets cleanly with a notice", async ({ page }) => {
    await seed(page, CART_STORAGE_KEY, JSON.stringify({ version: 1, lines: [{ productId: KNIFE, variantId: "walnut", quantity: 1 }] }));
    await seed(page, CHECKOUT_STORAGE_KEY, "{corrupt");
    const problems = trackErrors(page);
    await page.goto("/checkout");
    await expect(page.locator('[data-shell="checkout-recovered"]')).toContainText("could not be read");
    await stepHeading(page, /Shipping address/);
    await expect(page.getByLabel("Full name")).toHaveValue("");
    expect(problems).toEqual([]);
  });

  test("corrupted orders reset cleanly; a damaged order is dropped but good ones stay", async ({ page }) => {
    await seed(page, ORDERS_STORAGE_KEY, "not json at all");
    await page.goto("/orders");
    await expect(page.locator('[data-shell="orders-notice"]')).toContainText("could not be read");
    await expect(page.locator('[data-shell="orders-empty"]')).toBeVisible();
  });

  test("a confirmation URL for an order that is not saved explains itself", async ({ page }) => {
    await page.goto("/orders/111-0000000-0000000/confirmation");
    await expect(page.locator('[data-shell="order-not-found"]')).toContainText("couldn't find that order");
    await expect(main(page).getByRole("link", { name: "View your orders" })).toBeVisible();
  });

  test("the orders page has an intentional empty state", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { level: 1, name: "Your Orders" })).toBeVisible();
    await expect(page.locator('[data-shell="orders-empty"]')).toContainText("no orders yet");
    await expect(main(page).getByRole("link", { name: "Continue shopping" })).toBeVisible();
  });
});

test.describe("keyboard-only checkout", () => {
  test("the whole checkout is completed from the keyboard", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    await page.getByLabel("Full name").focus();
    await page.keyboard.type("Ada Lovelace");
    await page.keyboard.press("Tab");
    await page.keyboard.type("12 Analytical Way");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Seattle");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Washington"); // typing on a focused select picks the option
    await page.keyboard.press("Tab");
    await page.keyboard.type("98101");
    await page.keyboard.press("Tab");
    await page.keyboard.type("2065550142");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/step=delivery/);
    await expect(page.locator("#checkout-step-heading")).toBeFocused();

    await page.getByRole("radio", { name: /Standard/ }).focus();
    await page.keyboard.press("ArrowDown"); // expedited
    await page.keyboard.press("ArrowUp"); // back to standard
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/step=payment/);

    await page.getByLabel("Name on card").focus();
    await page.keyboard.type("Ada Lovelace");
    await page.keyboard.press("Tab");
    await page.keyboard.type("4242424242424242");
    await page.keyboard.press("Tab");
    await page.keyboard.type("1234");
    await page.keyboard.press("Tab");
    await page.keyboard.type("123");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/step=review/);

    await page.locator('[data-shell="place-order"]').focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/confirmation$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    expect(await orders(page)).toHaveLength(1);
  });
});

test.describe("accessibility and layout", () => {
  test("axe: address, delivery, payment (with errors), review, confirmation, orders, empty states", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator('[data-shell="checkout-empty"]')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto("/orders");
    await expect(page.locator('[data-shell="orders-empty"]')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    await expect(page.getByLabel("Full name")).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Continue to delivery" }).click(); // errors showing
    expect(await seriousViolations(page)).toEqual([]);
    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(page.getByRole("radio", { name: /Standard/ })).toBeChecked();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await page.getByRole("button", { name: "Review your order" }).click(); // errors showing
    expect(await seriousViolations(page)).toEqual([]);
    await fillCard(page, DECLINED);
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page.locator('[data-shell="card-declined"]')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await fillCard(page);
    await page.getByRole("button", { name: "Review your order" }).click();
    await expect(page.locator('[data-shell="review"]')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.locator('[data-shell="place-order"]').click();
    await expect(page.locator('[data-shell="confirmation"]')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto("/orders");
    await expect(page.locator('[data-shell="order-card"]')).toHaveCount(1);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("every checkout step and the confirmation fit the viewport, and primary controls are tappable at 375", async ({ page }) => {
    const mobile = test.info().project.name === "mobile";
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    const inspect = async (targets: Locator[]) => {
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      if (mobile) for (const target of targets) expect((await box(target)).height).toBeGreaterThanOrEqual(43.5);
    };

    await inspect([page.getByLabel("Full name"), page.getByLabel("State"), page.getByLabel("ZIP code"), page.getByRole("button", { name: "Continue to delivery" })]);
    await fillAddress(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await inspect([page.getByRole("radio", { name: /Expedited/ }).locator("xpath=ancestor::label"), page.getByRole("button", { name: "Continue to payment" })]);
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await inspect([page.getByLabel("Card number"), page.getByLabel("Expiration date"), page.getByLabel("Security code (CVC)"), page.getByRole("button", { name: "Review your order" })]);
    await fillCard(page);
    await page.getByRole("button", { name: "Review your order" }).click();
    await inspect([page.locator('[data-shell="place-order"]'), page.getByRole("link", { name: "Change shipping address" })]);
    await page.locator('[data-shell="place-order"]').click();
    await expect(page.locator('[data-shell="confirmation"]')).toBeVisible();
    await inspect([page.getByRole("link", { name: "Continue shopping" }), page.getByRole("link", { name: "View your orders" })]);
    // No form field is clipped by the viewport.
    await page.goto("/orders");
    await inspect([page.getByRole("link", { name: "View order details" })]);
  });

  test("desktop shows the order summary beside the form; mobile stacks it below", async ({ page }) => {
    await addToCart(page, KNIFE);
    await page.goto("/checkout");
    const form = await box(page.locator('[data-shell="checkout-step"]'));
    const summary = await box(page.locator('[data-shell="order-summary"]'));
    if (test.info().project.name === "mobile") {
      expect(summary.y).toBeGreaterThan(form.y + form.height - 1);
      expect(summary.width).toBeGreaterThan(300);
    } else {
      expect(summary.x).toBeGreaterThan(form.x + form.width - 1);
      expect(Math.abs(summary.y - form.y)).toBeLessThan(2);
    }
  });
});
