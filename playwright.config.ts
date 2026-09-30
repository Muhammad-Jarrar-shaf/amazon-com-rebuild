import { defineConfig, devices } from "@playwright/test";

// Local runs build and serve the production bundle. Set E2E_BASE_URL to run the same tests
// against a deployed site instead (production smoke).
const externalBaseUrl = process.env.E2E_BASE_URL;
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        // Fresh build by default: silently reusing a stale server would test old code. Opt in with E2E_REUSE_SERVER=1.
        reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
        timeout: 240_000,
      },
});
