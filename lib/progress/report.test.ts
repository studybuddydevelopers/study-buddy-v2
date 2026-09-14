import { describe, expect, it } from "vitest";
import {
  buildProgressMilestones,
  buildProgressTrend,
  getProgressPeriod,
  parseProgressRange,
} from "./report";

describe("progress report ranges", () => {
  it("defaults invalid values to 30 days", () => {
    expect(parseProgressRange(undefined)).toBe("30d");
    expect(parseProgressRange("year")).toBe("30d");
    expect(parseProgressRange("7d")).toBe("7d");
  });

  it("includes today and the preceding range days", () => {
    const period = getProgressPeriod("7d", new Date("2026-09-14T18:45:00Z"));

    expect(period.start.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    expect(period.endExclusive.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });
});

describe("buildProgressTrend", () => {
  it("fills missing days and calculates practice and mock measures separately", () => {
    const trend = buildProgressTrend(
      "7d",
      new Date("2026-09-14T18:45:00Z"),
      [
        { date: "2026-09-08", attempted: 4, correct: 3 },
        { date: "2026-09-14", attempted: 2, correct: 1 },
      ],
      [
        {
          date: "2026-09-14",
          completed: 2,
          scorePercentTotal: 130,
        },
      ]
    );

    expect(trend).toHaveLength(7);
    expect(trend[0]).toMatchObject({
      startDate: "2026-09-08",
      questionsAttempted: 4,
      accuracyPct: 75,
      mockExamsCompleted: 0,
      averageMockScorePct: null,
    });
    expect(trend[6]).toMatchObject({
      startDate: "2026-09-14",
      questionsAttempted: 2,
      accuracyPct: 50,
      mockExamsCompleted: 2,
      averageMockScorePct: 65,
    });
  });

  it("uses compact buckets for longer ranges", () => {
    expect(
      buildProgressTrend("30d", new Date("2026-09-14T12:00:00Z"), [], [])
    ).toHaveLength(10);
    expect(
      buildProgressTrend("90d", new Date("2026-09-14T12:00:00Z"), [], [])
    ).toHaveLength(13);
  });
});

describe("buildProgressMilestones", () => {
  it("returns only the highest calm milestone in each category", () => {
    expect(
      buildProgressMilestones({
        distinctQuestionsPracticed: 27,
        topicsWithPractice: 6,
        mockExamsCompleted: 3,
      }).map((milestone) => milestone.title)
    ).toEqual([
      "25 different questions explored",
      "5 topics started",
      "3 mock exams completed",
    ]);
  });
});
