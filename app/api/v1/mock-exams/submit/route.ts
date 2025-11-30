// app/api/v1/mock-exams/submit/route.ts
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
  const answers = body?.answers;

  if (!instanceId) {
    return NextResponse.json(
      { error: "instanceId is required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json(
      { error: "answers must be a non-empty array" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. LOAD INSTANCE
  // -------------------------------------
  const instance = await prisma.mockExamInstance.findUnique({
    where: { id: instanceId },
    include: {
      answers: true,
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

  if (instance.submittedAt) {
    return NextResponse.json(
      { error: "Exam already submitted" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 4. VALIDATE ANSWERS
  // -------------------------------------
  const answerMap = new Map(
    instance.answers.map((a) => [a.id, a])
  );

  for (const { answerId, userAnswer } of answers) {
    if (!answerId || typeof userAnswer !== "string") {
      return NextResponse.json(
        { error: "Each answer must include answerId and userAnswer" },
        { status: 400 }
      );
    }

    if (!answerMap.has(answerId)) {
      return NextResponse.json(
        { error: `Invalid answerId: ${answerId}` },
        { status: 400 }
      );
    }
  }

  // -------------------------------------
  // 5. UPDATE ANSWERS + SUBMISSION TIME
  // -------------------------------------
  await prisma.$transaction([
    // update each answer
    ...answers.map(({ answerId, userAnswer }) =>
      prisma.mockExamAnswer.update({
        where: { id: answerId },
        data: { userAnswer },
      })
    ),

    // mark instance as submitted
    prisma.mockExamInstance.update({
      where: { id: instanceId },
      data: {
        submittedAt: new Date(),
      },
    }),
  ]);

  // -------------------------------------
  // 6. RETURN UPDATED ANSWERS
  // -------------------------------------
  const updated = await prisma.mockExamInstance.findUnique({
    where: { id: instanceId },
    include: {
      answers: true,
    },
  });

  return NextResponse.json({
    instanceId: updated!.id,
    submittedAt: updated!.submittedAt,
    answers: updated!.answers.map((a) => ({
      id: a.id,
      pastQuestionId: a.pastQuestionId,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect, // still null, grading is separate
      score: a.score,         // still null
    })),
  });
}
