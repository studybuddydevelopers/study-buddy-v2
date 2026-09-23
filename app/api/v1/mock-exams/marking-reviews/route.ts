import { randomUUID } from "node:crypto";
import { MockExamFormat, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  createMarkingReviewReference,
  markingReviewStatusLabel,
  validateMarkingReviewReason,
} from "@/lib/marking-review";
import { prisma } from "@/lib/prisma";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

const noStore = { "Cache-Control": "no-store" };

function learnerCase(review: {
  id: string;
  reference: string;
  status: "PENDING" | "UPHELD" | "MARK_ADJUSTED";
  mockExamInstanceId: string;
  questionReferenceSnapshot: string;
  paperTitleSnapshot: string;
  subjectNameSnapshot: string;
  originalScore: number;
  revisedScore: number | null;
  maxScore: number;
  resolutionNote: string | null;
  submittedAt: Date;
  resolvedAt: Date | null;
}) {
  return {
    id: review.id,
    reference: review.reference,
    status: review.status,
    statusLabel: markingReviewStatusLabel(review.status),
    examInstanceId: review.mockExamInstanceId,
    examHref: `/exams/${review.mockExamInstanceId}`,
    paperTitle: review.paperTitleSnapshot,
    subjectName: review.subjectNameSnapshot,
    questionReference: review.questionReferenceSnapshot,
    originalScore: review.originalScore,
    revisedScore: review.revisedScore,
    currentScore: review.revisedScore ?? review.originalScore,
    maxScore: review.maxScore,
    resolutionNote: review.resolutionNote,
    submittedAt: review.submittedAt,
    resolvedAt: review.resolvedAt,
  };
}

const learnerCaseSelect = {
  id: true,
  reference: true,
  status: true,
  mockExamInstanceId: true,
  questionReferenceSnapshot: true,
  paperTitleSnapshot: true,
  subjectNameSnapshot: true,
  originalScore: true,
  revisedScore: true,
  maxScore: true,
  resolutionNote: true,
  submittedAt: true,
  resolvedAt: true,
} satisfies Prisma.MockExamMarkingReviewSelect;

export async function GET() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const reviews = await prisma.mockExamMarkingReview.findMany({
    where: { userId: auth.dbUser.id },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: learnerCaseSelect,
  });

  return NextResponse.json(
    { reviews: reviews.map(learnerCase) },
    { headers: noStore }
  );
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsedBody = await parseJsonObjectRequest(request);
  if (!parsedBody.ok) return parsedBody.response;

  const answerId =
    typeof parsedBody.data.answerId === "string"
      ? parsedBody.data.answerId.trim()
      : "";
  if (!answerId) {
    return NextResponse.json(
      { error: "Choose a marked answer to review." },
      { status: 400, headers: noStore }
    );
  }

  const reasonResult = validateMarkingReviewReason(parsedBody.data.reason);
  if (!reasonResult.ok) {
    return NextResponse.json(
      { error: reasonResult.error },
      { status: 400, headers: noStore }
    );
  }

  const answer = await prisma.mockExamAnswer.findUnique({
    where: { id: answerId },
    include: {
      markingReview: { select: learnerCaseSelect },
      question: {
        select: {
          questionText: true,
          questionNumber: true,
          answerText: true,
          explanationText: true,
        },
      },
      instance: {
        include: {
          template: {
            include: { subject: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!answer || answer.instance.userId !== auth.dbUser.id) {
    return NextResponse.json(
      { error: "Marked answer not found." },
      { status: 404, headers: noStore }
    );
  }
  if (answer.markingReview) {
    return NextResponse.json(
      {
        error: "A review case already exists for this answer.",
        review: learnerCase(answer.markingReview),
      },
      { status: 409, headers: noStore }
    );
  }
  if (
    answer.instance.template.format !== MockExamFormat.WRITTEN ||
    !answer.instance.graded ||
    answer.score === null ||
    !answer.userAnswer?.trim() ||
    !answer.aiExplanation?.trim()
  ) {
    return NextResponse.json(
      { error: "Only a completed AI-marked written answer can be reviewed." },
      { status: 400, headers: noStore }
    );
  }

  const reviewId = randomUUID();
  const reference = createMarkingReviewReference(reviewId);
  const sectionLabel = answer.section === "PART_I" ? "Part I" : "Part II";
  const position =
    answer.question.questionNumber ??
    (answer.displayOrder == null ? "Question" : `Question ${answer.displayOrder}`);

  try {
    const review = await prisma.mockExamMarkingReview.create({
      data: {
        id: reviewId,
        reference,
        userId: auth.dbUser.id,
        mockExamInstanceId: answer.mockExamInstanceId,
        mockExamAnswerId: answer.id,
        learnerReason: reasonResult.reason,
        originalScore: answer.score,
        maxScore: answer.maxScore,
        paperTitleSnapshot: answer.instance.template.title,
        subjectNameSnapshot: answer.instance.template.subject.name,
        questionReferenceSnapshot: `${sectionLabel} · ${position}`,
        questionTextSnapshot: answer.question.questionText,
        learnerAnswerSnapshot: answer.userAnswer,
        modelAnswerSnapshot: answer.question.answerText,
        markingGuideSnapshot:
          answer.question.explanationText ?? "No marking guide was provided.",
        aiRationaleSnapshot: answer.aiExplanation,
        events: {
          create: {
            eventType: "SUBMITTED",
            actorType: "LEARNER",
            actorUserId: auth.dbUser.id,
            previousScore: answer.score,
            newScore: answer.score,
            note: reasonResult.reason,
          },
        },
      },
      select: learnerCaseSelect,
    });

    return NextResponse.json(
      { review: learnerCase(review) },
      { status: 201, headers: noStore }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.mockExamMarkingReview.findUnique({
        where: { mockExamAnswerId: answer.id },
        select: learnerCaseSelect,
      });
      return NextResponse.json(
        {
          error: "A review case already exists for this answer.",
          ...(existing ? { review: learnerCase(existing) } : {}),
        },
        { status: 409, headers: noStore }
      );
    }
    throw error;
  }
}
