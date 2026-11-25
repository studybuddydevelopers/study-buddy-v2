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
      env: {
        NODE_OPTIONS: "--import=./tests/e2e/support/isolate-providers.mjs",
        SUPABASE_SECRET_KEY: "sb_secret_e2e_only",
        RESEND_API_KEY: "e2e-fake-resend",
        TRANSACTIONAL_EMAIL_FROM: "Study Buddy <e2e@example.test>",
        TRANSACTIONAL_EMAIL_REPLY_TO: "e2e@example.test",
        ACCOUNT_DELETION_CRON_SECRET: "e2e-account-deletion-cron-secret-only",
        RECOMMENDATIONS_CRON_SECRET: "e2e-recommendations-cron-secret-only",
        PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX: "3",
        MARKING_REVIEW_SUPPORT_USER_IDS: "",
        PAYSTACK_SECRET_KEY: "e2e-fake-paystack",
        AI_GROUNDED_CHAT_ENABLED: "false",
      },
      reuseExistingServer: false,
      timeout: 120_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
});
