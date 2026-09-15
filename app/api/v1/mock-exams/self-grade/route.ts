import { MockExamFormat } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateWrittenScores } from "@/lib/mock-exam-written";
import { prisma } from "@/lib/prisma";
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
      : null;
  const scoresInput = parsedBody.data.scores;

  if (!instanceId || !Array.isArray(scoresInput)) {
    return NextResponse.json(
      { error: "instanceId and scores are required" },
      { status: 400 }
    );
  }

  const scores: Array<{ answerId: string; score: number }> = [];
  for (const entry of scoresInput) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      !("answerId" in entry) ||
      typeof entry.answerId !== "string" ||
      !("score" in entry) ||
      typeof entry.score !== "number"
    ) {
      return NextResponse.json(
        { error: "Each score must include answerId and a numeric score" },
        { status: 400 }
      );
    }
    scores.push({ answerId: entry.answerId, score: entry.score });
  }

  const instance = await prisma.mockExamInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: { select: { format: true, totalMarks: true } },
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

  if (instance.template.format !== MockExamFormat.WRITTEN) {
    return NextResponse.json(
      { error: "Only written mock exams can be self-assessed" },
      { status: 400 }
    );
  }

  if (!instance.submittedAt) {
    return NextResponse.json(
      { error: "Submit the written paper before scoring it" },
      { status: 400 }
    );
  }

  if (instance.graded) {
    return NextResponse.json(
      { error: "This written paper has already been scored" },
      { status: 400 }
    );
  }

  const validation = validateWrittenScores(instance.answers, scores);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const totalScore = validation.scores.reduce(
    (sum, answer) => sum + answer.score,
    0
  );
  const totalMarks = instance.template.totalMarks ?? 100;
  if (totalScore > totalMarks) {
    return NextResponse.json(
      { error: "The supplied scores exceed the total marks for this paper" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    ...validation.scores.map((answer) => {
      const source = instance.answers.find(
        (item) => item.id === answer.answerId
      )!;
      return prisma.mockExamAnswer.update({
        where: { id: answer.answerId },
        data: {
          score: answer.score,
          isCorrect: answer.score === source.maxScore,
        },
      });
    }),
    prisma.mockExamInstance.update({
      where: { id: instanceId },
      data: { totalScore, graded: true },
    }),
  ]);

  return NextResponse.json({
    instanceId,
    totalScore,
    totalMarks,
    graded: true,
    answers: validation.scores.map((answer) => ({
      id: answer.answerId,
      score: answer.score,
    })),
  });
}
