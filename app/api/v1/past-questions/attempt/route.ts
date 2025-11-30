// app/api/v1/past-questions/attempt/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE INPUT
  // -------------------------------------
  const body = await req.json().catch(() => null);

  const questionId = body?.questionId;
  const userAnswer = body?.userAnswer ?? "";
  const timeTakenSeconds = body?.timeTakenSeconds ?? null;

  if (!questionId) {
    return NextResponse.json(
      { error: "questionId is required" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. FETCH QUESTION
  // -------------------------------------
  const question = await prisma.pastQuestion.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return NextResponse.json(
      { error: "Past question not found" },
      { status: 404 }
    );
  }

  // -------------------------------------
  // 4. GRADE ATTEMPT
  // -------------------------------------
  const correctAnswer = question.answerText.trim().toLowerCase();
  const cleanedUserAnswer = (userAnswer || "").trim().toLowerCase();

  const isCorrect = cleanedUserAnswer === correctAnswer;
  const score = isCorrect ? 1 : 0;

  // -------------------------------------
  // 5. SAVE ATTEMPT TO DB
  // -------------------------------------
  const attempt = await prisma.pastQuestionAttempt.create({
    data: {
      userId: dbUser.id,
      questionId,
      userAnswer,
      isCorrect,
      score,
      timeTakenSeconds: timeTakenSeconds ?? null,
    },
  });

  // -------------------------------------
  // 6. RETURN RESPONSE
  // -------------------------------------
  return NextResponse.json({
    attemptId: attempt.id,
    questionId: attempt.questionId,
    isCorrect: attempt.isCorrect,
    score: attempt.score,
    timeTakenSeconds: attempt.timeTakenSeconds,
    attemptedAt: attempt.attemptedAt,
  });
}
