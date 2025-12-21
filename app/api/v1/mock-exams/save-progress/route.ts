// app/api/v1/mock-exams/save-progress/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const body = await req.json().catch(() => null);
  const instanceId = body?.instanceId;
  const answers = body?.answers;

  if (!instanceId) {
    return NextResponse.json(
      { error: "instanceId is required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(answers)) {
    return NextResponse.json(
      { error: "answers must be an array" },
      { status: 400 }
    );
  }

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (instance.submittedAt || instance.graded) {
    return NextResponse.json(
      { error: "Cannot save progress for a submitted exam" },
      { status: 400 }
    );
  }

  const answerMap = new Map(instance.answers.map((a) => [a.id, a]));

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

  await prisma.$transaction(
    answers.map(({ answerId, userAnswer }: { answerId: string; userAnswer: string }) =>
      prisma.mockExamAnswer.update({
        where: { id: answerId },
        data: { userAnswer },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
