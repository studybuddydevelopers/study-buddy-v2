import { test, expect, audit, noPageOverflow } from "./support";
import { chat } from "./fixture/data";

function message(id: string, role: "USER" | "ASSISTANT", content: string) {
  return {
    id, chatId: chat.id, role, content, status: "COMPLETED", failureCode: null,
    createdAt: `2026-11-01T12:${id.padStart(2, "0")}:00Z`, updatedAt: chat.updatedAt,
    requestId: null, grounding: null, citations: [],
  };
}

const explanation = "Union includes every element in either set. Intersection includes only the elements they share.\n\n" +
  "$A \\cup B = \\{1, 2, 3, 4\\}$ and $A \\cap B = \\{3\\}$.\n\n" +
  "| Operation | Symbol | Meaning |\n| --- | --- | --- |\n| Union | $\\cup$ | Either set |\n| Intersection | $\\cap$ | Both sets |";

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`conversation scrolls independently and composer stays reachable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/v1/ai/chats/synthetic-chat/messages?*", (route) => route.fulfill({ json: {
      messages: Array.from({ length: 12 }, (_, i) => message(String(i), i % 2 ? "ASSISTANT" : "USER", i % 2 ? explanation : "Can you explain union and intersection?")),
    } }));
    await page.goto("/chat");
    const transcript = page.getByRole("region", { name: "Chat messages", exact: true });
    const composer = page.getByRole("textbox", { name: "Message to AI tutor" });
    await expect(transcript.locator("[data-chat-message]")).toHaveCount(12);
    await expect(composer).toBeInViewport({ ratio: 1 });
    const submit = page.getByRole("button", { name: "Send message", exact: true });
    await expect(submit).toBeInViewport({ ratio: 1 });
    if (width < 1110) {
      const composerBox = await submit.boundingBox();
      const bottomNav = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
      expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(bottomNav!.y);
    }
    await noPageOverflow(page);
    expect(await transcript.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // A long transcript and maths must not widen the workspace.
    expect(await transcript.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(transcript.locator(".katex").first()).toHaveCount(1);
    await transcript.evaluate((el) => { el.scrollTop = 0; });
    const latest = page.getByRole("button", { name: "Jump to latest message" });
    await expect(latest).toBeVisible();
    await latest.click();
    await expect(latest).toHaveCount(0);
    await audit(page);
    await page.screenshot({ path: `output/playwright/chat-${info.project.name}-${width}.png` });
  });
}

test("mobile history contains focus, returns it on close and opens the selected conversation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const second = { ...chat, id: "second-chat", title: "Biology revision" };
  await page.route("**/api/v1/ai/chats?*", (route) => route.fulfill({ json: { chats: [chat, second] } }));
  await page.route("**/api/v1/ai/chats/second-chat/messages?*", (route) => route.fulfill({ json: { messages: [message("1", "USER", "What is photosynthesis?")] } }));
  await page.goto("/chat");
  const trigger = page.getByRole("button", { name: "Show chat history" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Chat history" });
  const close = dialog.getByRole("button", { name: "Close chat history" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Biology revision" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await audit(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Biology revision" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("What is photosynthesis?");
});

test("desktop sidebar can collapse without hiding the conversation", async ({ page }) => {
  await page.goto("/chat");
  await page.getByRole("button", { name: "Hide chat history" }).click();
  await expect(page.getByRole("navigation", { name: "Saved chats" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Message to AI tutor" })).toBeEnabled();
  await page.getByRole("button", { name: "Show chat history" }).click();
  await expect(page.getByRole("navigation", { name: "Saved chats" })).toBeVisible();
});

test("suggestions prepare a draft, Shift+Enter adds a line, and Enter sends only once", async ({ page }) => {
  let release!: () => void;
  const response = new Promise<void>((resolve) => { release = resolve; });
  let sends = 0;
  await page.route("**/api/v1/ai/chats/synthetic-chat/messages", async (route) => {
    sends++;
    expect(route.request().postDataJSON().message).toBe("Explain sets\nwith an example");
    await response;
    await route.fulfill({ json: {
      chat: { ...chat, isStarted: true },
      userMessage: message("1", "USER", "Explain sets\nwith an example"),
      assistantMessage: message("2", "ASSISTANT", explanation),
    } });
  });
  await page.goto("/chat");
  await page.getByRole("button", { name: "Explain a topic" }).click();
  const composer = page.getByRole("textbox", { name: "Message to AI tutor" });
  await expect(composer).toBeFocused();
  await expect(composer).toHaveValue("Help me understand ");
  expect(sends).toBe(0);
  await composer.fill("Explain sets");
  await composer.press("Shift+Enter");
  await composer.pressSequentially("with an example");
  await expect(composer).toHaveValue("Explain sets\nwith an example");
  try {
    await composer.press("Enter");
    await expect(page.getByRole("status", { name: "AI Tutor is responding" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New chat", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Sending message" })).toBeDisabled();
  } finally { release(); }
  await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("Union includes every element");
  expect(sends).toBe(1);
  await page.getByRole("button", { name: "Chat settings", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Subject", exact: true })).toBeDisabled();
  await audit(page);
});

test("failed creation preserves the draft for retry", async ({ page }) => {
  await page.route("**/api/v1/ai/chats?*", (route) => route.fulfill({ json: { chats: [] } }));
  await page.route("**/api/v1/ai/chats", (route) => route.fulfill({ status: 503, json: { message: "Could not create chat. Try again." } }));
  await page.goto("/chat");
  const composer = page.getByRole("textbox", { name: "Message to AI tutor" });
  await composer.fill("Help me with fractions");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not create chat");
  await expect(composer).toHaveValue("Help me with fractions");
  await expect(composer).toBeEnabled();
});

test("first message in a new chat remains visible while the answer is pending", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/ai/chats?*", (route) => route.fulfill({ json: { chats: [] } }));
  await page.route("**/api/v1/ai/chats", (route) => route.fulfill({ json: { chat } }));
  await page.route("**/api/v1/ai/chats/synthetic-chat/messages", async (route) => {
    await pending;
    await route.fulfill({ json: { chat: { ...chat, isStarted: true }, userMessage: message("1", "USER", "Explain fractions"), assistantMessage: message("2", "ASSISTANT", "A fraction is a part of a whole.") } });
  });
  await page.goto("/chat");
  await page.getByRole("textbox", { name: "Message to AI tutor" }).fill("Explain fractions");
  try {
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status", { name: "AI Tutor is responding" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("Explain fractions");
  } finally { release(); }
  await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("A fraction is a part of a whole.");
  await expect(page.locator("[data-chat-message]")).toHaveCount(2);
});

test("source previews remain readable inside a long conversation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const citation = { id: "citation-1", sourceLabel: "Sets study note", resourceId: "resource-1", resourceChunkId: "chunk-1", contentHash: "synthetic" };
  await page.route("**/api/v1/ai/chats/synthetic-chat/messages?*", (route) => route.fulfill({ json: {
    messages: [{ ...message("1", "ASSISTANT", explanation), citations: [citation] }, ...Array.from({ length: 6 }, (_, i) => message(String(i + 2), "ASSISTANT", explanation))],
  } }));
  await page.route("**/api/v1/ai/chats/synthetic-chat/citations/citation-1", (route) => route.fulfill({ json: {
    citation: { ...citation, isCurrentForMessage: true, isActiveResourceVersion: true, contentHashMatches: true },
    resource: { id: "resource-1", title: "Understanding sets", sourceKind: "NOTE" },
    chunk: { id: "chunk-1", title: "Union", chunkType: "TEXT", excerpt: "The union contains elements from either set." },
  } }));
  await page.goto("/chat");
  await page.getByRole("button", { name: "Sets study note", exact: true }).click();
  const preview = page.getByRole("region", { name: "Source preview", exact: true });
  await expect(preview).toContainText("The union contains elements from either set.");
  await expect(preview).toBeInViewport();
  await noPageOverflow(page);
  await preview.getByRole("button", { name: "Close", exact: true }).click();
  await expect(preview).toHaveCount(0);
});

for (const width of [320, 768, 1440]) {
  test(`empty conversation and expanded composer fit at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: "What are we learning today?" })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("region", { name: "Chat messages", exact: true }).locator("img")).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Explain a topic" })).toBeInViewport({ ratio: 1 });
    await noPageOverflow(page);
    await page.screenshot({ path: `output/playwright/chat-empty-${info.project.name}-${width}.png` });
    const composer = page.getByRole("textbox", { name: "Message to AI tutor" });
    const before = await composer.boundingBox();
    await composer.fill("Help me check my working:\n\n" + "A line of working\n".repeat(12));
    const after = await composer.boundingBox();
    expect(after!.height).toBeGreaterThan(before!.height);
    expect(after!.height).toBeLessThanOrEqual(180);
    await expect(page.getByRole("button", { name: "Send message" })).toBeInViewport({ ratio: 1 });
    await audit(page);
  });
}

test("a response can be copied and clipboard failures are explained", async ({ page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => {
      attempts++;
      if (attempts > 1) throw new Error("Clipboard unavailable");
      (window as Window & { copiedResponse?: string }).copiedResponse = text;
    } } });
  });
  await page.route("**/api/v1/ai/chats/synthetic-chat/messages?*", (route) => route.fulfill({ json: { messages: [message("1", "ASSISTANT", explanation)] } }));
  await page.goto("/chat");
  await page.getByRole("button", { name: "Copy response", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => (window as Window & { copiedResponse?: string }).copiedResponse)).toBe(explanation);
  await page.getByRole("button", { name: "Copy response again", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Could not copy");
});
