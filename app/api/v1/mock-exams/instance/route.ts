// app/api/v1/mock-exams/instance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const instanceId = url.searchParams.get("instanceId");

  if (!instanceId) {
    return NextResponse.json(
      { error: "instanceId is required" },
      { status: 400 }
    );
  }

  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const instance = await prisma.mockExamInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: {
        include: {
          subject: {
            select: { id: true, name: true },
          },
        },
      },
      answers: {
        orderBy: { id: "asc" },
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = {
    instance: {
      id: instance.id,
      templateId: instance.templateId,
      startedAt: instance.startedAt,
      submittedAt: instance.submittedAt,
      graded: instance.graded,
      totalScore: instance.totalScore,
    },
    template: {
      id: instance.template.id,
      subjectId: instance.template.subjectId,
      title: instance.template.title,
      description: instance.template.description,
      questionCount: instance.template.questionCount,
      subject: instance.template.subject,
    },
    questions: instance.answers.map((a) => ({
      id: a.question.id,
      questionText: a.question.questionText,
      questionImageUrl: a.question.questionImageUrl,
      year: a.question.year,
      questionNumber: a.question.questionNumber,
      difficulty: a.question.difficulty,
    })),
    answers: instance.answers.map((a) => ({
      id: a.id,
      pastQuestionId: a.pastQuestionId,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
      score: a.score,
      correctAnswer: a.question.answerText,
    })),
  };

  return NextResponse.json(response);
}
