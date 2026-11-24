import { defineConfig } from "@playwright/test";

const appUrl = "http://127.0.0.1:3200";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: "output/playwright-e2e/results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/playwright-e2e/report", open: "never" }],
    ["json", { outputFile: "output/playwright-e2e/results.json" }],
    ["junit", { outputFile: "output/playwright-e2e/junit.xml" }],
  ],
  use: {
    baseURL: appUrl,
    locale: "en-GB",
    timezoneId: "Europe/London",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      command: "node tests/e2e/support/fake-supabase-auth.mjs",
      url: "http://127.0.0.1:55431/health",
      reuseExistingServer: false,
      timeout: 30_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 3_000 },
    },
    {
      command: "npm start -- --hostname 127.0.0.1 --port 3200",
      url: `${appUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
});
