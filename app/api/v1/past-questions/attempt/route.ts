// app/api/v1/past-questions/attempt/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

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
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;

  const questionId =
    typeof parsedBody.data.questionId === "string"
      ? parsedBody.data.questionId
      : undefined;
  const userAnswer =
    typeof parsedBody.data.userAnswer === "string"
      ? parsedBody.data.userAnswer
      : "";
  const timeTakenSeconds =
    typeof parsedBody.data.timeTakenSeconds === "number" &&
    Number.isFinite(parsedBody.data.timeTakenSeconds)
      ? parsedBody.data.timeTakenSeconds
      : null;

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
