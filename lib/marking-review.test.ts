import { describe, expect, it } from "vitest";
import {
  calculateScorePercentage,
  createMarkingReviewReference,
  markingReviewStatusLabel,
  validateMarkingReviewReason,
  validateMarkingReviewResolution,
} from "./marking-review";

describe("marking review helpers", () => {
  it("creates a non-identifying dated reference", () => {
    expect(
      createMarkingReviewReference(
        "a12b34cd-0000-0000-0000-000000000000",
        new Date("2026-09-23T10:30:00.000Z")
      )
    ).toBe("SBMR-20260923-A12B34CD0000");
  });

  it("validates learner reasons", () => {
    expect(validateMarkingReviewReason("too short").ok).toBe(false);
    expect(validateMarkingReviewReason("  The method earned two more marks.  ")).toEqual({
      ok: true,
      reason: "The method earned two more marks.",
    });
  });

  it("accepts an upheld mark without a replacement score", () => {
    expect(
      validateMarkingReviewResolution({
        decision: "UPHOLD",
        score: undefined,
        note: "The original marking guide was applied correctly.",
        currentScore: 6,
        maxScore: 8,
      })
    ).toMatchObject({ ok: true, decision: "UPHOLD", score: 6 });
  });

  it("rejects unchanged, fractional and out-of-range adjusted marks", () => {
    const input = {
      decision: "ADJUST",
      note: "A method mark was missed.",
      currentScore: 6,
      maxScore: 8,
    } as const;

    expect(validateMarkingReviewResolution({ ...input, score: 6 }).ok).toBe(false);
    expect(validateMarkingReviewResolution({ ...input, score: 6.5 }).ok).toBe(false);
    expect(validateMarkingReviewResolution({ ...input, score: 9 }).ok).toBe(false);
    expect(validateMarkingReviewResolution({ ...input, score: 7 })).toMatchObject({
      ok: true,
      score: 7,
    });
  });

  it("labels each persisted status and clamps percentages", () => {
    expect(markingReviewStatusLabel("PENDING")).toBe("Pending review");
    expect(markingReviewStatusLabel("UPHELD")).toBe("Original mark approved");
    expect(markingReviewStatusLabel("MARK_ADJUSTED")).toBe("Mark changed");
    expect(calculateScorePercentage(83, 100)).toBe(83);
    expect(calculateScorePercentage(11, 10)).toBe(100);
    expect(calculateScorePercentage(1, 0)).toBe(0);
  });
});
