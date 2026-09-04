// app/api/v1/past-questions/explanation/route.ts
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

  // -------------------------------------
  // 2. INPUT
  // -------------------------------------
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const questionId =
    typeof parsedBody.data.questionId === "string"
      ? parsedBody.data.questionId
      : undefined;

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
  // 4. RETURN EXPLANATION
  // -------------------------------------
  return NextResponse.json({
    questionId: question.id,
    questionText: question.questionText,
    answerText: question.answerText,
    explanation: question.explanationText ?? null,
    subjectId: question.subjectId,
    topicId: question.topicId,
    year: question.year,
    difficulty: question.difficulty,
  });
}
