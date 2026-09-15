import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PasswordResetAlertClient, {
  LockedAccountSummary,
  revealMissingTokenAlert,
} from "./PasswordResetAlertClient";

describe("PasswordResetAlertClient", () => {
  it("presents a clear security decision before any account change", () => {
    const html = renderToStaticMarkup(
      createElement(PasswordResetAlertClient)
    );

    expect(html).toContain("Was this password reset you?");
    expect(html).toContain("Yes, I requested the reset");
    expect(html).toContain("No, I did not request it");
    expect(html).toContain("Nothing has changed yet");
    expect(html).toContain("Checking the secure email link");
    expect(html).toContain('class="mt-5 border-t border-red-200 pt-5 sm:hidden"');
    expect(html).toContain("hidden sm:inline-flex");
    expect(html).not.toContain("<main");
  });

  it("focuses and scrolls the incomplete-link alert into view", () => {
    const focus = vi.fn();
    const scrollIntoView = vi.fn();
    const alert = { focus, scrollIntoView } as unknown as HTMLDivElement;

    revealMissingTokenAlert(alert, false);

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("shows the protection outcome and recovery status", () => {
    const html = renderToStaticMarkup(
      createElement(LockedAccountSummary, {
        locked: {
          lockedUntil: "2026-09-16T08:30:00.000Z",
          recoveryEmailSent: true,
        },
        deadline: "16 September 2026 at 09:30",
      })
    );

    expect(html).toContain("The suspicious activity has been contained");
    expect(html).toContain("Temporarily locked");
    expect(html).toContain("Check the account email");
    expect(html).toContain('aria-live="polite"');
  });
});
