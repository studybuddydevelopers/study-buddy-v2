import { test, expect, audit, noPageOverflow } from "./support";
import { chat } from "./fixture/data";

const messages = ["First question", "First response", "Second question", "Second response to report."].map((content, index) => ({
  id: String(index + 1), chatId: chat.id, role: index % 2 ? "ASSISTANT" : "USER", content,
  status: "COMPLETED", failureCode: null, createdAt: `2026-11-01T12:00:0${index}Z`, updatedAt: chat.updatedAt,
  requestId: null, grounding: null, citations: [],
}));

for (const width of [320, 1440]) {
  test(`report attaches the selected response, recovers from failure and shows its review status at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/ai/chats/synthetic-chat/messages?*", (route) => route.fulfill({ json: { messages } }));
    let sends = 0;
    let saved = false;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const receipt = { id: "report-1", status: "OPEN", createdAt: chat.createdAt, reviewedAt: null, resolutionNote: null };
    await page.route("**/api/v1/ai/chats/synthetic-chat/messages/4/report", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { report: saved ? { ...receipt, status: "REVIEWED", resolutionNote: "Thanks. This example needs correcting." } : null } });
      sends++;
      expect(route.request().postDataJSON()).toEqual({ reason: "INCORRECT", details: "Please check the second example." });
      if (sends === 1) return route.fulfill({ status: 503, json: { message: "Unavailable" } });
      await pending;
      saved = true;
      return route.fulfill({ json: { report: receipt } });
    });
    await page.goto("/chat");
    const reports = page.getByRole("button", { name: "Report response", exact: true });
    await expect(reports).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Copy response", exact: true })).toHaveCount(2);
    await reports.nth(1).click();
    const dialog = page.getByRole("dialog", { name: "Report this response" });
    await expect(dialog.getByRole("combobox", { name: "Reason", exact: true })).toBeFocused();
    await expect(dialog.locator("blockquote")).toHaveText("Second response to report.");
    await dialog.getByRole("textbox", { name: "Anything else? (optional)" }).fill("Please check the second example.");
    await noPageOverflow(page);
    await audit(page);
    await page.screenshot({ path: `output/playwright/chat-report-${info.project.name}-${width}.png` });
    await dialog.getByRole("button", { name: "Send report", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("We couldn't send your report");
    await expect(dialog.getByRole("textbox")).toHaveValue("Please check the second example.");
    try {
      await dialog.getByRole("button", { name: "Send report", exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Sending report…" })).toBeDisabled();
      await expect(dialog.getByRole("button", { name: "Close report" })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
    } finally { release(); }
    await expect(dialog.getByRole("status")).toHaveText("Report received — awaiting review");
    await expect(dialog).toContainText("Reference: report-1");
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(reports.nth(1)).toBeFocused();
    await reports.nth(1).click();
    await expect(dialog.getByRole("status")).toHaveText("Reviewed by Study Buddy support");
    await expect(dialog).toContainText("Thanks. This example needs correcting.");
    await expect(dialog.getByRole("button", { name: "Send report", exact: true })).toHaveCount(0);
    expect(sends).toBe(2);
    await audit(page);
  });

  test(`conversation loading uses splash-filled lettering without overflow at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/v1/ai/chats/synthetic-chat/messages?*", async (route) => { await pending; await route.fulfill({ json: { messages: [] } }); });
    await page.goto("/chat");
    try {
      const loading = page.getByRole("status", { name: "Loading conversations", exact: true });
      await expect(loading).toBeInViewport({ ratio: 1 });
      const firstSplash = loading.locator(".chat-splash-in").first();
      const firstFrame = await firstSplash.evaluate((el) => getComputedStyle(el).transform);
      await expect.poll(() => firstSplash.evaluate((el) => getComputedStyle(el).transform)).not.toBe(firstFrame);
      await noPageOverflow(page);
      await audit(page);
      // Freeze a filled frame only for the screenshot, after checking live motion.
      await loading.evaluate((el) => el.getAnimations({ subtree: true }).forEach((animation) => { animation.pause(); animation.currentTime = 1800; }));
      await page.screenshot({ path: `output/playwright/chat-loading-${info.project.name}-${width}.png` });
    } finally { release(); }
    await expect(page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" })).toBeEnabled();
  });
}

test("loading lettering stays filled and still with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/ai/chats/synthetic-chat/messages?*", async (route) => { await pending; await route.fulfill({ json: { messages: [] } }); });
  await page.goto("/chat");
  try {
    const loading = page.getByRole("status", { name: "Loading conversations", exact: true });
    await expect(loading.locator(".chat-splash-in").first()).toHaveCSS("animation-name", "none");
    await expect(loading.locator(".chat-splash-in").first()).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await expect(loading.locator(".chat-splash-out").first()).toHaveCSS("transform", "matrix(0, 0, 0, 0, 0, 0)");
  } finally { release(); }
});

test("support can submit a review note and sees the confirmed saved result", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/api/v1/support/chat-reports/report-1", (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().postDataJSON()).toEqual({ resolutionNote: "Thanks, this example needs correcting." });
    return route.fulfill({ json: { report: { id: "report-1", status: "REVIEWED", resolutionNote: "Thanks, this example needs correcting." } } });
  });
  await page.goto("/support/chat-reports");
  await expect(page.getByRole("button", { name: "Mark reviewed" })).toBeDisabled();
  await page.getByRole("textbox", { name: "Review note for the learner" }).fill("Thanks, this example needs correcting.");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByRole("status")).toHaveText("Reviewed");
  await expect(page.getByText("Thanks, this example needs correcting.")).toBeVisible();
  await noPageOverflow(page);
  await audit(page);
});
