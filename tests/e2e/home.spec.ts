import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { getProductById } from "@/lib/catalog";
import { getCategoryCards, getHeroSlides, getHomeRailProducts } from "@/lib/home/server";

// Full home (S6): hero carousel (FR-HOME-1), category cards (FR-HOME-2), product rail (FR-HOME-3), the J2 entry from a
// category tile, layout at 1440/1024/768/375 and axe. Runs in both projects: desktop 1440 and mobile 375.

const SLIDES = getHeroSlides();
const CARDS = getCategoryCards();
const RAIL = getHomeRailProducts();

const hero = (page: Page) => page.getByRole("region", { name: "Featured" });
const slides = (page: Page) => hero(page).locator('[aria-roledescription="slide"]');
const nextButton = (page: Page) => page.getByRole("button", { name: "Next slide" });
const prevButton = (page: Page) => page.getByRole("button", { name: "Previous slide" });
const announcement = (page: Page) => hero(page).locator('[aria-live="polite"]');
const track = (page: Page) => page.locator('[data-home="hero-track"]');
const cards = (page: Page) => page.locator('[data-home="card"]');
const rail = (page: Page) => page.getByRole("region", { name: "Popular products" });
const rows = (page: Page) => page.locator('[data-shell="result-row"]');
const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

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

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  expect(found, "element has a bounding box").not.toBeNull();
  return found!;
}

/** Index of the slide whose left edge is nearest the track's visible left edge. */
async function visibleSlide(page: Page): Promise<number> {
  return track(page).evaluate((element) => {
    const left = element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingLeft);
    const edges = [...element.querySelectorAll("[data-slide]")].map((slide) => Math.abs(slide.getBoundingClientRect().left - left));
    return edges.indexOf(Math.min(...edges));
  });
}

test.describe("page structure", () => {
  test("renders the hero, at least 8 cards of 4 tiles and a product rail, with one h1 and no console errors", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Amazon Rebuild");
    await expect(page).toHaveTitle(/Amazon Rebuild/);

    await expect(hero(page)).toHaveAttribute("aria-roledescription", "carousel");
    await expect(slides(page)).toHaveCount(SLIDES.length);
    expect(SLIDES.length).toBeGreaterThanOrEqual(3);
    expect(SLIDES.length).toBeLessThanOrEqual(4);
    for (const [index, slide] of SLIDES.entries()) {
      const element = slides(page).nth(index);
      await expect(element).toHaveAttribute("aria-label", `${index + 1} of ${SLIDES.length}`);
      await expect(element.getByRole("link")).toHaveAttribute("href", slide.href);
      await expect(element).toContainText(slide.headline);
    }

    const list = page.getByRole("list", { name: "Shop by category" });
    await expect(list).toBeVisible();
    await expect(cards(page)).toHaveCount(CARDS.length);
    expect(CARDS.length).toBeGreaterThanOrEqual(8);
    for (const [index, card] of CARDS.entries()) {
      const element = cards(page).nth(index);
      await expect(element.getByRole("heading", { level: 2 })).toHaveText(card.headline);
      const tiles = element.locator('[data-home="tile"]');
      await expect(tiles).toHaveCount(4);
      for (const [tileIndex, tile] of card.tiles.entries()) {
        await expect(tiles.nth(tileIndex)).toHaveAttribute("href", tile.href);
        await expect(tiles.nth(tileIndex)).toHaveText(tile.label);
      }
    }

    await expect(rail(page).getByRole("heading", { level: 2 })).toHaveText("Popular products");
    const railLinks = rail(page).getByRole("link");
    await expect(railLinks).toHaveCount(RAIL.length);
    for (const [index, product] of RAIL.entries()) await expect(railLinks.nth(index)).toHaveAttribute("href", `/dp/${product.id}`);

    // No image on the page is broken: every photo is a local file that serves an image (off-screen slides and rail
    // cards load lazily, so request them rather than waiting for the browser); the rest are generated illustrations.
    const sources = await page.locator("main img").evaluateAll((images) => [...new Set(images.map((image) => image.getAttribute("src") ?? ""))]);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      const url = new URL(source, page.url());
      expect(url.origin, source).toBe(new URL(page.url()).origin);
      expect(url.pathname, source).toMatch(/^\/assets\/products\/[a-z0-9-]+\.webp$/);
      const response = await page.request.get(source);
      expect(response.status(), source).toBe(200);
      expect(response.headers()["content-type"], source).toMatch(/^image\//);
    }
    expect(problems).toEqual([]);
  });

  test("links to results are never prefetched (prefetched head data was reused across search URLs)", async ({ page }) => {
    const searchRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/s") searchRequests.push(request.url());
    });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.mouse.move(10, 10);
    await page.waitForLoadState("networkidle");
    expect(searchRequests).toEqual([]);
  });
});

test.describe("hero carousel", () => {
  test("Next and Previous work from the keyboard, wrap around, and announce the slide", async ({ page }) => {
    await page.goto("/");
    await expect(announcement(page)).toHaveText("");
    expect(await visibleSlide(page)).toBe(0);

    await nextButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(announcement(page)).toHaveText(`Slide 2 of ${SLIDES.length}: ${SLIDES[1]!.headline}`);
    await expect.poll(() => visibleSlide(page)).toBe(1);

    await page.keyboard.press("Space");
    await expect(announcement(page)).toHaveText(`Slide 3 of ${SLIDES.length}: ${SLIDES[2]!.headline}`);
    await expect.poll(() => visibleSlide(page)).toBe(2);

    // Wrap: past the last slide back to the first, and before the first to the last.
    for (let index = 3; index <= SLIDES.length; index++) await page.keyboard.press("Enter");
    await expect(announcement(page)).toHaveText(`Slide 1 of ${SLIDES.length}: ${SLIDES[0]!.headline}`);
    await expect.poll(() => visibleSlide(page)).toBe(0);

    await prevButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(announcement(page)).toHaveText(`Slide ${SLIDES.length} of ${SLIDES.length}: ${SLIDES.at(-1)!.headline}`);
    await expect.poll(() => visibleSlide(page)).toBe(SLIDES.length - 1);
    await expect(prevButton(page)).toBeFocused();
  });

  test("never advances on its own (no autoplay)", async ({ page }) => {
    await page.goto("/");
    const start = await track(page).evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(3000);
    expect(await track(page).evaluate((element) => element.scrollLeft)).toBe(start);
    await expect(announcement(page)).toHaveText("");
  });

  test("two quick presses advance two slides", async ({ page }) => {
    await page.goto("/");
    await nextButton(page).click();
    await nextButton(page).click();
    await expect(announcement(page)).toHaveText(`Slide 3 of ${SLIDES.length}: ${SLIDES[2]!.headline}`);
    await expect.poll(() => visibleSlide(page)).toBe(2);
  });

  test("a scrolled (swiped) track and the buttons agree on the current slide", async ({ page }) => {
    await page.goto("/");
    await track(page).evaluate((element) => {
      const all = element.querySelectorAll<HTMLElement>("[data-slide]");
      element.scrollTo({ left: all[2]!.offsetLeft - all[0]!.offsetLeft, behavior: "instant" });
    });
    await expect.poll(() => visibleSlide(page)).toBe(2);
    await nextButton(page).click();
    await expect(announcement(page)).toHaveText(`Slide 4 of ${SLIDES.length}: ${SLIDES[3]!.headline}`);
  });

  test("a slide link opens a non-empty results page", async ({ page }) => {
    await page.goto("/");
    await nextButton(page).click();
    await expect.poll(() => visibleSlide(page)).toBe(1);
    await slides(page).nth(1).getByRole("link").click();
    await expect(page).toHaveURL(SLIDES[1]!.href);
    await expect(rows(page).first()).toBeVisible();
  });
});

test.describe("category cards and rail", () => {
  test("a category tile opens scoped results that include the pictured product", async ({ page }) => {
    await page.goto("/");
    const tile = CARDS[0]!.tiles[0]!;
    await cards(page).first().getByRole("link", { name: tile.label, exact: true }).click();
    await expect(page).toHaveURL(tile.href);
    await expect(page.getByRole("heading", { level: 1, name: "Results" })).toBeVisible();
    await expect(rows(page).first()).toBeVisible();
    await expect(page.locator('[data-shell="result-row"][data-product-id="B0HALO0AUR"]')).toBeVisible();
  });

  test("every tile, See more link and slide leads to a results page with results", async ({ page }) => {
    const hrefs = new Set<string>([...SLIDES.map((slide) => slide.href), ...CARDS.flatMap((card) => [...card.tiles.map((tile) => tile.href), ...(card.more ? [card.more.href] : [])])]);
    for (const href of hrefs) {
      await page.goto(href);
      await expect(rows(page).first(), href).toBeVisible();
    }
  });

  test("a rail item opens its product page", async ({ page }) => {
    await page.goto("/");
    const product = RAIL[0]!;
    await rail(page).getByRole("link").first().click();
    await expect(page).toHaveURL(`/dp/${product.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(getProductById(product.id)!.title);
  });

  test("J2 from home: category tile -> Brand + 4 stars -> reload restores the same state", async ({ page }) => {
    const problems = trackErrors(page);
    await page.goto("/");
    const tile = CARDS[0]!.tiles[0]!; // Headphones (Electronics)
    await cards(page).first().getByRole("link", { name: tile.label, exact: true }).click();
    await expect(page).toHaveURL(tile.href);

    if (page.viewportSize()!.width < 1024) {
      await page.getByRole("button", { name: /^Filters/ }).click();
      const drawer = page.getByRole("dialog", { name: "Filters" });
      await drawer.getByRole("checkbox", { name: /^Halo Audio/ }).check();
      await expect(page).toHaveURL(/brand=Halo\+Audio/);
      await drawer.getByRole("checkbox", { name: /4 Stars & Up/ }).check();
      await expect(page).toHaveURL(/rating=4/);
      await drawer.getByRole("button", { name: /^Show \d+ results?$/ }).click();
    } else {
      await page.getByRole("checkbox", { name: /^Halo Audio/ }).check();
      await expect(page).toHaveURL(/brand=Halo\+Audio/);
      await page.getByRole("checkbox", { name: /4 Stars & Up/ }).check();
    }
    const filtered = "/s?k=headphones&dept=electronics&brand=Halo+Audio&rating=4";
    await expect(page).toHaveURL(filtered);
    const check = async () => {
      const ids = await rows(page).evaluateAll((elements) => elements.map((element) => element.getAttribute("data-product-id") ?? ""));
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        const product = getProductById(id)!;
        expect(product.brand, id).toBe("Halo Audio");
        expect(product.rating, id).toBeGreaterThanOrEqual(4);
      }
      return ids;
    };
    await expect(rows(page).first()).toBeVisible();
    const before = await check();
    await page.reload();
    await expect(page).toHaveURL(filtered);
    await expect(rows(page).first()).toBeVisible();
    expect(await check()).toEqual(before);
    expect(problems).toEqual([]);
  });
});

test.describe("desktop layout", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop project only"));

  test("four cards per row from 1024 overlapping the hero, two at 768, one at 375, never overflowing", async ({ page }) => {
    const problems = trackErrors(page);
    const cases = [
      { width: 1440, perRow: 4, overlap: true },
      { width: 1024, perRow: 4, overlap: true },
      { width: 768, perRow: 2, overlap: false },
      { width: 375, perRow: 1, overlap: false },
    ];
    for (const { width, perRow, overlap } of cases) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const at = `at ${width}px`;
      expect(await horizontalOverflow(page), `overflow ${at}`).toBeLessThanOrEqual(0);

      const tops = await cards(page).evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
      expect(new Set(tops.slice(0, perRow)).size, `first row ${at}`).toBe(1);
      expect(tops[perRow], `row break ${at}`).toBeGreaterThan(tops[0]!);

      const heroBox = await box(hero(page));
      const firstCard = await box(cards(page).first());
      if (overlap) expect(firstCard.y, `cards overlap the hero ${at}`).toBeLessThan(heroBox.y + heroBox.height);
      else expect(firstCard.y, `cards below the hero ${at}`).toBeGreaterThanOrEqual(heroBox.y + heroBox.height);

      // The slide's photo and call to action stay above the overlapping cards, and the buttons stay clickable.
      const firstSlide = slides(page).first();
      for (const part of [firstSlide.locator("img"), firstSlide.getByText(SLIDES[0]!.cta)]) {
        const partBox = await box(part);
        expect(partBox.y + partBox.height, `slide content above the cards ${at}`).toBeLessThanOrEqual(firstCard.y + 1);
      }
      for (const button of [prevButton(page), nextButton(page)]) {
        const buttonBox = await box(button);
        expect(buttonBox.width, `button width ${at}`).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height, `button height ${at}`).toBeGreaterThanOrEqual(44);
        expect(buttonBox.y + buttonBox.height, `button above the cards ${at}`).toBeLessThanOrEqual(firstCard.y + 1);
      }
    }
    expect(problems).toEqual([]);
  });
});

test.describe("mobile layout", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile project only"));

  test("the next slide peeks, cards stack full width, controls are 44px, and nothing overflows", async ({ page }) => {
    await page.goto("/");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const viewport = page.viewportSize()!.width;

    const first = await box(slides(page).nth(0));
    const second = await box(slides(page).nth(1));
    expect(first.x).toBeGreaterThanOrEqual(0);
    expect(first.width).toBeLessThan(viewport);
    expect(second.x, "the next slide starts on screen").toBeLessThan(viewport);
    expect(second.x + second.width, "and is only partly visible").toBeGreaterThan(viewport);

    for (const button of [prevButton(page), nextButton(page)]) {
      const buttonBox = await box(button);
      expect(buttonBox.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    }
    const position = page.locator('[data-home="hero-position"]');
    await expect(position).toHaveText(`1 / ${SLIDES.length}`);
    await nextButton(page).tap();
    await expect(position).toHaveText(`2 / ${SLIDES.length}`);

    const cardBoxes = await cards(page).evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON() as DOMRect));
    for (const [index, card] of cardBoxes.entries()) {
      expect(card.width, `card ${index} width`).toBeGreaterThan(viewport - 40);
      if (index > 0) expect(card.top, `card ${index} stacks`).toBeGreaterThan(cardBoxes[index - 1]!.top);
    }
    const more = cards(page).first().getByRole("link", { name: CARDS[0]!.more!.label });
    expect((await box(more)).height).toBeGreaterThanOrEqual(44);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("accessibility (axe)", () => {
  test("home has no critical or serious violations", async ({ page }) => {
    await page.goto("/");
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("after moving the carousel there are still no critical or serious violations", async ({ page }) => {
    await page.goto("/");
    await nextButton(page).click();
    await nextButton(page).click();
    await expect(announcement(page)).toHaveText(new RegExp(`^Slide 3 of ${SLIDES.length}`));
    expect(await seriousViolations(page)).toEqual([]);
  });
});
