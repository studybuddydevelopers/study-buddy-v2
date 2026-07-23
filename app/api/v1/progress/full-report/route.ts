// app/api/v1/progress/full-report/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MATERIALS_SUBJECT_ORDER } from "@/lib/materials-display";
import { getPagination, getPaginationMeta } from "@/lib/pagination";

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

interface SubjectAttemptAggregateRow {
  subjectId: string;
  attempts: number | bigint | string | null;
  correct: number | bigint | string | null;
}

interface MaterialsAggregateRow {
  topicsTouched: number | bigint | string | null;
  distinctQuestionsPracticed: number | bigint | string | null;
  lastActivityAt: Date | null;
}

interface MockExamSummaryRow {
  count: number | bigint | string | null;
  totalScore: number | bigint | string | null;
  averageScorePercent: number | string | null;
  averageDurationMinutes: number | string | null;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;
  const { searchParams } = new URL(req.url);
  const mockPagination = getPagination(searchParams, {
    defaultPageSize: 10,
    maxPageSize: 25,
  });

  const subjectProgress = await prisma.progressTrack.findMany({
    where: { userId: dbUser.id },
    include: {
      subject: {
        select: { id: true, name: true },
      },
    },
  });

  const subjects = subjectProgress.map((sp) => ({
    subjectId: sp.subjectId,
    subjectName: sp.subject.name,
    progressPercentage: sp.progressPercentage,
    updatedAt: sp.updatedAt.toISOString(),
  }));

  const accuracyPerSubject =
    await prisma.$queryRaw<SubjectAttemptAggregateRow[]>(Prisma.sql`
      SELECT
        q."subjectId" AS "subjectId",
        COUNT(*)::integer AS "attempts",
        COUNT(*) FILTER (WHERE a."isCorrect")::integer AS "correct"
      FROM "PastQuestionAttempt" a
      INNER JOIN "PastQuestion" q ON q.id = a."questionId"
      WHERE a."userId" = ${dbUser.id}
      GROUP BY q."subjectId"
    `);

  const totalAttempts = accuracyPerSubject.reduce(
    (sum, item) => sum + toNumber(item.attempts),
    0
  );
  const correctAttempts = accuracyPerSubject.reduce(
    (sum, item) => sum + toNumber(item.correct),
    0
  );

  const subjectMeta = await prisma.subject.findMany({
    where: {
      id: { in: accuracyPerSubject.map((item) => item.subjectId) },
    },
    select: { id: true, name: true },
  });
  const subjectNameById = new Map(subjectMeta.map((s) => [s.id, s.name]));

  const pastQuestions = {
    totalAttempts,
    correctAttempts,
    accuracyRate: totalAttempts > 0 ? correctAttempts / totalAttempts : 0,
    perSubject: accuracyPerSubject.map((item) => ({
      subjectId: item.subjectId,
      subjectName: subjectNameById.get(item.subjectId) ?? "Subject",
      attempts: toNumber(item.attempts),
      correct: toNumber(item.correct),
      accuracyRate:
        toNumber(item.attempts) > 0
          ? toNumber(item.correct) / toNumber(item.attempts)
          : 0,
    })),
  };

  const materialSubjects = await prisma.subject.findMany({
    where: { examCode: { in: [...MATERIALS_SUBJECT_ORDER] } },
    select: { id: true },
  });
  const materialSubjectIds = materialSubjects.map((s) => s.id);

  const materialTopics = await prisma.topic.findMany({
    where: { subjectId: { in: materialSubjectIds } },
    select: { id: true },
  });
  const materialTopicIds = materialTopics.map((t) => t.id);
  const topicsTotal = materialTopicIds.length;

  const materialAggregateRows =
    materialTopicIds.length === 0
      ? []
      : await prisma.$queryRaw<MaterialsAggregateRow[]>(Prisma.sql`
          SELECT
            COUNT(DISTINCT q."topicId")::integer AS "topicsTouched",
            COUNT(DISTINCT a."questionId")::integer AS "distinctQuestionsPracticed",
            MAX(a."attemptedAt") AS "lastActivityAt"
          FROM "PastQuestionAttempt" a
          INNER JOIN "PastQuestion" q ON q.id = a."questionId"
          WHERE a."userId" = ${dbUser.id}
            AND q."topicId" IN (${Prisma.join(materialTopicIds)})
        `);

  const materialAggregate = materialAggregateRows[0];
  const topicsTouched = toNumber(materialAggregate?.topicsTouched);
  const distinctQuestionsPracticed = toNumber(
    materialAggregate?.distinctQuestionsPracticed
  );

  const questionsInBank =
    materialTopicIds.length === 0
      ? 0
      : await prisma.pastQuestion.count({
          where: { topicId: { in: materialTopicIds } },
        });

  const topicsCoveragePercent =
    topicsTotal > 0 ? clampPct((topicsTouched / topicsTotal) * 100) : 0;
  const bankCoveragePercent =
    questionsInBank > 0
      ? clampPct((distinctQuestionsPracticed / questionsInBank) * 100)
      : 0;

  const lastMaterialsActivity = toIsoString(materialAggregate?.lastActivityAt);

  const studyMaterials = {
    topicsTotal,
    topicsWithPractice: topicsTouched,
    topicsCoveragePercent,
    questionsInBank,
    distinctQuestionsPracticed,
    bankCoveragePercent,
    lastActivityAt: lastMaterialsActivity,
  };

  const mockWhere = { userId: dbUser.id, graded: true };

  const [mockGraded, mockSummaryRows, inProgressCount] =
    await prisma.$transaction([
      prisma.mockExamInstance.findMany({
        where: mockWhere,
        include: {
          template: {
            select: {
              id: true,
              title: true,
              subjectId: true,
              questionCount: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        skip: mockPagination.skip,
        take: mockPagination.pageSize,
      }),
      prisma.$queryRaw<MockExamSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::integer AS "count",
          COALESCE(SUM(COALESCE(m."totalScore", 0)), 0)::double precision AS "totalScore",
          AVG(
            CASE
              WHEN t."questionCount" > 0
              THEN (COALESCE(m."totalScore", 0)::double precision / t."questionCount") * 100
              ELSE NULL
            END
          )::double precision AS "averageScorePercent",
          AVG(
            CASE
              WHEN m."submittedAt" IS NOT NULL
                AND m."submittedAt" > m."startedAt"
              THEN (EXTRACT(EPOCH FROM (m."submittedAt" - m."startedAt")) / 60)::double precision
              ELSE NULL
            END
          )::double precision AS "averageDurationMinutes"
        FROM "MockExamInstance" m
        INNER JOIN "MockExamTemplate" t ON t.id = m."templateId"
        WHERE m."userId" = ${dbUser.id}
          AND m."graded" = true
      `),
      prisma.mockExamInstance.count({
        where: {
          userId: dbUser.id,
          graded: false,
          submittedAt: null,
        },
      }),
    ]);

  const examRows = mockGraded.map((m) => {
    const qc = m.template.questionCount;
    const score = m.totalScore ?? 0;
    const scorePercent =
      qc > 0 ? clampPct((score / qc) * 100) : null;
    let durationMinutes: number | null = null;
    if (m.submittedAt && m.startedAt) {
      const ms = m.submittedAt.getTime() - m.startedAt.getTime();
      durationMinutes = ms > 0 ? Math.round((ms / 60000) * 10) / 10 : 0;
    }
    return {
      instanceId: m.id,
      subjectId: m.template.subjectId,
      templateTitle: m.template.title,
      score,
      questionCount: qc,
      scorePercent,
      graded: m.graded,
      startedAt: m.startedAt.toISOString(),
      submittedAt: m.submittedAt?.toISOString() ?? null,
      durationMinutes,
    };
  });

  const mockSummary = mockSummaryRows[0];
  const mockTotalCount = toNumber(mockSummary?.count);
  const totalScore = toNumber(mockSummary?.totalScore);
  const averageDurationRaw = mockSummary?.averageDurationMinutes;
  const averageDurationMinutes =
    averageDurationRaw == null
      ? null
      : Math.round(toNumber(averageDurationRaw) * 10) / 10;

  const mockExams = {
    count: mockTotalCount,
    inProgressCount,
    averageScorePercent: clampPct(toNumber(mockSummary?.averageScorePercent)),
    averageDurationMinutes,
    totalScore,
    averageScore:
      mockTotalCount > 0 ? totalScore / mockTotalCount : 0,
    exams: examRows,
    pagination: getPaginationMeta(
      mockTotalCount,
      mockPagination.page,
      mockPagination.pageSize
    ),
  };

  const aiCount = await prisma.aiQuestion.count({
    where: { userId: dbUser.id },
  });

  const aiActivity = {
    totalQuestionsAsked: aiCount,
  };

  return NextResponse.json({
    subjects,
    studyMaterials,
    pastQuestions,
    mockExams,
    aiActivity,
  });
}
