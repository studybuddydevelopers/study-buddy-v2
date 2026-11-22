import { test, expect, noPageOverflow } from "./support";

// Real Chromium touch input, not a direct scrollLeft assignment or dot click.
// This supplements (rather than replaces) physical iOS/Android acceptance.
for (const width of [320, 768]) {
  test(`touch swipes move each progress carousel and update its dots at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/progress");
    const input = await context.newCDPSession(page);
    for (const [name, item] of [["Honest overview statistics", "overview card"], ["Recommended next action cards", "recommendation"], ["Subject goal cards", "subject goal"]]) {
      const scroller = page.getByRole("region", { name, exact: true });
      await scroller.scrollIntoViewIfNeeded();
      const box = (await scroller.boundingBox())!;
      const startX = box.x + box.width * 0.8;
      const endX = box.x + box.width * 0.2;
      const y = box.y + box.height / 2;
      await input.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y }],
      });
      for (let step = 1; step <= 12; step += 1) {
        await input.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: startX + ((endX - startX) * step) / 12, y }],
        });
      }
      await input.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await expect(page.getByRole("button", { name: new RegExp(`^Show ${item} 2:`) })).toHaveAttribute("aria-current", "true");
    }
    await noPageOverflow(page);
  });
}
