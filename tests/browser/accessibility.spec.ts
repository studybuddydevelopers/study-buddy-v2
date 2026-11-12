import { test, expect, audit, noPageOverflow } from "./support";

const routes = [
  "/", "/about-us", "/contact-us", "/privacy-policy", "/terms-of-service", "/cookie-policy",
  "/accessibility", "/refund-policy", "/content-policy", "/ai-safety", "/parent-student-privacy",
  "/login", "/sign-up", "/forgot-password", "/check-email", "/reset-password/update",
  "/account-unavailable", "/guardian-authorization", "/account-deletion/confirm",
  "/account-security/password-reset-alert", "/account-security/password-reset-recovery",
  "/controls", "/chat", "/settings/study-preferences", "/progress",
];

for (const width of [320, 768, 1440]) {
  const viewportRoutes = width === 768 ? ["/controls", "/chat", "/settings/study-preferences", "/progress"] : routes;
  for (const route of viewportRoutes) {
    test(`${route} has accessible landmarks, contrast and reflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await noPageOverflow(page);
      await audit(page);
    });
  }
}

test("the first keyboard stop skips the header and visibly focuses main", async ({ page, tabKey }) => {
  await page.goto("/controls");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeAttached();
  await page.keyboard.press(tabKey);
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  expect(await skip.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("fields expose their errors and the password action changes its name and input type", async ({ page }) => {
  await page.goto("/controls");
  const email = page.getByRole("textbox", { name: "Email" });
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("Enter your email");
  const password = page.getByLabel("Password", { exact: true });
  const toggle = page.getByRole("button", { name: "Show password", exact: true });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Hide password", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(password).toHaveAttribute("type", "password");
});

test("multi-select uses native keyboard choices, Escape return and outside dismissal", async ({ page, tabKey }) => {
  await page.goto("/controls");
  const trigger = page.getByRole("button", { name: "Subjects Select options" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press(tabKey);
  const option = page.getByRole("group", { name: "Subjects", exact: true }).getByRole("checkbox", { name: "Mathematics" });
  await expect(option).toBeFocused();
  await page.keyboard.press("Space");
  await expect(option).toBeChecked();
  await page.keyboard.press("Escape");
  const selectedTrigger = page.getByRole("button", { name: "Subjects Mathematics" });
  await expect(selectedTrigger).toBeFocused();
  await expect(selectedTrigger).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press(tabKey);
  await expect(page.getByRole("checkbox", { name: "Remember this choice" })).toBeFocused();
  await selectedTrigger.click();
  await page.getByLabel("Email", { exact: false }).click();
  await expect(selectedTrigger).toHaveAttribute("aria-expanded", "false");
});

test("native checkbox/radio cards and interactive Cards work without a mouse", async ({ page }) => {
  await page.goto("/controls");
  const checkbox = page.getByRole("checkbox", { name: "Remember this choice" });
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await page.getByRole("radio", { name: "Mathematics" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "English" })).toBeChecked();
  const card = page.getByRole("button", { name: "Open topic", exact: true });
  await card.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(page.getByRole("status")).toHaveText("Card activations: 2");
  await expect(page.getByRole("button", { name: "Loading destination" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Loading destination" })).toHaveCount(0);
});

test("study switches are named, described and keyboard-operable", async ({ page }) => {
  await page.goto("/settings/study-preferences");
  const toggle = page.getByRole("switch", { name: "Low Data Mode" });
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAccessibleDescription(/image/i);
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toBeChecked();
  await expect(toggle).toBeEnabled();
});

test("progress help supports hover, focus and Escape without click-toggle state", async ({ page }) => {
  await page.goto("/progress");
  const help = page.getByRole("button", { name: "About progress measures" });
  const tooltip = page.getByRole("tooltip");
  await help.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await page.mouse.move(0, 0);
  await help.focus();
  await expect(tooltip).toBeVisible();
  await help.click();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
});

for (const width of [320, 634, 768, 769]) {
  test(`progress cards and daily records remain reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/progress?range=90d");
    for (const [name, item] of [["Honest overview statistics", "overview card"], ["Recommended next action cards", "recommendation"], ["Subject goal cards", "subject goal"]]) {
      const scroller = page.getByRole("region", { name, exact: true });
      const second = page.getByRole("button", { name: new RegExp(`^Show ${item} 2:`) });
      if (width < 769) {
        await second.focus();
        await page.keyboard.press("Enter");
        await expect(second).toHaveAttribute("aria-current", "true");
        await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        // Scroll back using the browser's native horizontal wheel handling,
        // without invoking the component's dot-button handler.
        await scroller.hover();
        await page.mouse.wheel(-1600, 0);
        await expect(page.getByRole("button", { name: new RegExp(`^Show ${item} 1:`) })).toHaveAttribute("aria-current", "true");
      } else {
        await expect(second).toBeHidden();
        expect(await scroller.evaluate((element) => getComputedStyle(element).display)).toBe("grid");
      }
    }
    const summary = page.locator("summary", { hasText: "View daily activity data" });
    await summary.focus();
    await page.keyboard.press("Enter");
    const data = page.getByRole("region", { name: "Daily activity data", exact: true });
    await expect(data).toBeVisible();
    await expect(data.getByRole("listitem")).toHaveCount(90);
    await page.keyboard.press("Tab");
    await expect(data).toBeFocused();
    await noPageOverflow(page);
  });
}

test("reduced motion keeps text visible and prevents smooth carousel scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/controls");
  await expect(page.getByText("Reduced-motion text stays visible")).toHaveCSS("opacity", "1");
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/progress");
  const scroller = page.getByRole("region", { name: "Honest overview statistics" });
  await scroller.evaluate((element) => {
    const original = element.scrollTo.bind(element);
    element.scrollTo = ((options: ScrollToOptions) => {
      element.setAttribute("data-test-scroll-behavior", options.behavior ?? "");
      original(options);
    }) as typeof element.scrollTo;
  });
  await page.getByRole("button", { name: /^Show overview card 2:/ }).click();
  await expect(scroller).toHaveAttribute("data-test-scroll-behavior", "auto");
});

test("zoom-equivalent 720px layout keeps primary interactions reachable", async ({ page }) => {
  // A 1440px viewport at 200% browser zoom has 720 CSS pixels of layout space.
  // CSS zoom does not update media queries, so it is not a valid substitute.
  // This checks equivalent reflow only; actual browser/OS zoom remains manual.
  await page.setViewportSize({ width: 720, height: 450 });
  for (const route of ["/controls", "/progress", "/chat", "/settings/study-preferences"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noPageOverflow(page);
    if (route === "/progress") {
      const summary = page.locator("summary");
      await summary.focus(); await page.keyboard.press("Enter");
      await expect(page.getByRole("region", { name: "Daily activity data" })).toBeVisible();
    } else if (route === "/chat") {
      await expect(page.getByRole("textbox", { name: "Message to AI tutor" })).toBeEnabled();
    } else if (route === "/settings/study-preferences") {
      await expect(page.getByRole("switch", { name: "Low Data Mode" })).toBeEnabled();
    }
  }
});
