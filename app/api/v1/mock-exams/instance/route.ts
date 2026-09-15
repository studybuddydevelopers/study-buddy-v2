// app/api/v1/mock-exams/instance/route.ts
import { NextResponse } from "next/server";
import { MockExamFormat } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildMockExamMcqChoices } from "@/lib/mock-exam-multiple-choice";

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
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
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

  const poolRows =
    instance.template.format === MockExamFormat.OBJECTIVE
      ? await prisma.pastQuestion.findMany({
          where: {
            subjectId: instance.template.subjectId,
            OR: [
              { questionNumber: null },
              { questionNumber: { not: { startsWith: "P2-" } } },
            ],
          },
          select: { answerText: true },
        })
      : [];
  const subjectAnswerPool = poolRows.map((row) => row.answerText);

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
      format: instance.template.format,
      durationMinutes: instance.template.durationMinutes,
      totalMarks: instance.template.totalMarks,
      requiredQuestionCount: instance.template.requiredQuestionCount,
      subject: instance.template.subject,
    },
    questions: instance.answers.map((a) => ({
      id: a.question.id,
      questionText: a.question.questionText,
      questionImageUrl: a.question.questionImageUrl,
      year: a.question.year,
      questionNumber: a.question.questionNumber,
      difficulty: a.question.difficulty,
      choices:
        instance.template.format === MockExamFormat.OBJECTIVE
          ? buildMockExamMcqChoices({
              correctAnswer: a.question.answerText,
              answerPool: subjectAnswerPool,
              instanceId: instance.id,
              questionId: a.question.id,
            })
          : undefined,
    })),
    answers: instance.answers.map((a) => ({
      id: a.id,
      pastQuestionId: a.pastQuestionId,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
      score: a.score,
      correctAnswer: a.question.answerText,
      markingGuide: a.question.explanationText,
      section: a.section,
      displayOrder: a.displayOrder,
      maxScore: a.maxScore,
    })),
  };

  return NextResponse.json(response);
}
