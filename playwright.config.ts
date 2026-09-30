import { defineConfig, devices } from "@playwright/test";

// Local runs build and serve the production bundle. Set E2E_BASE_URL to run the same tests
// against a deployed site instead (production smoke).
const externalBaseUrl = process.env.E2E_BASE_URL;
const PORT = 3100;
const FIXED_NOW = "2026-10-01T12:00:00Z";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // The app scrolls smoothly unless reduced motion is preferred (app/globals.css). Under parallel load an animated
    // scroll-into-view let clicks land on stale coordinates (trace: "element is not stable", "<p> intercepts pointer
    // events"), so a Continue click sometimes hit the text above the button. Tests assert behavior, not animation.
    reducedMotion: "reduce",
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
        // Pin the clock so delivery estimates are deterministic (lib/clock.ts): Thursday 2026-10-01.
        env: { ...(process.env as Record<string, string>), APP_FIXED_NOW: FIXED_NOW },
        // Fresh build by default: silently reusing a stale server would test old code. Opt in with E2E_REUSE_SERVER=1.
        reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
        timeout: 240_000,
      },
});
