// app/api/v1/mock-exams/grade/route.ts
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
  // 2. INPUT
  // -------------------------------------
  const body = await req.json().catch(() => null);
  const instanceId = body?.instanceId;

  if (!instanceId) {
    return NextResponse.json(
      { error: "instanceId is required" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. LOAD INSTANCE + ANSWERS
  // -------------------------------------
  const instance = await prisma.mockExamInstance.findUnique({
    where: { id: instanceId },
    include: {
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!instance) {
    return NextResponse.json(
      { error: "Mock exam instance not found" },
      { status: 404 }
    );
  }

  if (instance.userId !== dbUser.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  if (!instance.submittedAt) {
    return NextResponse.json(
      { error: "Cannot grade an exam that has not been submitted" },
      { status: 400 }
    );
  }

  if (instance.graded) {
    return NextResponse.json(
      { error: "Exam is already graded" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 4. GRADE EACH ANSWER
  // -------------------------------------
  const gradedAnswers = [];

  for (const answer of instance.answers) {
    const correctAnswer = answer.question.answerText.trim().toLowerCase();
    const userAnswer = (answer.userAnswer || "").trim().toLowerCase();

    const isCorrect = userAnswer === correctAnswer;
    const score = isCorrect ? 1 : 0;

    gradedAnswers.push({
      id: answer.id,
      isCorrect,
      score,
    });
  }

  const totalScore = gradedAnswers.reduce((sum, a) => sum + a.score, 0);

  // -------------------------------------
  // 5. UPDATE DB (answers + instance)
  // -------------------------------------
  await prisma.$transaction([
    // update all answers
    ...gradedAnswers.map((a) =>
      prisma.mockExamAnswer.update({
        where: { id: a.id },
        data: {
          isCorrect: a.isCorrect,
          score: a.score,
        },
      })
    ),

    // update instance
    prisma.mockExamInstance.update({
      where: { id: instanceId },
      data: {
        totalScore,
        graded: true,
      },
    }),
  ]);

  // -------------------------------------
  // 6. RETURN RESULT
  // -------------------------------------
  return NextResponse.json({
    instanceId,
    totalScore,
    graded: true,
    answers: gradedAnswers,
  });
}
