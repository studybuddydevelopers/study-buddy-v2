import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chat } from "./fixture/data";

// Test-scoped interception prevents real accounts, emails or AI-credit use.
export const test = base.extend<{ isolatedNetwork: void; tabKey: string }>({
  // macOS WebKit uses Option+Tab to include links/native choices when the
  // user's system Keyboard Navigation setting is off. Do not change that setting.
  // https://support.apple.com/guide/safari/cpsh003/mac
  tabKey: async ({ browserName }, provide) => {
    await provide(browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
  },
  isolatedNetwork: [async ({ context, page }, use) => {
    const unexpected: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== "http://127.0.0.1:3105") {
        unexpected.push(`External request: ${url.origin}`);
        return route.abort();
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      let body: unknown;
      if (url.pathname === "/api/v1/me") body = { profile: null };
      else if (url.pathname === "/api/v1/materials/overview") body = { subjects: [] };
      else if (url.pathname === "/api/v1/notifications") body = { unreadCount: 0 };
      else if (url.pathname === "/api/v1/settings") {
        body = { settings: { cloudPracticeDraftsEnabled: false, lowDataModeEnabled: false, ...(request.method() === "PATCH" ? request.postDataJSON() : {}) } };
      } else if (url.pathname === "/api/v1/ai/chats" && request.method() === "GET") body = { chats: [chat] };
      else if (url.pathname === `/api/v1/ai/chats/${chat.id}/messages` && request.method() === "GET") body = { messages: [] };
      else {
        unexpected.push(`Unmocked request: ${request.method()} ${url.pathname}`);
        return route.abort();
      }
      return route.fulfill({ json: body });
    });
    await use();
    expect(unexpected, "Every application/external request must be explicitly mocked").toEqual([]);
    expect(errors, "Uncaught browser errors").toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function audit(page: Page) {
  // Audit settled content, not an intermediate opacity in a fade-in.
  // Indefinite decorative/loading animations must not block the scan.
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})));
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(results.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) }))).toEqual([]);
}

export async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}
