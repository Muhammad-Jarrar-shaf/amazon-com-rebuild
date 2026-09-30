import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { getAllProducts, getProductById, getRelatedProducts, getFeaturedProducts } from "@/lib/catalog";

// Product detail page (FR-PDP-1..10, FR-ERR-3, NFR-A11Y-*, NFR-RESP-1). Runs in the desktop (1440) and mobile (375) projects.
// Product ids are the seed catalog's demo states: hero (3 variants, one unavailable), low stock, out of stock, unavailable to ship.

const HERO_ID = "B0HALO0AUR";
const LOW_STOCK_ID = "B0HALO0PUL";
const OUT_OF_STOCK_ID = "B0VOXL0SPK";
const RESTRICTED_ID = "B0NIMB0PWR";
const SINGLE_VARIANT_ID = "B0HRTH0KNF";

const hero = getProductById(HERO_ID)!;
const EXTERNAL = !!process.env.E2E_BASE_URL;
// The webServer pins the clock to 2026-10-01 (Thursday); the hero ships in 3 business days: Tuesday, October 6.
const HERO_DELIVERY = EXTERNAL ? /FREE delivery \w+day, \w+ \d+/ : /FREE delivery Tuesday, October 6/;

function trackErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  return problems;
}

const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const mainImage = (page: Page) => page.locator('[aria-label="Product images"] .cursor-zoom-in img');
const buyBox = (page: Page) => page.getByRole("region", { name: "Purchase options" });
const priceRegion = (page: Page) => page.getByRole("region", { name: "Price" });
const quantityInput = (page: Page) => page.getByRole("textbox", { name: "Quantity" });
// next/image renders `src` as an absolute URL, so compare on the path the catalog specifies.
const endsWith = (path: string) => new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
const swatch = (page: Page, label: string) => page.locator("label", { hasText: label });

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

test.describe("product page content", () => {
  test("renders the hero product from a direct URL with every purchase-decision element", async ({ page }) => {
    const problems = trackErrors(page);
    // NFR-SEC-2: nothing may load from another host (no hotlinked or Amazon-hosted images, scripts or fonts).
    const hosts = new Set<string>();
    page.on("request", (request) => hosts.add(new URL(request.url()).host));
    const response = await page.goto(`/dp/${HERO_ID}`);
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(new RegExp(hero.title.slice(0, 30)));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(hero.title);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Electronics");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Over-Ear Headphones");

    const grid = page.locator(".pdp-grid");
    await expect(grid.getByText("Visit the Halo Audio Store")).toBeVisible();
    await expect(grid.getByRole("img", { name: "4.6 out of 5 stars" })).toBeVisible();
    await expect(grid.getByText("Top Pick")).toBeVisible();
    await expect(grid.getByText("5K+")).toBeVisible();

    await expect(priceRegion(page)).toContainText("$79.99");
    await expect(priceRegion(page)).toContainText("38 percent off");
    await expect(priceRegion(page)).toContainText("List Price: $129.99");
    await expect(priceRegion(page)).toContainText("You save $50.00");

    await expect(buyBox(page)).toContainText(HERO_DELIVERY);
    await expect(buyBox(page)).toContainText("In Stock");
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toBeEnabled();
    await expect(buyBox(page)).toContainText("Ships from");
    await expect(buyBox(page)).toContainText("Halo Audio");
    await expect(buyBox(page)).toContainText("30-day refund / replacement");

    await expect(page.getByRole("region", { name: "About this item" }).getByRole("listitem")).toHaveCount(hero.bullets.length);
    await expect(page.getByRole("table", { name: /Specifications for/ }).getByRole("row")).toHaveCount(hero.specs.length);

    const related = page.getByRole("region", { name: "Products related to this item" }).getByRole("link");
    expect(await related.count()).toBeGreaterThanOrEqual(4);
    for (const href of await related.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
      expect(href).toMatch(/^\/dp\/B0[A-Z0-9]{8}$/);
    }

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
    expect([...hosts], "every request stays on the app's own origin").toEqual([new URL(page.url()).host]);
  });

  test("every product page renders, names its product, and fits the viewport", async ({ page }) => {
    test.setTimeout(180_000);
    const problems = trackErrors(page);
    for (const product of getAllProducts()) {
      const response = await page.goto(`/dp/${product.id}`);
      expect(response?.status(), product.id).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), product.id).toHaveText(product.title);
      expect(await horizontalOverflow(page), `${product.id} horizontal overflow`).toBeLessThanOrEqual(0);
    }
    expect(problems).toEqual([]);
  });

  test("falls back to the generated illustration when an image fails to load", async ({ page }) => {
    await page.route("**/assets/products/hero-black-front.webp", (route) => route.abort());
    await page.goto(`/dp/${HERO_ID}`);
    const failed = page.getByRole("img", { name: "Halo Aura headphones in Midnight Black, front view" });
    await expect(failed.first()).toBeVisible();
    expect(await failed.first().evaluate((element) => element.tagName.toLowerCase())).toBe("svg");
    // The other photos are unaffected.
    await expect(page.getByRole("button", { name: "Show image 2 of 3" })).toBeVisible();
  });
});

test.describe("gallery", () => {
  test("thumbnails switch the main image and expose their pressed state", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const [front, angle, top] = hero.variants[0]!.images;
    await expect(page.getByRole("list", { name: "Image thumbnails" }).getByRole("button")).toHaveCount(3);
    await expect(mainImage(page)).toHaveAttribute("src", endsWith(front!.src!));
    await expect(page.getByRole("button", { name: "Show image 1 of 3" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Show image 2 of 3" }).click();
    await expect(mainImage(page)).toHaveAttribute("src", endsWith(angle!.src!));
    await expect(mainImage(page)).toHaveAttribute("alt", angle!.alt);
    await expect(page.getByRole("button", { name: "Show image 2 of 3" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Show image 1 of 3" })).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Show image 3 of 3" }).click();
    await expect(mainImage(page)).toHaveAttribute("src", endsWith(top!.src!));
  });

  test("thumbnails are keyboard operable", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const second = page.getByRole("button", { name: "Show image 2 of 3" });
    await second.focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("variants", () => {
  test("selecting a variant updates image, price, savings, availability and the URL", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto(`/dp/${HERO_ID}`);
    const silver = hero.variants[1]!;
    await expect(page.getByRole("group", { name: /Color: Midnight Black/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Midnight Black/ })).toBeChecked();

    await swatch(page, "Space Silver").click();
    await expect(page.getByRole("group", { name: /Color: Space Silver/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Space Silver/ })).toBeChecked();
    await expect(mainImage(page)).toHaveAttribute("src", endsWith(silver.images[0]!.src!));
    await expect(priceRegion(page)).toContainText("$84.99");
    await expect(priceRegion(page)).toContainText("35 percent off");
    await expect(priceRegion(page)).toContainText("You save $45.00");
    await expect(buyBox(page)).toContainText("In Stock");
    await expect(page.getByRole("list", { name: "Image thumbnails" })).toHaveCount(0);
    await expect(page).toHaveURL(/variant=space-silver/);

    // The selection survives a reload and a shared link (server-rendered from ?variant=).
    await page.reload();
    await expect(page.getByRole("radio", { name: /Space Silver/ })).toBeChecked();
    await expect(priceRegion(page)).toContainText("$84.99");

    await swatch(page, "Midnight Black").click();
    await expect(priceRegion(page)).toContainText("$79.99");
    await expect(page).toHaveURL(/variant=midnight-black/);
    await expect(page.getByRole("list", { name: "Image thumbnails" }).getByRole("button")).toHaveCount(3);
    expect(problems).toEqual([]);
  });

  test("an unavailable variant is visibly disabled, labeled, and cannot be selected or added", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const rose = page.getByRole("radio", { name: /Sunset Rose/ });
    await expect(rose).toBeDisabled();
    await expect(swatch(page, "Sunset Rose")).toContainText("Unavailable");
    await expect(swatch(page, "Sunset Rose")).toHaveClass(/cursor-not-allowed/);

    await swatch(page, "Sunset Rose").click({ force: true });
    await expect(page.getByRole("radio", { name: /Midnight Black/ })).toBeChecked();
    await expect(page.getByRole("group", { name: /Color: Midnight Black/ })).toBeVisible();
    await expect(page).not.toHaveURL(/variant=/);
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });

  test("opening an unavailable variant by URL shows the unavailable state and no way to buy it", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}?variant=sunset-rose`);
    await expect(page.getByRole("group", { name: /Color: Sunset Rose/ })).toBeVisible();
    await expect(buyBox(page)).toContainText("Currently unavailable.");
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toHaveCount(0);
    await expect(quantityInput(page)).toHaveCount(0);
    await expect(buyBox(page).getByRole("link", { name: "See similar items" })).toBeVisible();
    // The other variants stay selectable.
    await swatch(page, "Space Silver").click();
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });

  test("an unknown variant in the URL falls back to the default", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}?variant=does-not-exist`);
    await expect(page.getByRole("radio", { name: /Midnight Black/ })).toBeChecked();
    await expect(priceRegion(page)).toContainText("$79.99");
  });

  test("single-variant products show no variant picker", async ({ page }) => {
    await page.goto(`/dp/${SINGLE_VARIANT_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("group", { name: /^(Handle|Color|Size):/ })).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
  });

  test("radio group is keyboard navigable and skips the disabled option", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    await page.getByRole("radio", { name: /Midnight Black/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /Space Silver/ })).toBeChecked();
    await page.keyboard.press("ArrowRight");
    // Sunset Rose is disabled, so the selection wraps back to the first available option.
    await expect(page.getByRole("radio", { name: /Midnight Black/ })).toBeChecked();
  });
});

test.describe("quantity", () => {
  test("stays within 1 to 10, with boundary states and keyboard support", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const decrease = page.getByRole("button", { name: "Decrease quantity" });
    const increase = page.getByRole("button", { name: "Increase quantity" });
    const input = quantityInput(page);

    await expect(input).toHaveValue("1");
    await expect(decrease).toBeDisabled();
    await increase.click();
    await expect(input).toHaveValue("2");
    await expect(decrease).toBeEnabled();

    await input.focus();
    await page.keyboard.press("ArrowUp");
    await expect(input).toHaveValue("3");
    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveValue("2");

    await input.fill("99");
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("10");
    await expect(increase).toBeDisabled();
    await expect(buyBox(page)).toContainText("Limit 10 per order");

    await input.fill("abc");
    await input.blur();
    await expect(input).toHaveValue("10");
    await input.fill("0");
    await input.blur();
    await expect(input).toHaveValue("1");
    await expect(decrease).toBeDisabled();
  });

  test("is limited by stock on a low-stock product", async ({ page }) => {
    await page.goto(`/dp/${LOW_STOCK_ID}`);
    await expect(buyBox(page)).toContainText("Only 3 left in stock - order soon.");
    const input = quantityInput(page);
    await input.fill("7");
    await input.blur();
    await expect(input).toHaveValue("3");
    await expect(page.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    await expect(buyBox(page)).toContainText("Only 3 available");
  });

  test("resets to a valid quantity when switching variant", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    await quantityInput(page).fill("8");
    await quantityInput(page).blur();
    await swatch(page, "Space Silver").click();
    await expect(quantityInput(page)).toHaveValue("8");
  });
});

test.describe("add to cart boundary", () => {
  test("validates the selection and says honestly that the cart is not built yet", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await buyBox(page).getByRole("button", { name: "Add to cart" }).click();
    const status = buyBox(page).getByRole("status").filter({ hasText: "Your selection is ready" });
    await expect(status).toContainText("2 × Midnight Black");
    await expect(status).toContainText("$159.98");
    await expect(status).toContainText("nothing has been added yet");
    // Nothing is added: the header cart count is untouched.
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();

    // The notice belongs to the selection it was raised for.
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(buyBox(page).getByText("Your selection is ready")).toHaveCount(0);
  });
});

test.describe("product states", () => {
  test("out of stock: clearly labeled, not purchasable, with a way to similar items", async ({ page }) => {
    await page.goto(`/dp/${OUT_OF_STOCK_ID}`);
    await expect(buyBox(page)).toContainText("Currently unavailable.");
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toHaveCount(0);
    await expect(quantityInput(page)).toHaveCount(0);
    await expect(buyBox(page)).not.toContainText("delivery");
    await buyBox(page).getByRole("link", { name: "See similar items" }).click();
    await expect(page).toHaveURL(/#related$/);
    await expect(page.getByRole("heading", { name: "Products related to this item" })).toBeInViewport();
  });

  test("unavailable to ship: says so and cannot be purchased", async ({ page }) => {
    await page.goto(`/dp/${RESTRICTED_ID}`);
    await expect(buyBox(page)).toContainText("This item cannot be shipped to your selected delivery location.");
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toHaveCount(0);
  });

  test("low stock: warns with the exact count and still allows purchase", async ({ page }) => {
    await page.goto(`/dp/${LOW_STOCK_ID}`);
    await expect(buyBox(page)).toContainText("Only 3 left in stock - order soon.");
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });
});

test.describe("invalid product id", () => {
  test("renders the product-not-found experience with a 404 status and a way back", async ({ page }) => {
    const response = await page.goto("/dp/NOT-A-PRODUCT");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle(/Product not found/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find that product");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    const featured = page.getByRole("region", { name: "Popular right now" }).getByRole("link");
    expect(await featured.count()).toBeGreaterThanOrEqual(4);
    await expect(featured.first()).toHaveAttribute("href", `/dp/${getFeaturedProducts(1)[0]!.id}`);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await page.getByRole("link", { name: "Continue shopping" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a discovery link from the not-found page opens a real product", async ({ page }) => {
    await page.goto("/dp/NOT-A-PRODUCT");
    await page.getByRole("region", { name: "Popular right now" }).getByRole("link").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(getFeaturedProducts(1)[0]!.title);
  });
});

test.describe("related products", () => {
  test("cards open the related product's page", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const first = getRelatedProducts(hero)[0]!;
    await page.getByRole("region", { name: "Products related to this item" }).locator(`a[href="/dp/${first.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/dp/${first.id}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);
  });
});

test.describe("desktop responsive layout", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop project only"));

  test("uses the observed multi-column hierarchy and never overflows", async ({ page }) => {
    const problems = trackErrors(page);
    for (const { width, columns } of [
      { width: 1440, columns: 3 },
      { width: 1280, columns: 3 },
      { width: 1024, columns: 2 },
      { width: 768, columns: 2 },
      { width: 375, columns: 1 },
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/dp/${HERO_ID}`);
      const at = `at ${width}px`;
      expect(await horizontalOverflow(page), `overflow ${at}`).toBeLessThanOrEqual(0);

      const gallery = await box(page.getByRole("region", { name: "Product images" }));
      const title = await box(page.getByRole("heading", { level: 1 }));
      const purchase = await box(buyBox(page));
      const variants = await box(page.getByRole("group", { name: /Color:/ }));

      if (columns === 3) {
        expect(gallery.x + gallery.width, `gallery left of info ${at}`).toBeLessThanOrEqual(title.x + 1);
        expect(title.x + title.width, `info left of buy box ${at}`).toBeLessThanOrEqual(purchase.x + 1);
        await expect(page.locator('[data-shell="buybox-price"]'), at).toBeVisible();
      } else if (columns === 2) {
        expect(gallery.x + gallery.width, `gallery left of info ${at}`).toBeLessThanOrEqual(title.x + 1);
        expect(purchase.y, `buy box below options ${at}`).toBeGreaterThan(variants.y);
        expect(Math.abs(purchase.x - title.x), `buy box in the info column ${at}`).toBeLessThan(2);
        await expect(page.locator('[data-shell="buybox-price"]'), at).toBeHidden();
      } else {
        expect(title.y, `title first ${at}`).toBeLessThan(gallery.y);
        expect(gallery.y, `gallery before options ${at}`).toBeLessThan(variants.y);
        expect(variants.y, `options before buy box ${at}`).toBeLessThan(purchase.y);
        await expect(page.locator('[data-shell="buybox-price"]'), at).toBeHidden();
      }
    }
    expect(problems).toEqual([]);
  });
});

test.describe("mobile product page", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile project only"));

  test("is a true single-column commerce layout in the observed order", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const ys: number[] = [];
    for (const locator of [
      page.getByRole("heading", { level: 1 }),
      page.getByRole("region", { name: "Product images" }),
      priceRegion(page),
      page.getByRole("group", { name: /Color:/ }),
      buyBox(page),
      page.getByRole("region", { name: "About this item" }),
    ]) {
      ys.push((await box(locator)).y);
    }
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    // The price is visible without scrolling past the gallery twice, and the primary CTA is reachable.
    await expect(priceRegion(page)).toBeVisible();
    await buyBox(page).getByRole("button", { name: "Add to cart" }).scrollIntoViewIfNeeded();
    await expect(buyBox(page).getByRole("button", { name: "Add to cart" })).toBeInViewport();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("keeps every purchase control at least 44px", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const controls: [string, Locator][] = [
      ["thumbnail 1", page.getByRole("button", { name: "Show image 1 of 3" })],
      ["thumbnail 3", page.getByRole("button", { name: "Show image 3 of 3" })],
      ["swatch Midnight Black", swatch(page, "Midnight Black")],
      ["swatch Space Silver", swatch(page, "Space Silver")],
      ["decrease quantity", page.getByRole("button", { name: "Decrease quantity" })],
      ["increase quantity", page.getByRole("button", { name: "Increase quantity" })],
      ["quantity field", quantityInput(page)],
      ["Add to cart", buyBox(page).getByRole("button", { name: "Add to cart" })],
    ];
    for (const [name, locator] of controls) {
      const found = await box(locator);
      expect(found.width, `${name} width`).toBeGreaterThanOrEqual(44);
      expect(found.height, `${name} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test("the variant and quantity controls work by touch", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    await swatch(page, "Space Silver").tap();
    await expect(priceRegion(page)).toContainText("$84.99");
    await page.getByRole("button", { name: "Increase quantity" }).tap();
    await expect(quantityInput(page)).toHaveValue("2");
  });
});

test.describe("accessibility (axe)", () => {
  for (const [name, path] of [
    ["hero product", `/dp/${HERO_ID}`],
    ["a different variant", `/dp/${HERO_ID}?variant=space-silver`],
    ["low stock product", `/dp/${LOW_STOCK_ID}`],
    ["out of stock product", `/dp/${OUT_OF_STOCK_ID}`],
    ["unavailable to ship product", `/dp/${RESTRICTED_ID}`],
    ["product not found", "/dp/NOT-A-PRODUCT"],
  ] as const) {
    test(`${name} has no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("headings are in a sensible order and images have alt text", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    const headings = await page.getByRole("heading").evaluateAll((els) => els.map((el) => `${el.tagName}:${(el.textContent ?? "").trim()}`));
    expect(headings.filter((heading) => heading.startsWith("H1"))).toHaveLength(1);
    expect(headings).toContain("H2:About this item");
    expect(headings).toContain("H2:Product details");
    expect(headings).toContain("H2:Products related to this item");
    const missingAlt = await page.locator("img:not([alt])").count();
    expect(missingAlt).toBe(0);
    await expect(mainImage(page)).toHaveAttribute("alt", /Halo Aura headphones/);
  });

  test("the purchase flow is operable by keyboard alone", async ({ page }) => {
    await page.goto(`/dp/${HERO_ID}`);
    await page.getByRole("radio", { name: /Midnight Black/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(priceRegion(page)).toContainText("$84.99");
    await page.getByRole("button", { name: "Increase quantity" }).focus();
    await page.keyboard.press("Enter");
    await expect(quantityInput(page)).toHaveValue("2");
    await page.getByRole("button", { name: "Add to cart" }).focus();
    await page.keyboard.press("Enter");
    await expect(buyBox(page)).toContainText("2 × Space Silver");
  });
});
