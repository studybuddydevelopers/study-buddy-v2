// app/api/v1/mock-exams/start/route.ts
import { NextResponse } from "next/server";
import { MockExamFormat, MockExamSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildMockExamMcqChoices } from "@/lib/mock-exam-multiple-choice";
import { WRITTEN_MOCK_AI_CREDIT_COST } from "@/lib/mock-exam-ai-credits";
import { parseJsonObjectRequest } from "@/lib/security/request-body";
import { reserveDailyAiCredits } from "@/lib/security/rate-limit";

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
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const templateId =
    typeof parsedBody.data.templateId === "string"
      ? parsedBody.data.templateId
      : undefined;

  if (!templateId) {
    return NextResponse.json(
      { error: "templateId is required" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. LOAD TEMPLATE
  // -------------------------------------
  const template = await prisma.mockExamTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Mock exam template not found" },
      { status: 404 }
    );
  }

  // -------------------------------------
  // 4. FETCH QUESTIONS FOR SUBJECT
  // -------------------------------------
  const allQuestions = await prisma.pastQuestion.findMany({
    where: {
      subjectId: template.subjectId,
      ...(template.format === MockExamFormat.WRITTEN
        ? { questionNumber: { startsWith: "P2-" } }
        : {
            OR: [
              { questionNumber: null },
              { questionNumber: { not: { startsWith: "P2-" } } },
            ],
          }),
    },
    orderBy:
      template.format === MockExamFormat.WRITTEN
        ? { questionNumber: "asc" }
        : undefined,
  });

  if (allQuestions.length < template.questionCount) {
    return NextResponse.json(
      {
        error: `Not enough questions available for subject. Needed ${template.questionCount}, found ${allQuestions.length}`,
      },
      { status: 400 }
    );
  }

  if (template.format === MockExamFormat.WRITTEN) {
    if (!dbUser.aiAccessAuthorized) {
      return NextResponse.json(
        {
          error: "AI_AUTHORIZATION_REQUIRED",
          message:
            "AI access must be authorised before starting a written mock exam.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const creditResponse = await reserveDailyAiCredits(
      dbUser.id,
      WRITTEN_MOCK_AI_CREDIT_COST,
      `You need at least ${WRITTEN_MOCK_AI_CREDIT_COST} AI credits to start this written mock exam. Your daily credits reset tomorrow.`
    );
    if (creditResponse) return creditResponse;
  }

  // -------------------------------------
  // 5. RANDOMLY SELECT QUESTIONS
  // -------------------------------------
  const selected =
    template.format === MockExamFormat.WRITTEN
      ? allQuestions.slice(0, template.questionCount)
      : [...allQuestions]
          .sort(() => Math.random() - 0.5)
          .slice(0, template.questionCount);

  // -------------------------------------
  // 6. CREATE EXAM INSTANCE
  // -------------------------------------
  const instance = await prisma.mockExamInstance.create({
    data: {
      userId: dbUser.id,
      templateId,
      aiCreditReservedAt:
        template.format === MockExamFormat.WRITTEN ? new Date() : null,
    },
  });

  // -------------------------------------
  // 7. CREATE ANSWER ROWS FOR EACH QUESTION
  // -------------------------------------
  const answerRows = await prisma.$transaction(
    selected.map((q, index) =>
      prisma.mockExamAnswer.create({
        data: {
          mockExamInstanceId: instance.id,
          pastQuestionId: q.id,
          section:
            template.format === MockExamFormat.WRITTEN
              ? q.questionNumber?.startsWith("P2-I-")
                ? MockExamSection.PART_I
                : MockExamSection.PART_II
              : MockExamSection.OBJECTIVE,
          displayOrder: index + 1,
          maxScore:
            template.format === MockExamFormat.WRITTEN
              ? q.questionNumber?.startsWith("P2-I-")
                ? 8
                : 12
              : 1,
        },
      })
    )
  );

  // -------------------------------------
  // 8. FORMAT RETURN DATA
  // -------------------------------------
  const answerPool =
    template.format === MockExamFormat.OBJECTIVE
      ? allQuestions.map((q) => q.answerText)
      : [];

  const response = {
    instance: {
      id: instance.id,
      startedAt: instance.startedAt,
      graded: instance.graded,
      totalScore: instance.totalScore,
    },
    questions: selected.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl,
      answerText: null, // don't send correct answer
      explanationText: null,
      year: q.year,
      questionNumber: q.questionNumber,
      difficulty: q.difficulty,
      topicId: q.topicId,
      choices:
        template.format === MockExamFormat.OBJECTIVE
          ? buildMockExamMcqChoices({
              correctAnswer: q.answerText,
              answerPool,
              instanceId: instance.id,
              questionId: q.id,
            })
          : undefined,
    })),
    answers: answerRows.map((a) => ({
      id: a.id,
      pastQuestionId: a.pastQuestionId,
      userAnswer: null,
      isCorrect: null,
      score: null,
      section: a.section,
      displayOrder: a.displayOrder,
      maxScore: a.maxScore,
    })),
  };

  // -------------------------------------
  // 9. RETURN
  // -------------------------------------
  return NextResponse.json(response);
}
