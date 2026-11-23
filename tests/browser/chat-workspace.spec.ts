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
    const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
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
  await expect(page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" })).toBeEnabled();
  await page.getByRole("button", { name: "Show chat history" }).click();
  await expect(page.getByRole("navigation", { name: "Saved chats" })).toBeVisible();
});

for (const width of [320, 1440]) {
  test(`new chats stay local until sending and Settings stays labelled at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/ai/chats") && request.method() !== "GET") writes.push(request.method());
    });
    await page.goto("/chat");
    const settings = page.getByRole("button", { name: "Chat settings", exact: true });
    await expect(settings.getByText("Settings", { exact: true })).toBeVisible();
    const newChat = page.getByRole("button", { name: "New chat", exact: true });
    await newChat.click();
    await newChat.click();
    const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
    await expect(composer).toBeFocused();
    await composer.fill("An unsent question");
    await settings.click();
    await page.getByRole("textbox", { name: "Chat title" }).fill("Unsent draft title");
    await expect(page.getByText("This chat is saved when you send your first message.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save chat title" })).toHaveCount(0);
    await settings.click();
    await noPageOverflow(page);
    await page.screenshot({ path: `output/playwright/chat-draft-${info.project.name}-${width}.png` });
    if (width < 1024) await page.getByRole("button", { name: "Show chat history" }).click();
    const savedChats = page.getByRole("navigation", { name: "Saved chats" });
    await expect(savedChats.getByRole("button")).toHaveCount(1);
    await savedChats.getByRole("button", { name: chat.title }).click();
    await expect(composer).toHaveValue("");
    await newChat.click();
    await page.reload();
    await expect(composer).toBeEnabled();
    await expect(page.getByText("Unsent draft title", { exact: true })).toHaveCount(0);
    expect(writes).toEqual([]);
    await audit(page);
  });
}

test("first send saves draft settings once and the conversation survives refresh", async ({ page }) => {
  const subjectId = "11111111-1111-4111-8111-111111111111";
  const topicId = "22222222-2222-4222-8222-222222222222";
  const saved = { ...chat, id: "draft-chat", title: "My sets revision", subjectId, topicId, updatedAt: "2026-11-02T12:00:00Z", isStarted: true };
  const userMessage = { ...message("1", "USER", "Explain the union of sets"), chatId: saved.id };
  const assistantMessage = { ...message("2", "ASSISTANT", explanation), chatId: saved.id };
  let creates = 0;
  let sends = 0;
  await page.route("**/api/v1/materials/overview", (route) => route.fulfill({ json: { subjects: [{ id: subjectId, name: "Mathematics", topics: [{ id: topicId, title: "Sets" }] }] } }));
  await page.route("**/api/v1/ai/chats?*", (route) => route.fulfill({ json: { chats: sends ? [saved, chat] : [chat] } }));
  await page.route("**/api/v1/ai/chats", (route) => {
    creates++;
    expect(route.request().postDataJSON()).toEqual({ title: saved.title, subjectId, topicId });
    return route.fulfill({ json: { chat: { ...saved, isStarted: false } } });
  });
  await page.route("**/api/v1/ai/chats/draft-chat/messages", (route) => {
    sends++;
    expect(route.request().postDataJSON().message).toBe(userMessage.content);
    return route.fulfill({ json: { chat: saved, userMessage, assistantMessage } });
  });
  await page.route("**/api/v1/ai/chats/draft-chat/messages?*", (route) => route.fulfill({ json: { messages: [userMessage, assistantMessage] } }));
  await page.goto("/chat");
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  const settings = page.getByRole("button", { name: "Chat settings", exact: true });
  await settings.click();
  await page.getByRole("textbox", { name: "Chat title" }).fill(saved.title);
  await page.getByRole("combobox", { name: "Subject", exact: true }).selectOption(subjectId);
  await page.getByRole("combobox", { name: "Topic", exact: true }).selectOption(topicId);
  await settings.click();
  expect(creates).toBe(0);
  await page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" }).fill(userMessage.content);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const transcript = page.getByRole("region", { name: "Chat messages", exact: true });
  await expect(transcript).toContainText("Union includes every element");
  await expect(page.getByRole("navigation", { name: "Saved chats" }).getByRole("button", { name: saved.title })).toHaveCount(1);
  await page.reload();
  await expect(transcript).toContainText(userMessage.content);
  await expect(transcript).toContainText("Union includes every element");
  expect(creates).toBe(1);
  expect(sends).toBe(1);
});

for (const width of [320, 1440]) {
  test(`composer explains its disabled state while sending at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
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
    const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
    const form = page.getByRole("form", { name: "Send a message" });
    const readyBackground = await form.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {})));
      return getComputedStyle(element).backgroundColor;
    });
    await expect(composer).toBeFocused();
    await expect(composer).toHaveValue("Help me understand ");
    expect(sends).toBe(0);
    await composer.fill("Explain sets");
    await composer.press("Shift+Enter");
    await composer.pressSequentially("with an example");
    await expect(composer).toHaveValue("Explain sets\nwith an example");
    try {
      await composer.press("Enter");
      const responding = page.getByRole("status", { name: "AI Study Buddy Tutor is responding" });
      await expect(responding).toBeVisible();
      await expect(responding).toContainText("Thinking through your question…");
      const volumeBars = responding.locator("svg g[mask] rect");
      await expect(volumeBars.first()).toBeAttached();
      const firstFrame = await volumeBars.evaluateAll((bars) => bars.map((bar) => bar.getAttribute("height")));
      await expect.poll(() => volumeBars.evaluateAll((bars) => bars.map((bar) => bar.getAttribute("height")))).not.toEqual(firstFrame);
      await expect(page.getByRole("button", { name: "New chat", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Sending message" })).toBeDisabled();
      await expect(composer).toBeDisabled();
      await expect(composer).toHaveAttribute("placeholder", "Study Buddy is replying…");
      await expect(composer).toHaveAccessibleDescription(/Replying — input paused/);
      await expect(composer).toHaveCSS("cursor", "not-allowed");
      await expect(form.getByRole("status")).toHaveText("Replying — input paused");
      await expect(form).not.toHaveCSS("background-color", readyBackground);
      await noPageOverflow(page);
      await audit(page);
      await page.screenshot({ path: `output/playwright/chat-paused-${info.project.name}-${width}.png` });
    } finally { release(); }
    await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("Union includes every element");
    expect(sends).toBe(1);
    await expect(composer).toBeEnabled();
    await expect(composer).toHaveAttribute("placeholder", "Ask Study Buddy…");
    await expect(form.getByRole("status")).toBeEmpty();
    await expect(form).toHaveCSS("background-color", readyBackground);
    await page.getByRole("button", { name: "Chat settings", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Subject", exact: true })).toBeDisabled();
    await audit(page);
  });
}

test("retrying explains the paused input and restores it when the retry fails", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/ai/chats/synthetic-chat/messages?*", (route) => route.fulfill({ json: {
    messages: [message("1", "USER", "Explain fractions"), { ...message("2", "ASSISTANT", ""), status: "FAILED", requestId: "request-1", failureCode: "INTERNAL_ERROR" }],
  } }));
  await page.route("**/api/v1/ai/chats/synthetic-chat/requests/request-1/retry", async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: { message: "Please try again." } });
  });
  await page.goto("/chat");
  const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
  const status = page.getByRole("form", { name: "Send a message" }).getByRole("status");
  try {
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(composer).toBeDisabled();
    await expect(status).toHaveText("Replying — input paused");
  } finally { release(); }
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(composer).toBeEnabled();
  await expect(composer).toHaveAttribute("placeholder", "Ask Study Buddy…");
  await expect(status).toBeEmpty();
});

test("failed creation preserves the draft for retry", async ({ page }) => {
  await page.route("**/api/v1/ai/chats?*", (route) => route.fulfill({ json: { chats: [] } }));
  await page.route("**/api/v1/ai/chats", (route) => route.fulfill({ status: 503, json: { message: "Could not create chat. Try again." } }));
  await page.goto("/chat");
  const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
  await composer.fill("Help me with fractions");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not create chat");
  await expect(composer).toHaveValue("Help me with fractions");
  await expect(composer).toBeEnabled();
});

test("first message stays visible while pending and its AI title updates the workspace", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/ai/chats?*", (route) => route.fulfill({ json: { chats: [] } }));
  await page.route("**/api/v1/ai/chats", (route) => route.fulfill({ json: { chat: { ...chat, title: "New chat" } } }));
  await page.route("**/api/v1/ai/chats/synthetic-chat/messages", async (route) => {
    await pending;
    await route.fulfill({ json: { chat: { ...chat, title: "Understanding fractions", isStarted: true }, userMessage: message("1", "USER", "Explain fractions"), assistantMessage: message("2", "ASSISTANT", "A fraction is a part of a whole.") } });
  });
  await page.goto("/chat");
  await page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" }).fill("Explain fractions");
  try {
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status", { name: "AI Study Buddy Tutor is responding" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("Explain fractions");
  } finally { release(); }
  await expect(page.getByRole("region", { name: "Chat messages", exact: true })).toContainText("A fraction is a part of a whole.");
  await expect(page.locator("[data-chat-message]")).toHaveCount(2);
  await expect(page.getByRole("navigation", { name: "Saved chats" }).getByRole("button", { name: "Understanding fractions", exact: true })).toBeVisible();
  await expect(page.locator("main header")).toContainText("Understanding fractions");
  await page.getByRole("button", { name: "Chat settings", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Chat title" })).toHaveValue("Understanding fractions");
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
    const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
    const before = await composer.boundingBox();
    await composer.fill("Help me check my working:\n\n" + "A line of working\n".repeat(12));
    const after = await composer.boundingBox();
    expect(after!.height).toBeGreaterThan(before!.height);
    expect(after!.height).toBeLessThanOrEqual(180);
    await expect(page.getByRole("button", { name: "Send message" })).toBeInViewport({ ratio: 1 });
    await audit(page);
  });
}

test("chat title search restores saved chats when cleared", async ({ page }) => {
  const matchingChat = {
    ...chat,
    id: "biology-chat",
    title: "Biology revision",
  };
  await page.route("**/api/v1/ai/chats?*", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    return route.fulfill({
      json: query
        ? { chats: [matchingChat], pagination: { hasNextPage: false } }
        : { chats: [chat] },
    });
  });
  await page.goto("/chat");
  await page.getByRole("button", { name: "Search chats", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Search chat titles" });
  await search.fill("biology");
  const results = page.getByRole("navigation", { name: "Chat search results" });
  await expect(
    results.getByRole("button", { name: matchingChat.title, exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "matching chat" })
  ).toHaveText("1 matching chat");
  await page.getByRole("button", { name: "Clear chat search" }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(results).toHaveCount(0);
  await expect(
    page.locator("#chat-search-panel")
      .getByRole("navigation", { name: "Saved chats" })
      .getByRole("button", { name: chat.title, exact: true })
  ).toBeVisible();
});

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
  const responseStatus = page.getByRole("region", { name: "Chat messages", exact: true }).getByRole("status");
  await expect(responseStatus).toHaveText("Copied");
  expect(await page.evaluate(() => (window as Window & { copiedResponse?: string }).copiedResponse)).toBe(explanation);
  await page.getByRole("button", { name: "Copy response again", exact: true }).click();
  await expect(responseStatus).toContainText("Could not copy");
});
