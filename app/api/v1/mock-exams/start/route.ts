// app/api/v1/mock-exams/start/route.ts
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
  const templateId = body?.templateId;

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
    where: { subjectId: template.subjectId },
  });

  if (allQuestions.length < template.questionCount) {
    return NextResponse.json(
      {
        error: `Not enough questions available for subject. Needed ${template.questionCount}, found ${allQuestions.length}`,
      },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 5. RANDOMLY SELECT QUESTIONS
  // -------------------------------------
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, template.questionCount);

  // -------------------------------------
  // 6. CREATE EXAM INSTANCE
  // -------------------------------------
  const instance = await prisma.mockExamInstance.create({
    data: {
      userId: dbUser.id,
      templateId,
    },
  });

  // -------------------------------------
  // 7. CREATE ANSWER ROWS FOR EACH QUESTION
  // -------------------------------------
  const answerRows = await prisma.$transaction(
    selected.map((q) =>
      prisma.mockExamAnswer.create({
        data: {
          mockExamInstanceId: instance.id,
          pastQuestionId: q.id,
        },
      })
    )
  );

  // -------------------------------------
  // 8. FORMAT RETURN DATA
  // -------------------------------------
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
    })),
    answers: answerRows.map((a) => ({
      id: a.id,
      pastQuestionId: a.pastQuestionId,
      userAnswer: null,
      isCorrect: null,
      score: null,
    })),
  };

  // -------------------------------------
  // 9. RETURN
  // -------------------------------------
  return NextResponse.json(response);
}
