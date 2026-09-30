import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Shell coverage (FR-NAV-1..4, NFR-A11Y-1..6, NFR-RESP-1). Runs in both projects: desktop 1440 and mobile 375.

function trackErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  return problems;
}

const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
}

async function expectMinTapTarget(locator: ReturnType<Page["locator"]>, label: string) {
  const box = await locator.boundingBox();
  expect(box, `${label} has a box`).not.toBeNull();
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
}

test.describe("desktop shell", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop project only"));

  test("has the observed header, sub-nav and footer structure", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Shop menu" })).toBeVisible();
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Footer" })).toBeVisible();

    // Measured on amazon.com at 1440px: top bar 60px, sub-nav 39px, search field 38px.
    const height = async (selector: string) => Math.round((await page.locator(selector).boundingBox())!.height);
    expect(await height('[data-shell="topbar"]')).toBe(60);
    expect(await height('[data-shell="subnav"]')).toBe(39);
    const searchBox = await page.getByRole("combobox", { name: "Search Amazon Rebuild" }).locator("..").boundingBox();
    expect(Math.round(searchBox!.height)).toBe(38);

    await expect(page.getByRole("link", { name: "Amazon Rebuild, home" }).first()).toBeVisible();
    await expect(page.locator('[data-shell="delivery-header"]')).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Search in" })).toBeAttached();
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hello, sign in Account & Lists" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Returns & Orders" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();

    const subnavLabels = await page.locator('[data-shell="subnav"] li').allInnerTexts();
    expect(subnavLabels.map((label) => label.trim())).toEqual([
      "All",
      "Prime Video",
      "Coupons",
      "Customer Service",
      "Today's Deals",
      "Registry",
      "Gift Cards",
      "Sell",
    ]);

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
  });

  test("destinations that are not built yet are intentionally inert", async ({ page }) => {
    await page.goto("/");
    const coupons = page.getByRole("link", { name: "Coupons" });
    await expect(coupons).toHaveAttribute("aria-disabled", "true");
    await expect(coupons).toHaveAttribute("title", /not available/i);
    await expect(coupons).not.toHaveAttribute("tabindex", /.*/);
    // Playwright refuses to click aria-disabled elements, so force it to prove nothing happens.
    await coupons.click({ force: true });
    await expect(page).toHaveURL(/\/$/);
    // The logo is a real link and is never inert.
    await expect(page.getByRole("link", { name: "Amazon Rebuild, home" }).first()).not.toHaveAttribute("aria-disabled", "true");
  });

  test("adapts across 1440, 1024, 768 and 375 without horizontal overflow", async ({ page }) => {
    const problems = trackErrors(page);
    // xl (>=1280): full top bar incl. "Deliver to" and "EN"; lg (>=1024): adds Returns & Orders and the last sub-nav items;
    // md (>=768): logo, search, account, cart; below 768: the mobile layout. minSearch keeps search prominent at every width.
    const cases = [
      { width: 1440, mobile: false, lg: true, xl: true, minSearch: 600 },
      { width: 1280, mobile: false, lg: true, xl: true, minSearch: 450 },
      { width: 1024, mobile: false, lg: true, xl: false, minSearch: 400 },
      { width: 768, mobile: false, lg: false, xl: false, minSearch: 330 },
      { width: 375, mobile: true, lg: false, xl: false, minSearch: 340 },
    ];
    for (const { width, mobile, lg, xl, minSearch } of cases) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const at = `at ${width}px`;

      expect(await horizontalOverflow(page), `overflow ${at}`).toBeLessThanOrEqual(0);
      await expect(page.getByRole("banner"), at).toBeVisible();
      await expect(page.getByRole("search"), at).toBeVisible();
      await expect(page.getByRole("button", { name: "Open menu" }), at).toBeVisible({ visible: mobile });
      await expect(page.getByRole("navigation", { name: "Shop menu" }), at).toBeVisible({ visible: !mobile });
      await expect(page.getByRole("navigation", { name: "Quick links" }), at).toBeVisible({ visible: mobile });
      await expect(page.locator('[data-shell="delivery-header"]'), at).toBeVisible({ visible: xl });
      await expect(page.locator('[data-shell="delivery-row"]'), at).toBeVisible({ visible: !xl });
      await expect(page.getByRole("link", { name: "EN", exact: true }), at).toBeVisible({ visible: xl });
      await expect(page.getByRole("link", { name: "Returns & Orders" }), at).toBeVisible({ visible: lg });
      await expect(page.getByRole("link", { name: "Registry" }), at).toBeVisible({ visible: lg });
      await expect(page.getByRole("link", { name: "Cart, 0 items" }), at).toBeVisible();
      const searchWidth = (await page.getByRole("search").boundingBox())!.width;
      expect(searchWidth, `search width ${at}`).toBeGreaterThanOrEqual(minSearch);
    }
    expect(problems).toEqual([]);
  });
});

test.describe("mobile shell", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile project only"));

  test("stacks the observed mobile hierarchy and stays within 375px", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/");

    const strip = page.locator('[data-shell="banner-strip"]');
    const menu = page.getByRole("button", { name: "Open menu" });
    const search = page.getByRole("search");
    const chips = page.getByRole("navigation", { name: "Quick links" });
    const delivery = page.locator('[data-shell="delivery-row"]');
    for (const item of [strip, menu, search, chips, delivery]) await expect(item).toBeVisible();
    await expect(page.getByRole("link", { name: "Amazon Rebuild, home" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Shop menu" })).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Search in" })).toBeHidden();

    // Vertical order: strip, top row, full-width search, chip row, delivery row.
    const tops = await Promise.all([strip, menu, search, chips, delivery].map(async (item) => (await item.boundingBox())!.y));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    const searchBox = (await search.boundingBox())!;
    expect(searchBox.width).toBeGreaterThanOrEqual(340);

    // The chip row scrolls horizontally inside its own container and is keyboard reachable.
    const scrolls = await chips.evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(scrolls).toBe(true);
    await expect(chips).toHaveAttribute("tabindex", "0");

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
  });

  test("meets the 44px touch-target minimum on primary controls", async ({ page }) => {
    await page.goto("/");
    await expectMinTapTarget(page.getByRole("button", { name: "Open menu" }), "menu button");
    await expectMinTapTarget(page.getByRole("button", { name: "Search", exact: true }), "search button");
    await expectMinTapTarget(page.getByRole("button", { name: "Dismiss banner" }), "dismiss banner");
    const searchField = (await page.getByRole("combobox", { name: "Search Amazon Rebuild" }).boundingBox())!;
    expect(searchField.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("link", { name: "Back to top" }).scrollIntoViewIfNeeded();
    const backToTop = (await page.getByRole("link", { name: "Back to top" }).boundingBox())!;
    expect(backToTop.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "Open menu" }).click();
    await expectMinTapTarget(page.getByRole("button", { name: "Close menu" }), "close menu");
  });

  test("the info strip can be dismissed", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-shell="banner-strip"]')).toBeVisible();
    await page.getByRole("button", { name: "Dismiss banner" }).click();
    await expect(page.locator('[data-shell="banner-strip"]')).toBeHidden();
  });
});

test.describe("menu drawer (both widths)", () => {
  function triggerFor(page: Page, isMobile: boolean) {
    return isMobile ? page.getByRole("button", { name: "Open menu" }) : page.getByRole("button", { name: "All", exact: true });
  }

  test("opens with focus inside, traps focus, and closes with Escape, the close button, the backdrop and a link", async ({
    page,
    isMobile,
  }) => {
    const problems = trackErrors(page);
    await page.goto("/");
    const trigger = triggerFor(page, isMobile);
    const dialog = page.getByRole("dialog", { name: "Main menu" });
    const close = dialog.getByRole("button", { name: "Close menu" });

    await expect(dialog).toBeHidden();
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(close).toBeFocused();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await expect(dialog.getByRole("heading", { name: "Shop by Department" })).toBeVisible();
    // Departments are real links now that /s exists (S3); destinations that are still unbuilt stay inert.
    await expect(dialog.getByRole("link", { name: /Electronics/ })).toHaveAttribute("href", "/s?dept=electronics");
    await expect(dialog.getByRole("link", { name: /Electronics/ })).not.toHaveAttribute("aria-disabled", "true");
    await expect(dialog.getByRole("link", { name: /Your Orders/ })).toHaveAttribute("aria-disabled", "true");

    // Focus may leave the dialog only for the browser's own UI (activeElement is then <body>); it must never reach the
    // page behind the modal, and it wraps back into the dialog. Verified separately by logging each Tab.
    let wrapped = false;
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press("Tab");
      const where = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return "browser-ui";
        return element.closest("dialog") ? "dialog" : "page-behind";
      });
      expect(where, `focus after Tab ${i + 1}`).not.toBe("page-behind");
      if (i > 0 && where === "dialog") wrapped = true;
    }
    expect(wrapped).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

    await trigger.click();
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    const viewport = page.viewportSize()!;
    await page.mouse.click(viewport.width - 4, Math.round(viewport.height / 2));
    await expect(dialog).toBeHidden();

    await trigger.click();
    await dialog.getByRole("link", { name: "Home", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(problems).toEqual([]);
  });
});

test.describe("footer", () => {
  test("has grouped links and a working Back to top", async ({ page }) => {
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 400 });
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("heading", { name: "Shop" })).toBeAttached();
    await expect(footer.getByRole("heading", { name: "Let Us Help You" })).toBeAttached();
    await expect(footer.getByRole("heading", { name: "Get to Know Us" })).toBeAttached();

    const backToTop = page.getByRole("link", { name: "Back to top" });
    // Scroll to the very bottom explicitly: on short desktop pages the link is already in view.
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    // Smooth scrolling is async, so poll instead of reading scrollY once.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await backToTop.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe("accessibility (axe)", () => {
  test("home shell has no critical or serious violations", async ({ page }) => {
    await page.goto("/");
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("open menu drawer has no critical or serious violations", async ({ page, isMobile }) => {
    await page.goto("/");
    const trigger = isMobile ? page.getByRole("button", { name: "Open menu" }) : page.getByRole("button", { name: "All", exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Main menu" })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
