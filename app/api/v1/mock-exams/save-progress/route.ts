// app/api/v1/mock-exams/save-progress/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const instanceId =
    typeof parsedBody.data.instanceId === "string"
      ? parsedBody.data.instanceId
      : undefined;
  const answers = parsedBody.data.answers;

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

  const normalizedAnswers: Array<{ answerId: string; userAnswer: string }> = [];
  for (const answer of answers) {
    if (
      !answer ||
      typeof answer !== "object" ||
      Array.isArray(answer) ||
      !("answerId" in answer) ||
      typeof answer.answerId !== "string" ||
      !("userAnswer" in answer) ||
      typeof answer.userAnswer !== "string"
    ) {
      return NextResponse.json(
        { error: "Each answer must include answerId and userAnswer" },
        { status: 400 }
      );
    }
    const { answerId, userAnswer } = answer;
    if (!answerMap.has(answerId)) {
      return NextResponse.json(
        { error: `Invalid answerId: ${answerId}` },
        { status: 400 }
      );
    }
    normalizedAnswers.push({ answerId, userAnswer });
  }

  await prisma.$transaction(
    normalizedAnswers.map(({ answerId, userAnswer }) =>
      prisma.mockExamAnswer.update({
        where: { id: answerId },
        data: { userAnswer },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
