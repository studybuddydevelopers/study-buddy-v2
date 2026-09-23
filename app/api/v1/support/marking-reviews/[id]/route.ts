import { NextResponse } from "next/server";
import { calculateScorePercentage, validateMarkingReviewResolution } from "@/lib/marking-review";
import { requireMarkingReviewSupport } from "@/lib/marking-review-support";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent, securityFingerprint } from "@/lib/security/audit-log";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

const noStore = { "Cache-Control": "no-store" };

class ReviewNotFoundError extends Error {}
class ReviewAlreadyResolvedError extends Error {}
class InvalidResolutionError extends Error {}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarkingReviewSupport();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { id } = await params;
  const parsedBody = await parseJsonObjectRequest(request);
  if (!parsedBody.ok) return parsedBody.response;

  const existing = await prisma.mockExamMarkingReview.findUnique({
    where: { id },
    include: { answer: { select: { score: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Review case not found." },
      { status: 404, headers: noStore }
    );
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: "This review case has already been resolved." },
      { status: 409, headers: noStore }
    );
  }

  const validation = validateMarkingReviewResolution({
    decision: parsedBody.data.decision,
    score: parsedBody.data.score,
    note: parsedBody.data.note,
    currentScore: existing.answer.score ?? existing.originalScore,
    maxScore: existing.maxScore,
  });
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400, headers: noStore }
    );
  }

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const review = await transaction.mockExamMarkingReview.findUnique({
        where: { id },
        include: {
          answer: { select: { score: true } },
          instance: { include: { template: true } },
        },
      });
      if (!review) throw new ReviewNotFoundError();
      if (review.status !== "PENDING") throw new ReviewAlreadyResolvedError();

      const currentScore = review.answer.score ?? review.originalScore;
      const checked = validateMarkingReviewResolution({
        decision: validation.decision,
        score: validation.score,
        note: validation.note,
        currentScore,
        maxScore: review.maxScore,
      });
      if (!checked.ok) throw new InvalidResolutionError(checked.error);

      const adjusted = checked.decision === "ADJUST";
      const resolvedAt = new Date();
      const claim = await transaction.mockExamMarkingReview.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: adjusted ? "MARK_ADJUSTED" : "UPHELD",
          revisedScore: adjusted ? checked.score : null,
          resolutionNote: checked.note,
          resolvedAt,
          resolvedByUserId: auth.dbUser.id,
        },
      });
      if (claim.count !== 1) throw new ReviewAlreadyResolvedError();

      let paperTotal = review.instance.totalScore ?? 0;
      let progressRecalculated = false;
      if (adjusted) {
        await transaction.mockExamAnswer.update({
          where: { id: review.mockExamAnswerId },
          data: {
            score: checked.score,
            isCorrect: checked.score === review.maxScore,
          },
        });

        const aggregate = await transaction.mockExamAnswer.aggregate({
          where: { mockExamInstanceId: review.mockExamInstanceId },
          _sum: { score: true },
        });
        paperTotal = aggregate._sum.score ?? 0;
        await transaction.mockExamInstance.update({
          where: { id: review.mockExamInstanceId },
          data: { totalScore: paperTotal },
        });

        const latestSubjectExam = await transaction.mockExamInstance.findFirst({
          where: {
            userId: review.userId,
            graded: true,
            template: { subjectId: review.instance.template.subjectId },
          },
          orderBy: [
            { submittedAt: "desc" },
            { startedAt: "desc" },
            { id: "desc" },
          ],
          select: { id: true },
        });

        if (latestSubjectExam?.id === review.mockExamInstanceId) {
          const totalMarks =
            review.instance.template.totalMarks ??
            review.instance.template.questionCount;
          const progressPercentage = calculateScorePercentage(
            paperTotal,
            totalMarks
          );
          await transaction.progressTrack.upsert({
            where: {
              userId_subjectId: {
                userId: review.userId,
                subjectId: review.instance.template.subjectId,
              },
            },
            update: { progressPercentage, updatedAt: resolvedAt },
            create: {
              userId: review.userId,
              subjectId: review.instance.template.subjectId,
              progressPercentage,
              updatedAt: resolvedAt,
            },
          });
          progressRecalculated = true;
        }
      }

      await transaction.mockExamMarkingReviewEvent.create({
        data: {
          reviewId: review.id,
          eventType: adjusted ? "MARK_ADJUSTED" : "UPHELD",
          actorType: "SUPPORT",
          actorUserId: auth.dbUser.id,
          previousScore: currentScore,
          newScore: checked.score,
          note: checked.note,
        },
      });

      return {
        reference: review.reference,
        status: adjusted ? ("MARK_ADJUSTED" as const) : ("UPHELD" as const),
        originalScore: review.originalScore,
        revisedScore: adjusted ? checked.score : null,
        maxScore: review.maxScore,
        resolutionNote: checked.note,
        resolvedAt,
        paperTotal,
        progressRecalculated,
      };
    });

    logSecurityEvent("mock_exam_marking_review_resolved", "info", {
      reviewFingerprint: securityFingerprint(id),
      supportFingerprint: securityFingerprint(auth.dbUser.id),
      outcome: outcome.status,
    });

    return NextResponse.json({ review: outcome }, { headers: noStore });
  } catch (error) {
    if (error instanceof ReviewNotFoundError) {
      return NextResponse.json(
        { error: "Review case not found." },
        { status: 404, headers: noStore }
      );
    }
    if (error instanceof ReviewAlreadyResolvedError) {
      return NextResponse.json(
        { error: "This review case has already been resolved." },
        { status: 409, headers: noStore }
      );
    }
    if (error instanceof InvalidResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: noStore }
      );
    }
    throw error;
  }
}
