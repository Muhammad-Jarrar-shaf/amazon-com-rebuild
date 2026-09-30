import { expect, test } from "@playwright/test";

test("home renders with landmarks, no console errors and no horizontal overflow", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });

  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);

  await expect(page).toHaveTitle(/Amazon Rebuild/);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(problems).toEqual([]);
});

// Regression (S5): J1 intermittently logged "Failed to load resource: 404" with no page response event. Cause: on the
// Review -> Confirmation client navigation Next briefly leaves the document without any <link rel="icon">, and a
// same-document navigation in that window makes Chromium fall back to the default /favicon.ico, which did not exist.
// The app now serves /favicon.ico (app/favicon.ico). This replays the window deterministically.
test("the default /favicon.ico exists, so a navigation with no icon link logs no 404", async ({ page, request }) => {
  const favicon = await request.get("/favicon.ico");
  expect.soft(favicon.status()).toBe(200);
  expect.soft(favicon.headers()["content-type"]).toMatch(/^image\//);

  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()} (${message.location().url})`);
  });
  await page.goto("/");
  for (const gap of [5, 10, 20]) {
    await page.evaluate(
      (ms) =>
        new Promise<void>((done) => {
          const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];
          links.forEach((link) => link.remove());
          history.pushState(null, "", `/?icon-gap=${ms}`);
          setTimeout(() => {
            links.forEach((link) => document.head.appendChild(link));
            done();
          }, ms);
        }),
      gap,
    );
    await page.waitForTimeout(500);
  }
  expect(problems).toEqual([]);
});
