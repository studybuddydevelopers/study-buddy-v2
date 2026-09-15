import { describe, expect, it } from "vitest";
import {
  getWrittenSubmissionError,
  validateWrittenScores,
  type WrittenExamAnswer,
} from "./mock-exam-written";

function buildAnswers(): WrittenExamAnswer[] {
  return [
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `part-i-${index}`,
      section: "PART_I",
      userAnswer: "working",
      maxScore: 8,
    })),
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `part-ii-${index}`,
      section: "PART_II",
      userAnswer: index < 5 ? "working" : "",
      maxScore: 12,
    })),
  ];
}

describe("written mock-exam validation", () => {
  it("accepts five compulsory and exactly five optional answers", () => {
    expect(getWrittenSubmissionError(buildAnswers())).toBeNull();
  });

  it("rejects a missing compulsory answer", () => {
    const answers = buildAnswers();
    answers[2].userAnswer = "";
    expect(getWrittenSubmissionError(answers)).toContain("all five compulsory");
  });

  it("rejects more than five Part II answers", () => {
    const answers = buildAnswers();
    answers[12].userAnswer = "extra answer";
    expect(getWrittenSubmissionError(answers)).toContain("exactly five");
  });

  it("accepts a complete whole-number self-assessment", () => {
    const answers = buildAnswers();
    const attempted = answers.filter((answer) => answer.userAnswer);
    const result = validateWrittenScores(
      answers,
      attempted.map((answer) => ({
        answerId: answer.id,
        score: answer.maxScore,
      }))
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scores).toHaveLength(10);
      expect(result.scores.reduce((sum, item) => sum + item.score, 0)).toBe(100);
    }
  });

  it("rejects scores above the question maximum", () => {
    const answers = buildAnswers();
    const attempted = answers.filter((answer) => answer.userAnswer);
    const scores = attempted.map((answer) => ({
      answerId: answer.id,
      score: answer.maxScore,
    }));
    scores[0].score = 9;

    expect(validateWrittenScores(answers, scores)).toEqual({
      ok: false,
      error: "Scores must be whole numbers between 0 and 8.",
    });
  });
});
