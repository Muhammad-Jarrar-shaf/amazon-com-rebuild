import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { CART_STORAGE_KEY } from "@/lib/cart/persistence";

// Cart (FR-CART-1..7, J3): persistent cart, mini-cart, cart page, quantity, remove + undo, recovery. Runs in the desktop
// (1440) and mobile (375) projects. Demo products: hero (Midnight Black $79.99, Space Silver $84.99, Sunset Rose sold
// out), the chef's knife (single variant, $49.99) and the earbuds (single variant, 3 in stock).

const HERO = "B0HALO0AUR";
const KNIFE = "B0HRTH0KNF";
const EARBUDS = "B0HALO0PUL";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Shopping Cart" });
const main = (page: Page) => page.getByRole("main");
const cartLines = (page: Page) => page.locator('[data-shell="cart-line"]');
const buyBox = (page: Page) => page.getByRole("region", { name: "Purchase options" });
const badge = (page: Page, count: number) => page.getByRole("link", { name: `Cart, ${count} ${count === 1 ? "item" : "items"}` });
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const storedCart = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), CART_STORAGE_KEY);

function trackErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  return problems;
}

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
}

/** Puts a raw value in localStorage before the app loads, once (a reload must not overwrite what the app then saved). */
async function seedStorage(page: Page, value: string) {
  await page.addInitScript(
    ([key, raw]) => {
      if (!window.sessionStorage.getItem("seeded")) {
        window.localStorage.setItem(key!, raw!);
        window.sessionStorage.setItem("seeded", "1");
      }
    },
    [CART_STORAGE_KEY, value],
  );
}

async function addFromProductPage(page: Page, id: string, options: { variant?: string; extra?: number } = {}) {
  await page.goto(`/dp/${id}${options.variant ? `?variant=${options.variant}` : ""}`);
  for (let i = 0; i < (options.extra ?? 0); i += 1) await page.getByRole("button", { name: "Increase quantity" }).click();
  await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
  await expect(dialog(page)).toBeVisible();
}

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  expect(found, "element has a bounding box").not.toBeNull();
  return found!;
}

test.describe("add to cart from the product page", () => {
  test("keeps the selected variant and quantity through the mini-cart to the cart page", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto(`/dp/${HERO}`);
    await page.locator("label", { hasText: "Space Silver" }).click();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();

    const mini = dialog(page);
    await expect(mini).toBeVisible();
    await expect(mini).toContainText("Added to cart");
    await expect(mini.getByRole("link", { name: /Aura Wireless/ })).toBeVisible();
    await expect(mini).toContainText("Color: Space Silver");
    await expect(mini.getByRole("textbox", { name: /Quantity of/ })).toHaveValue("3");
    await expect(mini.locator('[data-shell="line-total"]')).toContainText("$254.97");
    await expect(mini.locator('[data-shell="mini-cart-subtotal"]')).toHaveText("$254.97");
    await expect(mini).toContainText("Subtotal (3 items):");
    await expect(mini.getByRole("link", { name: "Go to Cart" })).toBeVisible();
    await expect(mini.getByRole("link", { name: /Proceed to checkout \(3 items\)/ })).toBeVisible();

    await mini.getByRole("link", { name: "Go to Cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(dialog(page)).toBeHidden();
    await expect(cartLines(page)).toHaveCount(1);
    await expect(cartLines(page).first()).toContainText("Color:");
    await expect(cartLines(page).first()).toContainText("Space Silver");
    await expect(cartLines(page).first().getByRole("textbox", { name: /Quantity of/ })).toHaveValue("3");
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$254.97");
    await expect(badge(page, 3)).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("adding the same variant again increments one line; another variant is a separate line", async ({ page }) => {
    await addFromProductPage(page, HERO);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
    await expect(dialog(page).locator('[data-shell="mini-cart-line"]')).toHaveCount(1);
    await expect(dialog(page).getByRole("textbox", { name: /Quantity of/ })).toHaveValue("2");
    await page.keyboard.press("Escape");
    await page.locator("label", { hasText: "Space Silver" }).click();
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
    await expect(dialog(page).locator('[data-shell="mini-cart-line"]')).toHaveCount(2);
    await expect(dialog(page).locator('[data-shell="mini-cart-subtotal"]')).toHaveText("$244.97");
    await expect(dialog(page)).toContainText("Subtotal (3 items):");
  });

  test("the quantity is limited to what can be ordered, and an unavailable variant cannot be added", async ({ page }) => {
    await addFromProductPage(page, EARBUDS, { extra: 2 });
    await expect(dialog(page).getByRole("textbox", { name: /Quantity of/ })).toHaveValue("3");
    await dialog(page).getByRole("button", { name: "Close cart" }).click();
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
    await expect(dialog(page)).toContainText("most that can be ordered");
    await expect(dialog(page).getByRole("textbox", { name: /Quantity of/ })).toHaveValue("3");

    await page.goto(`/dp/${HERO}?variant=sunset-rose`);
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toHaveCount(0);
  });
});

test.describe("add to cart from search results", () => {
  test("adds the default variant, updates the badge and opens the mini-cart", async ({ page }) => {
    await page.goto("/s?k=chef+knife");
    const row = page.locator('[data-shell="result-row"]').first();
    await row.getByRole("button", { name: /Add to cart/ }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText("Chef's Knife");
    await expect(dialog(page).locator('[data-shell="mini-cart-subtotal"]')).toHaveText("$49.99");
    await dialog(page).getByRole("button", { name: "Close cart" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(badge(page, 1)).toBeVisible();

    // The same product again increments quantity instead of duplicating.
    await row.getByRole("button", { name: /Add to cart/ }).click();
    await expect(dialog(page).locator('[data-shell="mini-cart-line"]')).toHaveCount(1);
    await expect(dialog(page).getByRole("textbox", { name: /Quantity of/ })).toHaveValue("2");
    await dialog(page).getByRole("button", { name: "Close cart" }).click();
    await expect(badge(page, 2)).toBeVisible();
  });

  test("a multi-variant product offers See options, not Add to cart", async ({ page }) => {
    await page.goto("/s?k=aura+headphones");
    const row = page.locator(`[data-shell="result-row"][data-product-id="${HERO}"]`);
    await expect(row.getByRole("link", { name: /See options/ })).toBeVisible();
    await expect(row.getByRole("button", { name: /Add to cart/ })).toHaveCount(0);
  });
});

test.describe("cart page journey (J3)", () => {
  test("add two products, change quantity, delete, undo, reload: totals and persistence hold", async ({ page }) => {
    const problems = trackErrors(page);
    await addFromProductPage(page, HERO);
    await page.keyboard.press("Escape");
    await page.goto(`/dp/${KNIFE}`);
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
    await expect(dialog(page)).toContainText("Subtotal (2 items):");
    await dialog(page).getByRole("link", { name: "Go to Cart" }).click();

    await expect(cartLines(page)).toHaveCount(2);
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$129.98");
    await expect(badge(page, 2)).toBeVisible();

    // Change quantity without a reload: line total, subtotal and badge all follow.
    const hero = cartLines(page).filter({ hasText: "Aura Wireless" });
    await hero.getByRole("button", { name: /Increase quantity/ }).click();
    await expect(hero.getByRole("textbox", { name: /Quantity of/ })).toHaveValue("2");
    await expect(hero.locator('[data-shell="line-total"]')).toContainText("$159.98");
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$209.97");
    await expect(page.getByText("Subtotal (3 items):").first()).toBeVisible();
    await expect(badge(page, 3)).toBeVisible();

    // Delete the knife: message names it, totals drop, the rest of the cart is untouched.
    const knife = cartLines(page).filter({ hasText: "Chef's Knife" });
    await knife.getByRole("button", { name: /^Delete/ }).click();
    await expect(cartLines(page)).toHaveCount(1);
    await expect(main(page).locator('[data-shell="cart-removed"]')).toContainText("Hearth & Co. 8-Inch Chef's Knife");
    await expect(main(page).locator('[data-shell="cart-removed"]')).toContainText("was removed from Shopping Cart.");
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$159.98");
    await expect(badge(page, 2)).toBeVisible();

    // Undo restores the exact line and leaves the other one as it was.
    await main(page).getByRole("button", { name: "Undo" }).click();
    await expect(cartLines(page)).toHaveCount(2);
    await expect(main(page).locator('[data-shell="cart-removed"]')).toHaveCount(0);
    await expect(cartLines(page).nth(1)).toContainText("Chef's Knife");
    await expect(cartLines(page).nth(1).getByRole("textbox", { name: /Quantity of/ })).toHaveValue("1");
    await expect(cartLines(page).nth(0).getByRole("textbox", { name: /Quantity of/ })).toHaveValue("2");
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$209.97");

    // Reload: the cart persists and totals are recomputed to the same values.
    await page.reload();
    await expect(cartLines(page)).toHaveCount(2);
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$209.97");
    await expect(badge(page, 3)).toBeVisible();
    expect(JSON.parse((await storedCart(page))!)).toEqual({
      version: 1,
      lines: [
        { productId: HERO, variantId: "midnight-black", quantity: 2 },
        { productId: KNIFE, variantId: "walnut", quantity: 1 },
      ],
    });
    expect(problems).toEqual([]);
  });

  test("the quantity field accepts typed values, caps them and rejects garbage", async ({ page }) => {
    await addFromProductPage(page, KNIFE);
    await page.keyboard.press("Escape");
    await page.goto("/cart");
    const line = cartLines(page).first();
    const quantity = line.getByRole("textbox", { name: /Quantity of/ });

    await quantity.fill("4");
    await quantity.press("Enter");
    await expect(quantity).toHaveValue("4");
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$199.96");

    await quantity.fill("99");
    await quantity.press("Enter");
    await expect(quantity).toHaveValue("10");
    await expect(line).toContainText("Only 10 can be ordered.");
    await expect(line.getByRole("button", { name: /Increase quantity/ })).toBeDisabled();

    await quantity.fill("abc");
    await quantity.press("Enter");
    await expect(quantity).toHaveValue("10");
    await expect(line).toContainText("Enter a quantity from 1 to 10.");

    await quantity.fill("0");
    await quantity.press("Enter");
    await expect(quantity).toHaveValue("10");
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$499.90");
  });

  test("at quantity 1 the minus becomes a trash button that removes the line with Undo", async ({ page }) => {
    await addFromProductPage(page, KNIFE);
    await dialog(page).getByRole("link", { name: "Go to Cart" }).click();
    await cartLines(page).first().getByRole("button", { name: /^Remove .* from cart/ }).click();
    await expect(page.locator('[data-shell="cart-empty"]')).toBeVisible();
    await expect(main(page).locator('[data-shell="cart-removed"]')).toBeVisible();
    await main(page).getByRole("button", { name: "Undo" }).click();
    await expect(cartLines(page)).toHaveCount(1);
  });

  test("the header cart opens the mini-cart, which edits the same cart as the page", async ({ page }) => {
    await addFromProductPage(page, KNIFE);
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Cart, 1 item" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).not.toContainText("Added to cart");
    await dialog(page).getByRole("button", { name: /Increase quantity/ }).click();
    await expect(dialog(page).locator('[data-shell="mini-cart-subtotal"]')).toHaveText("$99.98");
    await dialog(page).getByRole("link", { name: "Go to Cart" }).click();
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$99.98");
    await expect(badge(page, 2)).toBeVisible();
  });
});

test.describe("empty cart", () => {
  test("shows an empty state with a way back, and no checkout entry", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/cart");
    await expect(page).toHaveTitle(/Shopping Cart/);
    await expect(page.getByRole("heading", { level: 1, name: "Shopping Cart" })).toBeVisible();
    await expect(page.locator('[data-shell="cart-empty"]')).toContainText("Your cart is empty");
    await expect(page.getByRole("link", { name: "Continue shopping" })).toBeVisible();
    await expect(main(page).locator('[data-shell="proceed-to-checkout"]')).toHaveCount(0);
    await expect(badge(page, 0)).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe("persistence and recovery", () => {
  test("corrupted storage recovers to an empty cart with a visible notice, and the cart works again", async ({ page }) => {
    const problems = trackErrors(page);
    await seedStorage(page, "{definitely not json");
    await page.goto("/cart");
    await expect(page.locator('[data-shell="cart-empty"]')).toBeVisible();
    await expect(main(page).locator('[data-shell="cart-notice"]')).toContainText("could not be read");
    expect(JSON.parse((await storedCart(page))!)).toEqual({ version: 1, lines: [] });

    await addFromProductPage(page, KNIFE);
    await page.reload();
    await expect(badge(page, 1)).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("stale entries are removed with a notice; valid ones survive", async ({ page }) => {
    const lines = [
      { productId: KNIFE, variantId: "walnut", quantity: 2 },
      { productId: "B0GHOST000", variantId: "x", quantity: 1 },
      { productId: HERO, variantId: "sunset-rose", quantity: 1 },
      { productId: HERO, variantId: "midnight-black", quantity: 50 },
      { productId: HERO, variantId: "midnight-black", quantity: -3 },
    ];
    await seedStorage(page, JSON.stringify({ version: 1, lines }));
    await page.goto("/cart");
    await expect(cartLines(page)).toHaveCount(2);
    await expect(main(page).locator('[data-shell="cart-notice"]')).toContainText("3 items are no longer available");
    await expect(main(page).locator('[data-shell="cart-notice"]')).toContainText("reduced");
    await expect(badge(page, 12)).toBeVisible();
    // 2 x 49.99 + 10 x 79.99
    await expect(page.locator('[data-shell="cart-subtotal"]')).toHaveText("$899.88");
  });

  test("a stale schema version is discarded safely", async ({ page }) => {
    await seedStorage(page, JSON.stringify({ version: 0, lines: [{ productId: KNIFE, variantId: "walnut", quantity: 1 }] }));
    await page.goto("/cart");
    await expect(page.locator('[data-shell="cart-empty"]')).toBeVisible();
    await expect(main(page).locator('[data-shell="cart-notice"]')).toContainText("could not be read");
  });

  test("blocked storage does not crash the page and the cart still works for the visit", async ({ page }) => {
    const problems = trackErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await addFromProductPage(page, KNIFE);
    await expect(dialog(page)).toContainText("$49.99");
    await dialog(page).getByRole("button", { name: "Close cart" }).click();
    await expect(badge(page, 1)).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("the badge and cart follow across pages without a reload", async ({ page }) => {
    await addFromProductPage(page, KNIFE);
    await page.keyboard.press("Escape");
    await page.goto("/s?k=headphones");
    await expect(badge(page, 1)).toBeVisible();
    await page.goto("/");
    await expect(badge(page, 1)).toBeVisible();
  });
});

test.describe("mini-cart interaction and keyboard", () => {
  test("Escape closes it and focus returns to the control that opened it", async ({ page }) => {
    await page.goto(`/dp/${KNIFE}`);
    const add = buyBox(page).getByRole("button", { name: "Add to cart" });
    await add.focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(add).toBeFocused();
  });

  test("the whole cart journey works from the keyboard", async ({ page }) => {
    await page.goto(`/dp/${HERO}`);
    await page.getByRole("button", { name: "Increase quantity" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Add to cart" }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();

    // Focus stays inside the modal cart while Tabbing around it.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      // Inside the dialog, or out on the browser's own UI (body): never on the page behind the modal.
      expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest("dialog"))).toBe(true);
    }

    await dialog(page).getByRole("link", { name: "Go to Cart" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/cart$/);
    const line = cartLines(page).first();
    await line.getByRole("button", { name: /Increase quantity/ }).focus();
    await page.keyboard.press("Enter");
    await expect(line.getByRole("textbox", { name: /Quantity of/ })).toHaveValue("3");
    await line.getByRole("button", { name: /^Delete/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-shell="cart-empty"]')).toBeVisible();
    await main(page).getByRole("button", { name: "Undo" }).focus();
    await page.keyboard.press("Enter");
    await expect(cartLines(page)).toHaveCount(1);
    await expect(line.getByRole("textbox", { name: /Quantity of/ })).toHaveValue("3");
  });

  test("clicking the backdrop closes it and the page behind is not locked afterwards", async ({ page }) => {
    await addFromProductPage(page, KNIFE);
    await page.mouse.click(5, 300);
    await expect(dialog(page)).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
  });
});

test.describe("checkout entry point", () => {
  test("Proceed to checkout is present with the count, and honestly unavailable until checkout exists", async ({ page }) => {
    await addFromProductPage(page, KNIFE, { extra: 1 });
    await dialog(page).getByRole("link", { name: "Go to Cart" }).click();
    const proceed = main(page).locator('[data-shell="proceed-to-checkout"]');
    await expect(proceed).toContainText("Proceed to checkout (2 items)");
    await expect(proceed).toHaveAttribute("aria-disabled", "true");
    await expect(main(page).getByText("Checkout is not available in this build yet.")).toBeVisible();
  });
});

test.describe("accessibility and responsive layout", () => {
  test("cart page with items: no serious violations, no overflow, comfortable tap targets on mobile", async ({ page }) => {
    await addFromProductPage(page, HERO, { extra: 1 });
    await page.keyboard.press("Escape");
    await page.goto(`/dp/${KNIFE}`);
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
    await dialog(page).getByRole("link", { name: "Go to Cart" }).click();
    await expect(cartLines(page)).toHaveCount(2);

    expect(await seriousViolations(page)).toEqual([]);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    if (test.info().project.name === "mobile") {
      const line = cartLines(page).first();
      for (const target of [
        line.getByRole("button", { name: /Decrease quantity/ }),
        line.getByRole("button", { name: /Increase quantity/ }),
        line.getByRole("textbox", { name: /Quantity of/ }),
        line.getByRole("button", { name: /^Delete/ }),
        main(page).locator('[data-shell="proceed-to-checkout"]'),
      ]) {
        expect((await box(target)).height).toBeGreaterThanOrEqual(43.5);
      }
    }
  });

  test("empty cart page: no serious violations", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator('[data-shell="cart-empty"]')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("mini-cart open with items: labelled dialog, no serious violations, fits the viewport", async ({ page }) => {
    await addFromProductPage(page, HERO, { extra: 2 });
    await expect(dialog(page)).toHaveAttribute("aria-labelledby", "mini-cart-title");
    expect(await seriousViolations(page)).toEqual([]);
    const panel = await box(dialog(page));
    const viewport = page.viewportSize()!;
    expect(panel.x).toBeGreaterThanOrEqual(-0.5);
    expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    if (test.info().project.name === "mobile") {
      for (const target of [
        dialog(page).getByRole("button", { name: "Close cart" }),
        dialog(page).getByRole("button", { name: /Increase quantity/ }),
        dialog(page).getByRole("link", { name: "Go to Cart" }),
        dialog(page).locator('[data-shell="proceed-to-checkout"]'),
      ]) {
        expect((await box(target)).height).toBeGreaterThanOrEqual(43.5);
      }
    }
  });
});
