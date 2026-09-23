import type { MarkingReviewStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { markingReviewStatusLabel } from "@/lib/marking-review";
import { requireMarkingReviewSupport } from "@/lib/marking-review-support";
import { prisma } from "@/lib/prisma";

const noStore = { "Cache-Control": "no-store" };

const supportReviewInclude = {
  learner: {
    select: {
      profile: {
        select: { firstName: true, lastNames: true },
      },
    },
  },
  events: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    select: {
      id: true,
      eventType: true,
      actorType: true,
      previousScore: true,
      newScore: true,
      note: true,
      createdAt: true,
    },
  },
} satisfies Prisma.MockExamMarkingReviewInclude;

function supportCase(
  review: Prisma.MockExamMarkingReviewGetPayload<{
    include: typeof supportReviewInclude;
  }>
) {
  const profile = review.learner.profile;
  return {
    id: review.id,
    reference: review.reference,
    status: review.status,
    statusLabel: markingReviewStatusLabel(review.status),
    learnerName: profile
      ? `${profile.firstName} ${profile.lastNames}`.trim()
      : "Study Buddy learner",
    examInstanceId: review.mockExamInstanceId,
    examHref: `/exams/${review.mockExamInstanceId}`,
    paperTitle: review.paperTitleSnapshot,
    subjectName: review.subjectNameSnapshot,
    questionReference: review.questionReferenceSnapshot,
    questionText: review.questionTextSnapshot,
    learnerAnswer: review.learnerAnswerSnapshot,
    modelAnswer: review.modelAnswerSnapshot,
    markingGuide: review.markingGuideSnapshot,
    aiRationale: review.aiRationaleSnapshot,
    learnerReason: review.learnerReason,
    originalScore: review.originalScore,
    revisedScore: review.revisedScore,
    currentScore: review.revisedScore ?? review.originalScore,
    maxScore: review.maxScore,
    resolutionNote: review.resolutionNote,
    submittedAt: review.submittedAt,
    resolvedAt: review.resolvedAt,
    events: review.events,
  };
}

export async function GET(request: Request) {
  const auth = await requireMarkingReviewSupport();
  if ("errorResponse" in auth) return auth.errorResponse;

  const requestedStatus = new URL(request.url).searchParams.get("status") ?? "PENDING";
  let statusWhere: Prisma.EnumMarkingReviewStatusFilter | MarkingReviewStatus | undefined;
  if (requestedStatus === "RESOLVED") {
    statusWhere = { in: ["UPHELD", "MARK_ADJUSTED"] };
  } else if (requestedStatus === "ALL") {
    statusWhere = undefined;
  } else {
    statusWhere = "PENDING";
  }

  const reviews = await prisma.mockExamMarkingReview.findMany({
    where: statusWhere ? { status: statusWhere } : undefined,
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: 100,
    include: supportReviewInclude,
  });

  return NextResponse.json(
    { reviews: reviews.map(supportCase) },
    { headers: noStore }
  );
}
