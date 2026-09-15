import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DeletionPendingView } from "./AccountLifecycleStatus";

function renderPendingView(
  overrides: Partial<Parameters<typeof DeletionPendingView>[0]> = {}
) {
  return renderToStaticMarkup(
    createElement(DeletionPendingView, {
      cancellationAllowed: true,
      deletionDate: "30 September 2026 at 11:00",
      error: "",
      loading: false,
      submittingAction: null,
      onCancelDeletion: vi.fn(),
      onSignOut: vi.fn(),
      ...overrides,
    })
  );
}

describe("DeletionPendingView", () => {
  it("makes the reversible status and primary recovery action clear", () => {
    const html = renderPendingView();

    expect(html).toContain("Your account has not been deleted yet");
    expect(html).toContain("Your cancellation window is open");
    expect(html).toContain("30 September 2026 at 11:00");
    expect(html).toContain("Cancel deletion request");
    expect(html).toContain("privacy@studybuddyng.com");
    expect(html).toContain('aria-busy="false"');
  });

  it("shows a stable status while account details are loading", () => {
    const html = renderPendingView({ loading: true, deletionDate: null });

    expect(html).toContain("Checking your deletion status");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Cancel deletion request");
    expect(html).toContain("disabled");
  });

  it("removes the cancellation action after processing starts", () => {
    const html = renderPendingView({
      cancellationAllowed: false,
      deletionDate: null,
    });

    expect(html).toContain("Deletion processing has started");
    expect(html).toContain("The cancellation deadline has passed");
    expect(html).toContain("Date unavailable");
    expect(html).not.toContain("Cancel deletion request");
    expect(html).toContain("Sign out");
  });

  it("shows loading feedback only on the action being submitted", () => {
    const html = renderPendingView({ submittingAction: "sign-out" });

    expect(html).toContain("Sign out");
    expect(html).toContain("animate-spin");
    expect(html.match(/animate-spin/g)).toHaveLength(1);
  });
});
