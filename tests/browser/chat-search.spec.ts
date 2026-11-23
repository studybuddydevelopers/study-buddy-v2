import { test, expect, audit, noPageOverflow } from "./support";
import { chat } from "./fixture/data";

for (const width of [320, 768, 1440]) {
  test(`sidebar searches older titles, opens a result and starts an unsaved chat at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const older = { ...chat, id: "older-sets", title: "Sets revision", updatedAt: "2026-10-01T12:00:00Z" };
    const oldest = { ...older, id: "oldest-sets", title: "Sets and probability" };
    const queries: string[] = [];
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/ai/chats") && request.method() !== "GET") writes.push(request.method());
    });
    await page.route("**/api/v1/ai/chats?*", (route) => {
      const params = new URL(route.request().url()).searchParams;
      if (!params.has("q")) return route.fulfill({ json: { chats: [chat] } });
      queries.push(params.get("q")!);
      const firstPage = params.get("page") === "1";
      return route.fulfill({ json: { chats: firstPage ? [older] : [oldest], pagination: { hasNextPage: firstPage } } });
    });
    await page.route("**/api/v1/ai/chats/oldest-sets/messages?*", (route) => route.fulfill({ json: { messages: [{
      id: "older-answer", chatId: oldest.id, role: "ASSISTANT", content: "Your earlier sets explanation.",
      status: "COMPLETED", failureCode: null, createdAt: chat.createdAt, updatedAt: chat.updatedAt,
      requestId: null, grounding: null, citations: [],
    }] } }));
    await page.goto("/chat");
    const openHistory = async () => {
      if (width < 1024) await page.getByRole("button", { name: "Show chat history" }).click();
      return width < 1024 ? page.getByRole("dialog", { name: "Chat history" }) : page.getByRole("complementary", { name: "Chat history" });
    };
    const history = await openHistory();
    await history.getByRole("button", { name: "Search chats", exact: true }).click();
    const panel = width >= 768 ? page.getByRole("dialog", { name: "Search chats", exact: true }) : history;
    const search = panel.getByRole("searchbox", { name: "Search chat titles" });
    await expect(search).toBeFocused();
    await search.fill("  SeTs  ");
    const results = panel.getByRole("navigation", { name: "Chat search results" });
    await expect(results.getByRole("button", { name: older.title, exact: true })).toBeVisible();
    await expect(results.getByRole("button", { name: chat.title })).toHaveCount(0);
    await panel.getByRole("button", { name: "Show more matches" }).click();
    await expect(results.getByRole("button")).toHaveCount(2);
    await expect(panel.getByRole("status")).toHaveText("2 matching chats");
    expect(queries).toEqual(["SeTs", "SeTs"]);
    await noPageOverflow(page);
    await audit(page);
    await page.screenshot({ path: `output/playwright/chat-search-${info.project.name}-${width}.png` });
    await results.getByRole("button", { name: oldest.title, exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Search chats", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("Your earlier sets explanation.");
    if (width < 1024) await expect(history).toHaveCount(0);
    await page.getByRole("button", { name: "Chat settings", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Chat title" })).toHaveValue(oldest.title);
    await page.getByRole("button", { name: "Chat settings", exact: true }).click();
    const reopenedHistory = await openHistory();
    await reopenedHistory.getByRole("button", { name: "New chat in sidebar" }).click();
    const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
    await expect(composer).toBeFocused();
    await expect(page.getByRole("heading", { name: "What are we learning today?" })).toBeVisible();
    if (width < 1024) await expect(reopenedHistory).toHaveCount(0);
    expect(writes).toEqual([]);
  });
}

test("mobile search contains keyboard focus and recovers from empty results and a failed search", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  let attempts = 0;
  await page.route("**/api/v1/ai/chats?*", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "sets" && ++attempts === 1) return route.fulfill({ status: 503, json: { message: "Unavailable" } });
    return route.fulfill({ json: { chats: query === "sets" ? [chat] : [], pagination: { hasNextPage: false } } });
  });
  await page.goto("/chat");
  const trigger = page.getByRole("button", { name: "Show chat history" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Chat history" });
  const close = dialog.getByRole("button", { name: "Close chat history" });
  await dialog.getByRole("button", { name: "Search chats", exact: true }).click();
  const search = dialog.getByRole("searchbox", { name: "Search chat titles" });
  await expect(search).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(search).toBeFocused();
  await search.fill("missing title");
  await expect(dialog.getByRole("status")).toHaveText("No chats match this title.");
  await search.fill("sets");
  await expect(dialog.getByRole("alert")).toHaveText("Could not search your chats.");
  await dialog.getByRole("button", { name: "Try search again" }).click();
  await expect(dialog.getByRole("status")).toHaveText("1 matching chat");
  expect(attempts).toBe(2);
  await audit(page);
  await dialog.getByRole("button", { name: "Clear chat search" }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(dialog.getByRole("navigation", { name: "Chat search results" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.getByRole("dialog", { name: "Search chats", exact: true })).toHaveCount(0);
});

for (const width of [768, 1440]) {
  test(`search opens a centred popup with contained focus and returns to its trigger at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/chat");
    if (width < 1024) await page.getByRole("button", { name: "Show chat history" }).click();
    const history = width < 1024 ? page.getByRole("dialog", { name: "Chat history", exact: true }) : page.getByRole("complementary", { name: "Chat history" });
    const trigger = history.getByRole("button", { name: "Search chats", exact: true });
    await trigger.click();
    const popup = page.getByRole("dialog", { name: "Search chats", exact: true });
    const input = popup.getByRole("searchbox", { name: "Search chat titles" });
    const close = popup.getByRole("button", { name: "Close chat search" });
    await expect(input).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(input).toBeFocused();
    await expect(input).toHaveCSS("outline-style", "none");
    await expect(popup.locator(".chat-title-search")).toHaveCSS("outline-style", "solid");
    await expect(popup.locator(".chat-title-search")).toHaveCSS("outline-offset", "0px");
    await expect(popup).toBeInViewport({ ratio: 1 });
    const bounds = await popup.boundingBox();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(input).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(popup.getByRole("button", { name: chat.title })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
    await audit(page);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await close.click();
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test("phone search stays in the drawer and preserves its query when resized to tablet", async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 900 });
  await page.goto("/chat");
  await page.getByRole("button", { name: "Show chat history" }).click();
  const history = page.getByRole("dialog", { name: "Chat history", exact: true });
  await history.getByRole("button", { name: "Search chats", exact: true }).click();
  await history.getByRole("searchbox", { name: "Search chat titles" }).fill("study");
  await expect(history.getByRole("status")).toHaveText("1 matching chat");
  const popup = page.getByRole("dialog", { name: "Search chats", exact: true });
  await expect(popup).toHaveCount(0);
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(popup.getByRole("searchbox", { name: "Search chat titles" })).toHaveValue("study");
  await expect(popup.getByRole("searchbox", { name: "Search chat titles" })).toBeFocused();
  await expect(popup.getByRole("status")).toHaveText("1 matching chat");
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(popup).toBeInViewport({ ratio: 1 });
  await noPageOverflow(page);
  await popup.getByRole("button", { name: "Close chat search" }).click();
  await expect(history.getByRole("button", { name: "Search chats", exact: true })).toBeFocused();
});

test("a late search response cannot replace a newer title search", async ({ page }) => {
  let release!: () => void;
  const heldResponse = new Promise<void>((resolve) => { release = resolve; });
  let finishOld!: () => void;
  const oldFinished = new Promise<void>((resolve) => { finishOld = resolve; });
  await page.route("**/api/v1/ai/chats?*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "sets") {
      await heldResponse;
      try {
        await route.fulfill({ json: { chats: [{ ...chat, id: "sets", title: "Sets revision" }], pagination: { hasNextPage: false } } });
      } finally { finishOld(); }
      return;
    }
    await route.fulfill({ json: { chats: query ? [{ ...chat, id: "biology", title: "Biology revision" }] : [chat], pagination: { hasNextPage: false } } });
  });
  await page.goto("/chat");
  await page.getByRole("button", { name: "Search chats", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Search chat titles" });
  const oldRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get("q") === "sets");
  try {
    await search.fill("sets");
    await oldRequest;
    await search.fill("biology");
    const results = page.getByRole("navigation", { name: "Chat search results" });
    await expect(results.getByRole("button", { name: "Biology revision" })).toBeVisible();
    release();
    await oldFinished;
    await expect(results.getByRole("button")).toHaveCount(1);
    await expect(results.getByRole("button", { name: "Biology revision" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Searching chats…" })).toHaveCount(0);
  } finally { release(); }
});
