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

  it("allows only explicitly configured stable user IDs", async () => {
    const { isMarkingReviewSupportUser } = await import("./marking-review-support");
    expect(isMarkingReviewSupportUser("support-1")).toBe(true);
    expect(isMarkingReviewSupportUser("learner-1")).toBe(false);
  });

  it("returns a non-cacheable 403 for an ordinary learner", async () => {
    const { requireUser } = await import("@/lib/auth");
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: "learner-1" },
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
