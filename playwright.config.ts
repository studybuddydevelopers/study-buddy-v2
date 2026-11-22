import { defineConfig } from "@playwright/test";

// Isolated real-component UI tests: no Next server, .env, accounts or AI calls.
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 30_000,
  outputDir: "output/playwright/results",
  reporter: [["list"], ["html", { outputFolder: "output/playwright/report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3105",
    locale: "en-GB",
    timezoneId: "Europe/London",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium", testIgnore: "**/touch.spec.ts", use: { browserName: "chromium" } },
    { name: "webkit", testIgnore: "**/touch.spec.ts", use: { browserName: "webkit" } },
    { name: "chromium-touch", testMatch: "**/touch.spec.ts", use: { browserName: "chromium", hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: "node tests/browser/fixture/server.mjs",
    url: "http://127.0.0.1:3105",
    reuseExistingServer: false,
    timeout: 60_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 3_000 },
  },
});
