import { test, expect, audit } from "./support";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/chat");
  const trigger = page.getByRole("button", { name: "Delete chat", exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("contains focus, exposes a name/description and returns focus after Escape", async ({ page }) => {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName(/delete/i);
  await expect(dialog).toHaveAccessibleDescription(/permanent/i);
  const keep = dialog.getByRole("button", { name: "Keep chat" });
  const remove = dialog.getByRole("button", { name: "Delete permanently" });
  await expect(keep).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(remove).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keep).toBeFocused();
  await audit(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete chat", exact: true })).toBeFocused();
});

test("cannot dismiss while deleting and restores composer focus after success", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/ai/chats/synthetic-chat", async (route) => {
    expect(route.request().method()).toBe("DELETE");
    await pending;
    await route.fulfill({ json: { success: true } });
  });
  const dialog = page.getByRole("dialog");
  try {
    await dialog.getByRole("button", { name: "Delete permanently" }).click();
    await expect(dialog.getByRole("button", { name: "Keep chat" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await page.mouse.click(1, 1);
    await expect(dialog).toBeVisible();
  } finally { release(); }
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Message to AI tutor" })).toBeFocused();
});

test("keeps a failed deletion's alert in the dialog and permits a retry", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/v1/ai/chats/synthetic-chat", async (route) => {
    attempts++;
    await route.fulfill(attempts === 1
      ? { status: 503, json: { message: "Could not delete this chat. Try again." } }
      : { json: { success: true } });
  });
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Could not delete");
  await expect(dialog.getByRole("button", { name: "Delete permanently" })).toBeEnabled();
  await audit(page);
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toBe(2);
});
