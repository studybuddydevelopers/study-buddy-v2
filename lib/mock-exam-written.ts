export type WrittenExamSection = "PART_I" | "PART_II";

export interface WrittenExamAnswer {
  id: string;
  section: string;
  userAnswer: string | null;
  maxScore: number;
}

export const REQUIRED_PART_I_ANSWERS = 5;
export const REQUIRED_PART_II_ANSWERS = 5;

const hasResponse = (answer: WrittenExamAnswer) =>
  Boolean(answer.userAnswer?.trim());

export function getWrittenSubmissionError(
  answers: WrittenExamAnswer[]
): string | null {
  const partI = answers.filter((answer) => answer.section === "PART_I");
  const partII = answers.filter((answer) => answer.section === "PART_II");

  if (
    partI.length !== REQUIRED_PART_I_ANSWERS ||
    partII.length < REQUIRED_PART_II_ANSWERS
  ) {
    return "This written-paper template is incomplete. Please start a new mock exam.";
  }

  if (!partI.every(hasResponse)) {
    return "Answer all five compulsory Part I questions before submitting.";
  }

  const attemptedPartII = partII.filter(hasResponse).length;
  if (attemptedPartII !== REQUIRED_PART_II_ANSWERS) {
    return `Answer exactly five Part II questions. You currently have ${attemptedPartII} answered.`;
  }

  return null;
}

export function getScoredWrittenAnswers(answers: WrittenExamAnswer[]) {
  return answers.filter(
    (answer) => answer.section === "PART_I" ||
      (answer.section === "PART_II" && hasResponse(answer))
  );
}

export function validateWrittenScores(
  answers: WrittenExamAnswer[],
  scores: Array<{ answerId: string; score: number }>
):
  | { ok: true; scores: Array<{ answerId: string; score: number }> }
  | { ok: false; error: string } {
  const submissionError = getWrittenSubmissionError(answers);
  if (submissionError) return { ok: false, error: submissionError };

  const scoredAnswers = getScoredWrittenAnswers(answers);
  const answerById = new Map(scoredAnswers.map((answer) => [answer.id, answer]));
  const scoreById = new Map<string, number>();

  for (const entry of scores) {
    if (scoreById.has(entry.answerId)) {
      return { ok: false, error: "Each answer can only be scored once." };
    }

    const answer = answerById.get(entry.answerId);
    if (!answer) {
      return { ok: false, error: "A score was supplied for an invalid answer." };
    }

    if (
      !Number.isInteger(entry.score) ||
      entry.score < 0 ||
      entry.score > answer.maxScore
    ) {
      return {
        ok: false,
        error: `Scores must be whole numbers between 0 and ${answer.maxScore}.`,
      };
    }

    scoreById.set(entry.answerId, entry.score);
  }

  if (scoreById.size !== scoredAnswers.length) {
    return { ok: false, error: "Score every attempted question before finishing." };
  }

  return {
    ok: true,
    scores: scoredAnswers.map((answer) => ({
      answerId: answer.id,
      score: scoreById.get(answer.id)!,
    })),
  };
}
