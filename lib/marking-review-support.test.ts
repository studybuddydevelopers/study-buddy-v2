import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));

describe("marking review support access", () => {
  const originalIds = process.env.MARKING_REVIEW_SUPPORT_USER_IDS;

  beforeEach(() => {
    vi.resetModules();
    process.env.MARKING_REVIEW_SUPPORT_USER_IDS = "support-1, support-2";
  });

  afterEach(() => {
    if (originalIds === undefined) {
      delete process.env.MARKING_REVIEW_SUPPORT_USER_IDS;
    } else {
      process.env.MARKING_REVIEW_SUPPORT_USER_IDS = originalIds;
    }
  });

  it("allows explicitly configured stable user IDs", async () => {
    const { isMarkingReviewSupportUser } = await import("./marking-review-support");
    expect(isMarkingReviewSupportUser({ userId: "support-1" })).toBe(true);
    expect(isMarkingReviewSupportUser({ userId: "learner-1" })).toBe(false);
  });

  it("allows a verified account on the exact Study Buddy domain", async () => {
    const { isMarkingReviewSupportUser } = await import("./marking-review-support");
    expect(
      isMarkingReviewSupportUser({
        userId: "support-3",
        email: "Founder@StudyBuddyNG.com",
        emailConfirmedAt: "2026-09-26T10:00:00.000Z",
      })
    ).toBe(true);
  });

  it("rejects unverified and lookalike Study Buddy email addresses", async () => {
    const { isMarkingReviewSupportUser } = await import("./marking-review-support");
    expect(
      isMarkingReviewSupportUser({
        userId: "learner-1",
        email: "person@studybuddyng.com",
        emailConfirmedAt: null,
      })
    ).toBe(false);
    expect(
      isMarkingReviewSupportUser({
        userId: "learner-2",
        email: "person@studybuddyng.com.evil.example",
        emailConfirmedAt: "2026-09-26T10:00:00.000Z",
      })
    ).toBe(false);
    expect(
      isMarkingReviewSupportUser({
        userId: "learner-3",
        email: "person@example.com",
        emailConfirmedAt: "2026-09-26T10:00:00.000Z",
      })
    ).toBe(false);
  });

  it("accepts a verified Study Buddy account through the support guard", async () => {
    const { requireUser } = await import("@/lib/auth");
    vi.mocked(requireUser).mockResolvedValue({
      user: {
        id: "support-3",
        email: "support@studybuddyng.com",
        email_confirmed_at: "2026-09-26T10:00:00.000Z",
      },
      dbUser: { id: "support-3" },
    } as never);
    const { requireMarkingReviewSupport } = await import("./marking-review-support");

    const result = await requireMarkingReviewSupport();
    expect("errorResponse" in result).toBe(false);
  });

  it("returns a non-cacheable 403 for an ordinary learner", async () => {
    const { requireUser } = await import("@/lib/auth");
    vi.mocked(requireUser).mockResolvedValue({
      user: {
        id: "learner-1",
        email: "learner@example.com",
        email_confirmed_at: "2026-09-26T10:00:00.000Z",
      },
      dbUser: { id: "learner-1" },
    } as never);
    const { requireMarkingReviewSupport } = await import("./marking-review-support");

    const result = await requireMarkingReviewSupport();
    expect("errorResponse" in result).toBe(true);
    if (!("errorResponse" in result)) return;
    expect(result.errorResponse).toBeDefined();
    if (!result.errorResponse) throw new Error("Expected an error response");
    expect(result.errorResponse.status).toBe(403);
    expect(result.errorResponse.headers.get("cache-control")).toBe("no-store");
  });
});
