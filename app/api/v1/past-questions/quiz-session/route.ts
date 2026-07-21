import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MAX_QUESTIONS_PER_SESSION = 200;
const MAX_ANSWER_LENGTH = 10_000;

interface PracticeQuizAnswerPayload {
  questionId: string;
  answerText: string | null;
  submitted: boolean;
  isCorrect: boolean | null;
  answeredAt: Date | null;
  submittedAt: Date | null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAnswers(body: unknown): PracticeQuizAnswerPayload[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const rawAnswers = (body as Record<string, unknown>).answers;
  if (!Array.isArray(rawAnswers) || rawAnswers.length === 0) return null;
  if (rawAnswers.length > MAX_QUESTIONS_PER_SESSION) return null;

  const answersByQuestionId = new Map<string, PracticeQuizAnswerPayload>();

  for (const rawAnswer of rawAnswers) {
    if (!rawAnswer || typeof rawAnswer !== "object" || Array.isArray(rawAnswer)) {
      return null;
    }

    const answer = rawAnswer as Record<string, unknown>;
    if (typeof answer.questionId !== "string" || answer.questionId.length === 0) {
      return null;
    }

    const answerText =
      typeof answer.answerText === "string" ? answer.answerText : null;
    if (answerText != null && answerText.length > MAX_ANSWER_LENGTH) {
      return null;
    }

    const submitted = Boolean(answer.submitted);
    const isCorrect =
      typeof answer.isCorrect === "boolean" ? answer.isCorrect : null;

    answersByQuestionId.set(answer.questionId, {
      questionId: answer.questionId,
      answerText,
      submitted,
      isCorrect: submitted ? isCorrect : null,
      answeredAt: parseDate(answer.answeredAt),
      submittedAt: parseDate(answer.submittedAt),
    });
  }

  return Array.from(answersByQuestionId.values());
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const topicId = record.topicId;
  if (typeof topicId !== "string" || topicId.length === 0) {
    return NextResponse.json({ error: "topicId is required" }, { status: 400 });
  }

  const startedAt = parseDate(record.startedAt);
  const finishedAt = parseDate(record.finishedAt) ?? new Date();
  if (!startedAt) {
    return NextResponse.json(
      { error: "startedAt must be a valid date" },
      { status: 400 }
    );
  }

  const answers = parseAnswers(body);
  if (!answers) {
    return NextResponse.json(
      {
        error:
          "answers must include up to 200 question snapshots with questionId fields",
      },
      { status: 400 }
    );
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { id: true },
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const questionIds = answers.map((answer) => answer.questionId);
  const questions = await prisma.pastQuestion.findMany({
    where: {
      id: { in: questionIds },
      topicId,
    },
    select: { id: true },
  });

  if (questions.length !== questionIds.length) {
    return NextResponse.json(
      { error: "One or more questions were not found for this topic" },
      { status: 400 }
    );
  }

  const answeredQuestions = answers.filter(
    (answer) => (answer.answerText ?? "").trim().length > 0
  ).length;
  const submittedQuestions = answers.filter((answer) => answer.submitted).length;
  const correctQuestions = answers.filter(
    (answer) => answer.submitted && answer.isCorrect === true
  ).length;
  const wrongQuestions = answers.filter(
    (answer) => answer.submitted && answer.isCorrect === false
  ).length;
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const durationSeconds =
    durationMs >= 0 ? Math.max(0, Math.round(durationMs / 1000)) : null;

  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.practiceQuizSession.create({
      data: {
        userId: dbUser.id,
        topicId,
        startedAt,
        finishedAt,
        durationSeconds,
        totalQuestions: answers.length,
        answeredQuestions,
        submittedQuestions,
        correctQuestions,
        wrongQuestions,
      },
      select: { id: true },
    });

    await tx.practiceQuizAnswer.createMany({
      data: answers.map((answer) => ({
        sessionId: createdSession.id,
        questionId: answer.questionId,
        answerText: answer.answerText,
        submitted: answer.submitted,
        isCorrect: answer.isCorrect,
        answeredAt: answer.answeredAt,
        submittedAt: answer.submittedAt,
      })),
    });

    await tx.practiceAnswerDraft.deleteMany({
      where: {
        userId: dbUser.id,
        questionId: { in: questionIds },
      },
    });

    return createdSession;
  });

  return NextResponse.json({
    sessionId: session.id,
    summary: {
      totalQuestions: answers.length,
      answeredQuestions,
      submittedQuestions,
      correctQuestions,
      wrongQuestions,
      durationSeconds,
    },
  });
}
