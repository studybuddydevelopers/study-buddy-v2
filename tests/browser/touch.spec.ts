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
      await input.send("Input.synthesizeScrollGesture", {
        x: box.x + box.width * 0.85,
        y: box.y + box.height / 2,
        xDistance: -box.width * 0.7,
        yDistance: 0,
        speed: 400,
        gestureSourceType: "touch",
        preventFling: true,
      });
      await expect(page.getByRole("button", { name: new RegExp(`^Show ${item} 2:`) })).toHaveAttribute("aria-current", "true");
      await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    }
    await noPageOverflow(page);
  });
}
