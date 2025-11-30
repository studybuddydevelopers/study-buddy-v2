// app/api/v1/past-questions/explanation/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  // -------------------------------------
  // 2. INPUT
  // -------------------------------------
  const body = await req.json().catch(() => null);
  const questionId = body?.questionId;

  if (!questionId) {
    return NextResponse.json(
      { error: "questionId is required in body: { questionId: string }" },
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
  // 4. RETURN EXPLANATION
  // -------------------------------------
  return NextResponse.json({
    questionId: question.id,
    questionText: question.questionText,
    questionImageUrl: question.questionImageUrl,
    answerText: question.answerText,
    explanation: question.explanationText?.trim() ?? null,
    subjectId: question.subjectId,
    topicId: question.topicId,
    year: question.year,
    difficulty: question.difficulty,
  });
}
