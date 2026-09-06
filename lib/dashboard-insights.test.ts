import { describe, expect, it } from "vitest";
import {
  deriveTopicInsights,
  getTopicLevel,
  type DashboardTopicInput,
} from "./dashboard-insights";

function topic(
  overrides: Partial<DashboardTopicInput> = {}
): DashboardTopicInput {
  return {
    topicId: "topic-1",
    topicTitle: "Algebra",
    subjectName: "Mathematics",
    totalQuestions: 20,
    attempted: 0,
    correct: 0,
    accuracyPct: 0,
    lastAttemptAt: null,
    ...overrides,
  };
}

describe("deriveTopicInsights", () => {
  it("does not label a topic as a focus area before five distinct questions", () => {
    const result = deriveTopicInsights([
      topic({ attempted: 4, correct: 0, accuracyPct: 0 }),
    ]);

    expect(result.focusTopics).toEqual([]);
    expect(result.recommendedTopic?.reason).toBe("continue");
  });

  it("selects up to three supported focus topics in weakest-first order", () => {
    const result = deriveTopicInsights([
      topic({ topicId: "a", attempted: 6, accuracyPct: 50 }),
      topic({ topicId: "b", attempted: 8, accuracyPct: 25 }),
      topic({ topicId: "c", attempted: 5, accuracyPct: 60 }),
      topic({ topicId: "d", attempted: 9, accuracyPct: 40 }),
    ]);

    expect(result.focusTopics.map((item) => item.topicId)).toEqual([
      "b",
      "d",
      "a",
    ]);
    expect(result.recommendedTopic).toMatchObject({
      topicId: "b",
      reason: "focus",
    });
  });

  it("continues the most recently attempted topic when no focus area qualifies", () => {
    const result = deriveTopicInsights([
      topic({
        topicId: "older",
        attempted: 6,
        accuracyPct: 90,
        lastAttemptAt: "2026-09-01T10:00:00.000Z",
      }),
      topic({
        topicId: "newer",
        attempted: 2,
        accuracyPct: 50,
        lastAttemptAt: "2026-09-02T10:00:00.000Z",
      }),
    ]);

    expect(result.recommendedTopic).toMatchObject({
      topicId: "newer",
      reason: "continue",
    });
  });

  it("offers the first topic with questions to a new learner", () => {
    const result = deriveTopicInsights([
      topic({ topicId: "empty", totalQuestions: 0 }),
      topic({ topicId: "ready", topicTitle: "Fractions" }),
    ]);

    expect(result.recommendedTopic).toMatchObject({
      topicId: "ready",
      reason: "explore",
    });
  });
});

describe("getTopicLevel", () => {
  it("uses neutral progress language instead of exam-readiness claims", () => {
    expect(getTopicLevel({ attempted: 2, accuracyPct: 100 })).toBe("Starting");
    expect(getTopicLevel({ attempted: 5, accuracyPct: 30 })).toBe("Building");
    expect(getTopicLevel({ attempted: 5, accuracyPct: 60 })).toBe("Improving");
    expect(getTopicLevel({ attempted: 5, accuracyPct: 80 })).toBe("Strong");
  });
});
