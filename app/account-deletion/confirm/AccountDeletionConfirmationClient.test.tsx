import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AuthStateProvider from "@/components/AuthStateProvider";
import AccountDeletionConfirmationClient, {
  DeletionPendingSummary,
} from "./AccountDeletionConfirmationClient";

describe("AccountDeletionConfirmationClient", () => {
  it("explains the consequences before permanent deletion is confirmed", () => {
    const html = renderToStaticMarkup(
      <AuthStateProvider initialIsAuthenticated={false}>
        <AccountDeletionConfirmationClient />
      </AuthStateProvider>
    );

    expect(html).toContain("Confirm permanent account deletion");
    expect(html).toContain("This starts the deletion process");
    expect(html).toContain("What confirming does");
    expect(html).toContain("15-day cancellation window");
    expect(html).toContain("Checking the secure confirmation link");
    expect(html).toContain("Return without confirming");
    expect(html).not.toContain("<main");
  });

  it("shows the deadline and reversal route after confirmation", () => {
    const html = renderToStaticMarkup(
      createElement(DeletionPendingSummary, {
        confirmed: {
          scheduledFor: "2026-09-30T10:00:00.000Z",
          notificationEmailSent: true,
        },
        deadline: "30 September 2026 at 11:00",
      })
    );

    expect(html).toContain("Account access is now restricted");
    expect(html).toContain("30 September 2026 at 11:00");
    expect(html).toContain("Want to keep your account?");
    expect(html).toContain("privacy@studybuddyng.com");
    expect(html).toContain('aria-live="polite"');
  });

  it("makes a failed confirmation email visible without hiding the active request", () => {
    const html = renderToStaticMarkup(
      createElement(DeletionPendingSummary, {
        confirmed: {
          scheduledFor: "2026-09-30T10:00:00.000Z",
          notificationEmailSent: false,
        },
        deadline: null,
      })
    );

    expect(html).toContain("Could not be sent");
    expect(html).toContain("The final email could not be sent");
    expect(html).toContain("deletion request is still active");
  });
});
