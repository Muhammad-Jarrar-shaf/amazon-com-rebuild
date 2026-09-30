import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { getProductById } from "@/lib/catalog";
import { displayPriceCents } from "@/lib/search/engine";

// Search, suggestions, results, refinements, sorting, pagination and category browsing (FR-SRCH-*, J2).
// URL contract: k (query), dept, brand (repeated), rating=4, min/max (whole dollars), sort, page.

const HERO_ID = "B0HALO0AUR";
const HERO_TITLE = getProductById(HERO_ID)!.title;

const searchBox = (page: Page) => page.getByRole("combobox", { name: "Search Amazon Rebuild" });
const suggestionList = (page: Page) => page.getByRole("listbox", { name: "Search suggestions" });
const suggestions = (page: Page) => suggestionList(page).getByRole("option");
const rows = (page: Page) => page.locator('[data-shell="result-row"]');
const summary = (page: Page) => page.locator("#results-heading + p");
const sortSelect = (page: Page) => page.getByLabel("Sort by:");
const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

function trackErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  return problems;
}

async function productIds(page: Page): Promise<string[]> {
  return rows(page).evaluateAll((elements) => elements.map((element) => element.getAttribute("data-product-id") ?? ""));
}

const productOf = (id: string) => {
  const product = getProductById(id);
  if (!product) throw new Error(`result row for unknown product ${id}`);
  return product;
};

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

test.describe("suggestions", () => {
  test("appear while typing, are local, capped at 8, and follow combobox semantics", async ({ page }) => {
    const fetches: string[] = [];
    page.on("request", (request) => {
      if (["fetch", "xhr"].includes(request.resourceType())) fetches.push(request.url());
    });
    await page.goto("/");
    const input = searchBox(page);
    await expect(input).toHaveAttribute("aria-expanded", "false");

    await input.fill("h");
    await expect(suggestionList(page)).toBeHidden();
    await input.fill("he");
    await expect(suggestionList(page)).toBeVisible();
    await expect(input).toHaveAttribute("aria-expanded", "true");
    const count = await suggestions(page).count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(8);
    await expect(suggestions(page).filter({ hasText: /^headphones$/ })).toHaveCount(1);
    // The completion (what is not typed yet) is bold.
    await expect(suggestions(page).first().locator("strong")).toBeVisible();

    // Next prefetches visible links (?_rsc=); anything else would be a suggestion request.
    expect(fetches.filter((url) => !url.includes("_rsc=")), "no network request is made for suggestions").toEqual([]);
  });

  test("Up and Down move the active option, Escape closes, and unknown input shows nothing", async ({ page }) => {
    await page.goto("/");
    const input = searchBox(page);
    await input.fill("head");
    const options = suggestions(page);
    await expect(options.first()).toBeVisible();

    await input.press("ArrowDown");
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
    const firstId = await options.nth(0).getAttribute("id");
    await expect(input).toHaveAttribute("aria-activedescendant", firstId!);
    await input.press("ArrowDown");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "false");
    await input.press("ArrowUp");
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
    await input.press("ArrowUp"); // wraps to the last option
    await expect(options.last()).toHaveAttribute("aria-selected", "true");

    await input.press("Escape");
    await expect(suggestionList(page)).toBeHidden();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveValue("head");
    await input.press("ArrowDown"); // reopens
    await expect(suggestionList(page)).toBeVisible();

    await input.fill("zzzz");
    await expect(suggestionList(page)).toBeHidden();
  });

  test("Enter searches the highlighted suggestion; without one it searches what was typed", async ({ page }) => {
    await page.goto("/");
    const input = searchBox(page);
    await input.fill("wire");
    await input.press("ArrowDown");
    const chosen = ((await suggestions(page).nth(0).innerText()) ?? "").trim();
    await input.press("Enter");
    await expect(page).toHaveURL(/\/s\?k=/);
    await expect(input).toHaveValue(chosen);
    await expect(page.getByRole("heading", { level: 1, name: "Results" })).toBeVisible();

    await input.fill("keyboard");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/s\?k=keyboard$/);
    await expect(rows(page).first()).toContainText("Keystone K84");
  });

  test("clicking a suggestion submits it", async ({ page }) => {
    await page.goto("/");
    await searchBox(page).fill("wire");
    await suggestions(page).filter({ hasText: "wireless earbuds" }).click();
    await expect(page).toHaveURL(/\/s\?k=wireless\+earbuds$/);
    await expect(rows(page).first()).toContainText("Earbuds");
  });

  test("clicking outside closes the list", async ({ page }) => {
    await page.goto("/");
    await searchBox(page).fill("he");
    await expect(suggestionList(page)).toBeVisible();
    // The open list covers the top of the page, so click well away from it.
    await page.getByRole("contentinfo").click({ position: { x: 2, y: 2 } });
    await expect(suggestionList(page)).toBeHidden();
  });

  test("typing is not overwritten by the URL-sync (regression)", async ({ page }) => {
    await page.goto("/s?k=headphones");
    const input = searchBox(page);
    await expect(input).toHaveValue("headphones");
    await input.fill("wire");
    await page.waitForTimeout(400);
    await expect(input).toHaveValue("wire");
    await expect(suggestionList(page)).toBeVisible();
  });

  test("the department picker scopes the search", async ({ page, isMobile }) => {
    test.skip(isMobile, "the department picker is hidden on mobile");
    await page.goto("/");
    await page.getByRole("combobox", { name: "Search in" }).selectOption("electronics");
    await searchBox(page).fill("wireless");
    await searchBox(page).press("Enter");
    await expect(page).toHaveURL(/\/s\?k=wireless&dept=electronics$/);
    for (const id of await productIds(page)) expect(productOf(id).department).toBe("electronics");
    await expect(summary(page)).toContainText("in Electronics");
  });
});

test.describe("results", () => {
  test("a search opens ranked results in the observed list layout", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/");
    await searchBox(page).fill("headphones");
    await searchBox(page).press("Enter");
    await expect(page).toHaveURL(/\/s\?k=headphones$/);
    await expect(page).toHaveTitle('Results for "headphones" | Amazon Rebuild');
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results");
    await expect(summary(page)).toHaveText('1-3 of 3 results for "headphones"');
    expect(await productIds(page)).toEqual([HERO_ID, "B0HALO0KID", "B0HALO0PUL"]);

    const first = rows(page).first();
    await expect(first.getByRole("link", { name: HERO_TITLE, exact: true })).toBeVisible();
    await expect(first.getByRole("img", { name: "4.6 out of 5 stars" })).toBeVisible();
    await expect(first).toContainText("$79.99");
    await expect(first).toContainText("List: $129.99");
    await expect(first).toContainText(/FREE delivery \w+day, \w+ \d+/);
    await expect(first.getByRole("link", { name: /See options/ })).toBeVisible();
    await expect(first.locator("img").first()).toHaveAttribute("alt", /Halo Aura headphones/);

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
  });

  test("an unavailable product shows its state and no purchase action", async ({ page }) => {
    await page.goto("/s?k=bolt+speaker");
    const row = rows(page).filter({ hasText: "Voxel Bolt" });
    await expect(row).toContainText("Currently unavailable.");
    await expect(row.getByRole("button")).toHaveCount(0);
    await expect(row.getByRole("link", { name: /See options/ })).toHaveCount(0);
  });

  test("clicking a result opens the correct product page", async ({ page }) => {
    await page.goto("/s?k=headphones");
    // exact: the row also has a "See options: <title>" link whose name contains the title.
    await rows(page).first().getByRole("link", { name: HERO_TITLE, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dp/${HERO_ID}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(HERO_TITLE);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\?k=headphones$/);
    await expect(rows(page)).toHaveCount(3);

    await rows(page).nth(1).getByRole("link", { name: /See options/ }).click();
    await expect(page).toHaveURL(/\/dp\/B0HALO0KID$/);
  });

  test("an unknown query shows an intentional no-results state with a way forward", async ({ page }) => {
    const response = await page.goto("/s?k=zzzz");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText('No results for "zzzz"');
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "headphones", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Shop by department" }).getByRole("link")).toHaveCount(6);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.getByRole("link", { name: "headphones", exact: true }).click();
    await expect(page).toHaveURL(/\/s\?k=headphones$/);
    await expect(rows(page)).toHaveCount(3);
  });

  test("an empty search page gives guidance, not an error", async ({ page }) => {
    const response = await page.goto("/s");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What are you looking for?");
    expect(await page.getByRole("region", { name: "Popular searches" }).getByRole("link").count()).toBeGreaterThanOrEqual(10);
    await expect(page.getByRole("region", { name: "Popular right now" }).getByRole("link").first()).toBeVisible();
  });

  test("malformed parameters never crash the page", async ({ page }) => {
    for (const path of [
      "/s?k=%00%01&sort=bogus&page=-3&rating=9&min=abc",
      "/s?page=1.5&min=1e3&max=%20&brand=&dept=nope",
      "/s?k=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
      `/s?k=${"x".repeat(2000)}`,
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
    }
    await page.goto("/s?k=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText('No results for "<script>alert(1)</script>"');
    await expect(page.locator("h1 script")).toHaveCount(0);
  });
});

test.describe("sorting", () => {
  test("each sort reorders correctly, is reflected in the URL and keeps the query", async ({ page }) => {
    await page.goto("/s?rating=4");
    await expect(sortSelect(page)).toHaveValue("featured");
    expect((await productIds(page))[0]).toBe(HERO_ID);

    await sortSelect(page).selectOption("price-asc");
    await expect(page).toHaveURL(/rating=4&sort=price-asc$/);
    let prices = (await productIds(page)).map((id) => displayPriceCents(productOf(id)));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    await sortSelect(page).selectOption("price-desc");
    await expect(page).toHaveURL(/sort=price-desc$/);
    prices = (await productIds(page)).map((id) => displayPriceCents(productOf(id)));
    expect(prices).toEqual([...prices].sort((a, b) => b - a));

    await sortSelect(page).selectOption("rating");
    await expect(page).toHaveURL(/sort=rating$/);
    const ratings = (await productIds(page)).map((id) => productOf(id).rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));

    await sortSelect(page).selectOption("featured");
    await expect(page).toHaveURL(/\/s\?rating=4$/);
  });

  test("offers exactly the four approved sorts", async ({ page }) => {
    await page.goto("/s?k=audio");
    await expect(sortSelect(page).locator("option")).toHaveText(["Featured", "Price: Low to High", "Price: High to Low", "Avg. Customer Review"]);
  });
});

test.describe("filters (desktop sidebar)", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop sidebar"));

  test("brand filters results, supports multi-select, and keeps the other brands available", async ({ page }) => {
    await page.goto("/s?dept=electronics");
    await expect(rows(page)).toHaveCount(8);
    await page.getByRole("checkbox", { name: /^Halo Audio/ }).check();
    await expect(page).toHaveURL(/dept=electronics&brand=Halo\+Audio$/);
    await expect(rows(page)).toHaveCount(3);
    for (const id of await productIds(page)) expect(productOf(id).brand).toBe("Halo Audio");
    await expect(page.getByRole("checkbox", { name: /^Voxel/ })).toBeVisible();

    await page.getByRole("checkbox", { name: /^Voxel/ }).check();
    await expect(page).toHaveURL(/brand=Halo\+Audio&brand=Voxel$/);
    const brands = new Set((await productIds(page)).map((id) => productOf(id).brand));
    expect(brands).toEqual(new Set(["Halo Audio", "Voxel"]));

    await page.getByRole("checkbox", { name: /^Halo Audio/ }).uncheck();
    await expect(page).toHaveURL(/brand=Voxel$/);
    await expect(rows(page)).toHaveCount(3);
  });

  test("4 Stars & Up really removes lower-rated products", async ({ page }) => {
    await page.goto("/s?dept=computers");
    const before = await productIds(page);
    expect(before.some((id) => productOf(id).rating < 4)).toBe(true);
    await page.getByRole("checkbox", { name: /4 Stars & Up/ }).check();
    await expect(page).toHaveURL(/rating=4$/);
    const after = await productIds(page);
    expect(after.length).toBeLessThan(before.length);
    for (const id of after) expect(productOf(id).rating).toBeGreaterThanOrEqual(4);
  });

  test("price ranges and the custom range filter by the displayed price", async ({ page }) => {
    await page.goto("/s?dept=electronics");
    await page.getByRole("link", { name: /^Under \$25/ }).click();
    await expect(page).toHaveURL(/max=24$/);
    for (const id of await productIds(page)) expect(displayPriceCents(productOf(id))).toBeLessThan(2500);
    await expect(page.getByRole("link", { name: /^Under \$25/ })).toHaveAttribute("aria-current", "true");

    await page.getByRole("link", { name: "Clear price" }).click();
    await expect(page).toHaveURL(/dept=electronics$/);

    const sidebar = page.getByRole("complementary", { name: "Refine results" });
    await sidebar.getByLabel("Min $").fill("30");
    await sidebar.getByLabel("Max $").fill("60");
    await sidebar.getByRole("button", { name: "Go" }).click();
    await expect(page).toHaveURL(/min=30&max=60$/);
    const cents = (await productIds(page)).map((id) => displayPriceCents(productOf(id)));
    expect(cents.length).toBeGreaterThan(0);
    for (const value of cents) {
      expect(value).toBeGreaterThanOrEqual(3000);
      expect(value).toBeLessThan(6100);
    }
    await expect(page.getByRole("navigation", { name: "Active filters" })).toContainText("Price: $30 to $60.99");
  });

  test("an invalid custom price shows an error and does not navigate", async ({ page }) => {
    await page.goto("/s?dept=electronics");
    const sidebar = page.getByRole("complementary", { name: "Refine results" });
    await sidebar.getByLabel("Min $").fill("abc");
    await sidebar.getByRole("button", { name: "Go" }).click();
    await expect(sidebar.getByText("Enter whole dollar amounts.")).toBeVisible();
    await expect(page).toHaveURL(/\/s\?dept=electronics$/);
  });

  test("filters combine, appear as removable chips, and Clear filters resets them", async ({ page }) => {
    await page.goto("/s?dept=electronics");
    await page.getByRole("checkbox", { name: /^Halo Audio/ }).check();
    await page.getByRole("checkbox", { name: /4 Stars & Up/ }).check();
    await expect(page).toHaveURL(/brand=Halo\+Audio&rating=4$/);
    const chips = page.getByRole("navigation", { name: "Active filters" });
    await expect(chips.getByRole("link", { name: "Remove filter: Brand: Halo Audio" })).toBeVisible();
    await expect(chips.getByRole("link", { name: "Remove filter: 4 Stars & Up" })).toBeVisible();

    await chips.getByRole("link", { name: "Remove filter: 4 Stars & Up" }).click();
    await expect(page).toHaveURL(/brand=Halo\+Audio$/);
    await page.getByRole("checkbox", { name: /4 Stars & Up/ }).check();
    await chips.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/s\?dept=electronics$/);
    await expect(rows(page)).toHaveCount(8);
  });

  test("a combination with no matches gives an intentional empty state and a way out", async ({ page }) => {
    await page.goto("/s?dept=electronics");
    await page.getByRole("checkbox", { name: /^Voxel/ }).check();
    await page.getByRole("link", { name: /^\$200 & Above/ }).click();
    await expect(page).toHaveURL(/brand=Voxel&min=200$/);
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "No results match your filters" })).toBeVisible();
    await expect(page.getByText(/has 8 results before the filters/)).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).last().click();
    await expect(page).toHaveURL(/\/s\?dept=electronics$/);
    await expect(rows(page)).toHaveCount(8);
  });

  test("filter controls are keyboard operable", async ({ page }) => {
    await page.goto("/s?dept=electronics");
    const checkbox = page.getByRole("checkbox", { name: /^Halo Audio/ });
    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/brand=Halo\+Audio$/);
  });
});

test.describe("page title on client navigation (regression)", () => {
  test("follows each search and never shows a prefetched page's title", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // let the footer department links prefetch
    await searchBox(page).fill("headphones");
    await searchBox(page).press("Enter");
    await expect(page).toHaveURL(/\/s\?k=headphones$/);
    await expect(page).toHaveTitle('Results for "headphones" | Amazon Rebuild');
    await searchBox(page).fill("laptop");
    await searchBox(page).press("Enter");
    await expect(page).toHaveTitle('Results for "laptop" | Amazon Rebuild');
    await page.goto("/s?dept=books");
    await expect(page).toHaveTitle("Books | Amazon Rebuild");
    await page.goBack();
    await expect(page).toHaveTitle('Results for "laptop" | Amazon Rebuild');
  });

  test("a product page reached by client navigation has its own title", async ({ page }) => {
    await page.goto("/s?k=headphones");
    await rows(page).first().getByRole("link", { name: HERO_TITLE, exact: true }).click();
    await expect(page).toHaveTitle(`${HERO_TITLE} | Amazon Rebuild`);
    await page.getByRole("region", { name: "Products related to this item" }).getByRole("link").first().click();
    await expect(page).not.toHaveTitle(`${HERO_TITLE} | Amazon Rebuild`);
  });
});

test.describe("URL state", () => {
  test("a direct URL restores query, sort, filters and page; refresh keeps them", async ({ page, isMobile }) => {
    await page.goto("/s?k=audio&brand=Voxel&rating=4&min=20&max=150&sort=price-asc");
    await expect(searchBox(page)).toHaveValue("audio");
    await expect(sortSelect(page)).toHaveValue("price-asc");
    const chips = page.getByRole("navigation", { name: "Active filters" });
    await expect(chips).toContainText("Brand: Voxel");
    await expect(chips).toContainText("4 Stars & Up");
    await expect(chips).toContainText("Price: $20 to $150.99");
    if (!isMobile) {
      await expect(page.getByRole("checkbox", { name: /^Voxel/ })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: /4 Stars & Up/ })).toBeChecked();
    }
    const before = await productIds(page);
    expect(before.length).toBeGreaterThan(0);
    await page.reload();
    expect(await productIds(page)).toEqual(before);
    await expect(sortSelect(page)).toHaveValue("price-asc");
  });

  test("browser Back and Forward restore earlier states", async ({ page }) => {
    await page.goto("/s?k=headphones");
    await sortSelect(page).selectOption("rating");
    await expect(page).toHaveURL(/sort=rating$/);
    await page.goto("/s?k=headphones&sort=rating&rating=4");
    await expect(page.getByRole("navigation", { name: "Active filters" })).toContainText("4 Stars & Up");

    await page.goBack();
    await expect(page).toHaveURL(/\/s\?k=headphones&sort=rating$/);
    await expect(sortSelect(page)).toHaveValue("rating");
    await expect(page.getByRole("navigation", { name: "Active filters" })).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\?k=headphones$/);
    await expect(sortSelect(page)).toHaveValue("featured");
    await page.goForward();
    await expect(page).toHaveURL(/sort=rating$/);
    await expect(sortSelect(page)).toHaveValue("rating");
  });

  test("the search field follows the URL on Back and Forward", async ({ page }) => {
    await page.goto("/s?k=headphones");
    await searchBox(page).fill("laptop");
    await searchBox(page).press("Enter");
    await expect(page).toHaveURL(/\/s\?k=laptop$/);
    await expect(searchBox(page)).toHaveValue("laptop");
    await page.goBack();
    await expect(searchBox(page)).toHaveValue("headphones");
    await page.goForward();
    await expect(searchBox(page)).toHaveValue("laptop");
  });
});

test.describe("pagination", () => {
  test("16 per page, numbered links, previous and next, and filters preserved", async ({ page }) => {
    await page.goto("/s?rating=4&sort=price-asc");
    await expect(summary(page)).toHaveText("1-16 of 25 results");
    await expect(rows(page)).toHaveCount(16);
    const nav = page.getByRole("navigation", { name: "Pagination" });
    await expect(nav.getByText("Previous")).toHaveAttribute("aria-disabled", "true");
    await expect(nav.locator('[aria-current="page"]')).toHaveText("1");
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute("aria-label", "Page 1, current page");
    const firstPage = await productIds(page);

    await nav.getByRole("link", { name: "Go to page 2" }).click();
    await expect(page).toHaveURL(/rating=4&sort=price-asc&page=2$/);
    await expect(summary(page)).toHaveText("17-25 of 25 results");
    await expect(rows(page)).toHaveCount(9);
    expect((await productIds(page)).some((id) => firstPage.includes(id))).toBe(false);
    await expect(nav.getByText("Next")).toHaveAttribute("aria-disabled", "true");
    const cents = [...firstPage, ...(await productIds(page))].map((id) => displayPriceCents(productOf(id)));
    expect(cents).toEqual([...cents].sort((a, b) => a - b));

    await nav.getByRole("link", { name: "Previous" }).click();
    await expect(page).toHaveURL(/rating=4&sort=price-asc$/);
    await expect(rows(page)).toHaveCount(16);
    await nav.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2$/);
  });

  test("changing sort or filters returns to page 1", async ({ page }) => {
    await page.goto("/s?rating=4&page=2");
    await sortSelect(page).selectOption("price-desc");
    await expect(page).toHaveURL(/rating=4&sort=price-desc$/);
  });

  test("an out-of-range page resolves to the last page; invalid pages resolve to the first", async ({ page }) => {
    await page.goto("/s?rating=4&page=99");
    await expect(page).toHaveURL(/rating=4&page=2$/);
    await expect(rows(page)).toHaveCount(9);
    for (const bad of ["0", "-3", "abc", "1.5"]) {
      const response = await page.goto(`/s?rating=4&page=${bad}`);
      expect(response?.status(), bad).toBe(200);
      await expect(summary(page), bad).toHaveText("1-16 of 25 results");
    }
  });

  test("results with one page have no pagination", async ({ page }) => {
    await page.goto("/s?k=headphones");
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
  });
});

test.describe("category browsing", () => {
  test("a department opens the same results experience", async ({ page }) => {
    await page.goto("/s?dept=books");
    await expect(page).toHaveTitle(/Books/);
    await expect(summary(page)).toHaveText("1-4 of 4 results in Books");
    for (const id of await productIds(page)) expect(productOf(id).department).toBe("books");
  });

  test("menu, footer and breadcrumb department links now lead to real results", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.getByRole("button", { name: isMobile ? "Open menu" : "All", exact: true }).click();
    await page.getByRole("dialog", { name: "Main menu" }).getByRole("link", { name: /Books/ }).click();
    await expect(page).toHaveURL(/\/s\?dept=books$/);
    await expect(rows(page)).toHaveCount(4);

    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Toys & Games" }).click();
    await expect(page).toHaveURL(/\/s\?dept=toys-games$/);

    await page.goto(`/dp/${HERO_ID}`);
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Electronics" }).click();
    await expect(page).toHaveURL(/\/s\?dept=electronics$/);
    await page.goto(`/dp/${HERO_ID}`);
    await page.getByRole("link", { name: "Visit the Halo Audio Store" }).click();
    await expect(page).toHaveURL(/\/s\?k=Halo\+Audio$/);
    await expect(rows(page).first()).toContainText("Halo Audio");
  });
});

test.describe("J2 discovery journey", () => {
  test("search, suggestions, results, sort, filter, product", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/");
    await searchBox(page).fill("head");
    await suggestions(page).filter({ hasText: /^headphones$/ }).click();
    await expect(page).toHaveURL(/\/s\?k=headphones$/);
    await expect(rows(page)).toHaveCount(3);

    await sortSelect(page).selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc$/); // the select updates at once; the rows follow the navigation
    const asc = (await productIds(page)).map((id) => displayPriceCents(productOf(id)));
    expect(asc).toEqual([...asc].sort((a, b) => a - b));

    // Filter via the sidebar on desktop or the drawer on mobile.
    if (page.viewportSize()!.width < 1024) {
      await page.getByRole("button", { name: /^Filters/ }).click();
      await page.getByRole("dialog", { name: "Filters" }).getByRole("checkbox", { name: /4 Stars & Up/ }).check();
      await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: /^Show \d+ results?$/ }).click();
    } else {
      await page.getByRole("checkbox", { name: /4 Stars & Up/ }).check();
    }
    await expect(page).toHaveURL(/rating=4&sort=price-asc$/);
    for (const id of await productIds(page)) expect(productOf(id).rating).toBeGreaterThanOrEqual(4);

    await rows(page).first().getByRole("link", { name: productOf("B0HALO0KID").title, exact: true }).click();
    await expect(page).toHaveURL(/\/dp\/B0HALO0KID$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Buddy Kids");
    expect(problems).toEqual([]);
  });
});

test.describe("mobile search and filters", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile project only"));

  test("search works at 375px with touch-sized suggestions and no overflow", async ({ page }) => {
    await page.goto("/");
    await searchBox(page).fill("head");
    await expect(suggestions(page).first()).toBeVisible();
    for (const option of await suggestions(page).all()) expect((await box(option)).height).toBeGreaterThanOrEqual(44);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await suggestions(page).first().tap();
    await expect(page).toHaveURL(/\/s\?k=/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("the sidebar is replaced by a filter drawer that opens, applies, and closes accessibly", async ({ page }) => {
    await page.goto("/s?dept=electronics");
    await expect(page.getByRole("complementary", { name: "Refine results" })).toBeHidden();
    const open = page.getByRole("button", { name: /^Filters/ });
    expect((await box(open)).height).toBeGreaterThanOrEqual(44);
    await open.click();
    const drawer = page.getByRole("dialog", { name: "Filters" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Close filters" })).toBeVisible();

    await drawer.getByRole("checkbox", { name: /^Halo Audio/ }).check();
    await expect(page).toHaveURL(/brand=Halo\+Audio$/);
    await expect(drawer).toBeVisible(); // stays open while filtering
    await expect(drawer.getByRole("button", { name: "Show 3 results" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();
    await expect(open).toContainText("1");
    await expect(rows(page)).toHaveCount(3);

    await open.click();
    await drawer.getByRole("button", { name: "Show 3 results" }).click();
    await expect(drawer).toBeHidden();
    await open.click();
    await drawer.getByRole("button", { name: "Close filters" }).click();
    await expect(drawer).toBeHidden();
  });

  test("result rows are compact with a full-width primary action", async ({ page }) => {
    await page.goto("/s?k=chef+knife");
    const row = rows(page).first();
    const image = await box(row.locator("a[aria-hidden='true']"));
    expect(image.width).toBeLessThan(140);
    const button = await box(row.getByRole("button", { name: /Add to cart/ }));
    expect(button.width).toBeGreaterThanOrEqual(300);
    expect(button.height).toBeGreaterThanOrEqual(44);
  });

  test("every results state fits 375px", async ({ page }) => {
    for (const path of ["/s", "/s?k=headphones", "/s?rating=4", "/s?rating=4&page=2", "/s?k=zzzz", "/s?k=headphones&brand=Voxel", "/s?dept=electronics&brand=Voxel&min=200"]) {
      await page.goto(path);
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("desktop responsive layout", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop project only"));

  test("shows the sidebar from 1024px and the filter drawer below it, without overflow", async ({ page }) => {
    for (const { width, sidebar } of [
      { width: 1440, sidebar: true },
      { width: 1024, sidebar: true },
      { width: 768, sidebar: false },
      { width: 375, sidebar: false },
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/s?rating=4");
      const at = `at ${width}px`;
      expect(await horizontalOverflow(page), `overflow ${at}`).toBeLessThanOrEqual(0);
      await expect(page.getByRole("complementary", { name: "Refine results" }), at).toBeVisible({ visible: sidebar });
      await expect(page.getByRole("button", { name: /^Filters/ }), at).toBeVisible({ visible: !sidebar });
      const row = rows(page).first();
      const image = await box(row.locator("a[aria-hidden='true']"));
      const title = await box(row.getByRole("heading", { level: 2 }));
      expect(image.x + image.width, `image left of text ${at}`).toBeLessThanOrEqual(title.x + 1);
    }
  });
});

test.describe("accessibility (axe)", () => {
  for (const [name, path] of [
    ["results", "/s?k=headphones"],
    ["results with active filters", "/s?dept=electronics&brand=Halo+Audio&rating=4&sort=price-asc"],
    ["second page", "/s?rating=4&page=2"],
    ["no results", "/s?k=zzzz"],
    ["filters with no matches", "/s?dept=electronics&brand=Voxel&min=200"],
    ["empty search", "/s"],
  ] as const) {
    test(`${name} has no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("open suggestions have no critical or serious violations", async ({ page }) => {
    await page.goto("/s?k=headphones");
    await searchBox(page).fill("he");
    await expect(suggestionList(page)).toBeVisible();
    await searchBox(page).press("ArrowDown");
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("the open filter drawer has no critical or serious violations", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile drawer");
    await page.goto("/s?dept=electronics&brand=Halo+Audio");
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("headings are ordered and the results list is labelled", async ({ page }) => {
    await page.goto("/s?k=headphones");
    const headings = await page.getByRole("heading").evaluateAll((elements) => elements.map((element) => element.tagName));
    expect(headings.filter((tag) => tag === "H1")).toHaveLength(1);
    expect(headings[0]).toBe("H1");
    await expect(page.getByRole("list", { name: "Search results" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Add to cart|Add to cart:/ }).first()).toBeVisible();
  });
});
