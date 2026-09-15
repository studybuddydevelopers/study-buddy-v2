import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MATERIALS_SUBJECT_ORDER } from "@/lib/materials-display";
import { getPagination, getPaginationMeta } from "@/lib/pagination";
import { getAiActivitySummary } from "@/lib/progress/ai-activity";
import {
  deriveTopicInsights,
  MIN_FOCUS_ATTEMPTS,
  type DashboardTopicInput,
} from "@/lib/dashboard-insights";
import {
  buildProgressTrend,
  getProgressPeriod,
  parseProgressRange,
} from "@/lib/progress/report";

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
  subjectName: string;
  attempts: number | bigint | string | null;
  correct: number | bigint | string | null;
}

interface MaterialsAggregateRow {
  topicsTouched: number | bigint | string | null;
  distinctQuestionsPracticed: number | bigint | string | null;
  lastActivityAt: Date | null;
}

interface TopicAttemptAggregateRow {
  topicId: string;
  attempted: number | bigint | string | null;
  correct: number | bigint | string | null;
  lastAttemptAt: Date | string | null;
}

interface DailyPracticeRow {
  date: string;
  attempted: number | bigint | string | null;
  correct: number | bigint | string | null;
}

interface MockExamSummaryRow {
  count: number | bigint | string | null;
  totalScore: number | bigint | string | null;
  averageScorePercent: number | string | null;
  averageDurationMinutes: number | string | null;
}

interface DailyMockRow {
  date: string;
  completed: number | bigint | string | null;
  scorePercentTotal: number | string | null;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;
  const { searchParams } = new URL(req.url);
  const range = parseProgressRange(searchParams.get("range"));
  const period = getProgressPeriod(range);
  const requestedSubjectId = searchParams.get("subject");
  const requestedTopicId = searchParams.get("topic");
  const mockPagination = getPagination(searchParams, {
    defaultPageSize: 10,
    maxPageSize: 25,
  });

  const materialSubjects = await prisma.subject.findMany({
    where: { examCode: { in: [...MATERIALS_SUBJECT_ORDER] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const materialSubjectIds = materialSubjects.map((subject) => subject.id);
  const materialTopics = await prisma.topic.findMany({
    where: { subjectId: { in: materialSubjectIds } },
    select: {
      id: true,
      title: true,
      sortOrder: true,
      subjectId: true,
      subject: { select: { name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  const materialTopicIds = materialTopics.map((topic) => topic.id);
  const selectedSubjectId = materialSubjectIds.includes(requestedSubjectId ?? "")
    ? requestedSubjectId
    : null;
  const selectedTopic = materialTopics.find(
    (topic) =>
      topic.id === requestedTopicId &&
      (!selectedSubjectId || topic.subjectId === selectedSubjectId)
  );
  const selectedTopicId = selectedTopic?.id ?? null;

  const practiceFilter = Prisma.sql`
    AND a."attemptedAt" >= ${period.start}
    AND a."attemptedAt" < ${period.endExclusive}
    ${selectedSubjectId ? Prisma.sql`AND q."subjectId" = ${selectedSubjectId}` : Prisma.empty}
    ${selectedTopicId ? Prisma.sql`AND q."topicId" = ${selectedTopicId}` : Prisma.empty}
  `;
  const mockSubjectFilter = selectedSubjectId
    ? Prisma.sql`AND t."subjectId" = ${selectedSubjectId}`
    : Prisma.empty;
  const mockWhere: Prisma.MockExamInstanceWhereInput = {
    userId: dbUser.id,
    graded: true,
    submittedAt: { gte: period.start, lt: period.endExclusive },
    ...(selectedSubjectId
      ? { template: { subjectId: selectedSubjectId } }
      : {}),
  };
  const inProgressWhere: Prisma.MockExamInstanceWhereInput = {
    userId: dbUser.id,
    graded: false,
    submittedAt: null,
    ...(selectedSubjectId
      ? { template: { subjectId: selectedSubjectId } }
      : {}),
  };

  const [
    subjectProgress,
    accuracyPerSubject,
    materialAggregateRows,
    questionCounts,
    topicAttemptRows,
    dailyPracticeRows,
    mockGraded,
    mockSummaryRows,
    inProgressCount,
    allTimeMockCount,
    dailyMockRows,
    aiActivity,
  ] = await Promise.all([
    prisma.progressTrack.findMany({
      where: { userId: dbUser.id },
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.$queryRaw<SubjectAttemptAggregateRow[]>(Prisma.sql`
      SELECT
        q."subjectId" AS "subjectId",
        s.name AS "subjectName",
        COUNT(*)::integer AS "attempts",
        COUNT(*) FILTER (WHERE a."isCorrect")::integer AS "correct"
      FROM "PastQuestionAttempt" a
      INNER JOIN "PastQuestion" q ON q.id = a."questionId"
      INNER JOIN "Subject" s ON s.id = q."subjectId"
      WHERE a."userId" = ${dbUser.id}
        ${practiceFilter}
      GROUP BY q."subjectId", s.name
      ORDER BY s.name ASC
    `),
    materialTopicIds.length === 0
      ? Promise.resolve([] as MaterialsAggregateRow[])
      : prisma.$queryRaw<MaterialsAggregateRow[]>(Prisma.sql`
          SELECT
            COUNT(DISTINCT q."topicId")::integer AS "topicsTouched",
            COUNT(DISTINCT a."questionId")::integer AS "distinctQuestionsPracticed",
            MAX(a."attemptedAt") AS "lastActivityAt"
          FROM "PastQuestionAttempt" a
          INNER JOIN "PastQuestion" q ON q.id = a."questionId"
          WHERE a."userId" = ${dbUser.id}
            AND q."topicId" IN (${Prisma.join(materialTopicIds)})
        `),
    prisma.pastQuestion.groupBy({
      by: ["topicId"],
      where: { topicId: { in: materialTopicIds } },
      _count: { id: true },
    }),
    materialTopicIds.length === 0
      ? Promise.resolve([] as TopicAttemptAggregateRow[])
      : prisma.$queryRaw<TopicAttemptAggregateRow[]>(Prisma.sql`
          WITH latest_attempts AS (
            SELECT DISTINCT ON (a."questionId")
              a."questionId",
              q."topicId" AS "topicId",
              a."isCorrect" AS "isCorrect",
              a."attemptedAt" AS "attemptedAt",
              a.id AS "attemptId"
            FROM "PastQuestionAttempt" a
            INNER JOIN "PastQuestion" q ON q.id = a."questionId"
            WHERE a."userId" = ${dbUser.id}
              AND q."topicId" IN (${Prisma.join(materialTopicIds)})
            ORDER BY a."questionId", a."attemptedAt" DESC, a.id DESC
          )
          SELECT
            "topicId",
            COUNT(*)::integer AS "attempted",
            COUNT(*) FILTER (WHERE "isCorrect")::integer AS "correct",
            MAX("attemptedAt") AS "lastAttemptAt"
          FROM latest_attempts
          GROUP BY "topicId"
        `),
    prisma.$queryRaw<DailyPracticeRow[]>(Prisma.sql`
      SELECT
        to_char(a."attemptedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
        COUNT(*)::integer AS "attempted",
        COUNT(*) FILTER (WHERE a."isCorrect")::integer AS "correct"
      FROM "PastQuestionAttempt" a
      INNER JOIN "PastQuestion" q ON q.id = a."questionId"
      WHERE a."userId" = ${dbUser.id}
        ${practiceFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    prisma.mockExamInstance.findMany({
      where: mockWhere,
      include: {
        template: {
          select: {
            id: true,
            title: true,
            subjectId: true,
            questionCount: true,
            totalMarks: true,
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
            WHEN COALESCE(t."totalMarks", t."questionCount") > 0
            THEN (COALESCE(m."totalScore", 0)::double precision / COALESCE(t."totalMarks", t."questionCount")) * 100
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
        AND m."submittedAt" >= ${period.start}
        AND m."submittedAt" < ${period.endExclusive}
        ${mockSubjectFilter}
    `),
    prisma.mockExamInstance.count({ where: inProgressWhere }),
    prisma.mockExamInstance.count({
      where: { userId: dbUser.id, graded: true },
    }),
    prisma.$queryRaw<DailyMockRow[]>(Prisma.sql`
      SELECT
        to_char(m."submittedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
        COUNT(*)::integer AS "completed",
        COALESCE(SUM(
          CASE
            WHEN COALESCE(t."totalMarks", t."questionCount") > 0
            THEN (COALESCE(m."totalScore", 0)::double precision / COALESCE(t."totalMarks", t."questionCount")) * 100
            ELSE 0
          END
        ), 0)::double precision AS "scorePercentTotal"
      FROM "MockExamInstance" m
      INNER JOIN "MockExamTemplate" t ON t.id = m."templateId"
      WHERE m."userId" = ${dbUser.id}
        AND m."graded" = true
        AND m."submittedAt" >= ${period.start}
        AND m."submittedAt" < ${period.endExclusive}
        ${mockSubjectFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    getAiActivitySummary(prisma, dbUser.id),
  ]);

  const subjects = subjectProgress.map((item) => ({
    subjectId: item.subjectId,
    subjectName: item.subject.name,
    progressPercentage: item.progressPercentage,
    updatedAt: item.updatedAt.toISOString(),
  }));

  const totalAttempts = accuracyPerSubject.reduce(
    (sum, item) => sum + toNumber(item.attempts),
    0
  );
  const correctAttempts = accuracyPerSubject.reduce(
    (sum, item) => sum + toNumber(item.correct),
    0
  );
  const pastQuestions = {
    totalAttempts,
    correctAttempts,
    accuracyRate: totalAttempts > 0 ? correctAttempts / totalAttempts : 0,
    perSubject: accuracyPerSubject.map((item) => ({
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      attempts: toNumber(item.attempts),
      correct: toNumber(item.correct),
      accuracyRate:
        toNumber(item.attempts) > 0
          ? toNumber(item.correct) / toNumber(item.attempts)
          : 0,
    })),
  };

  const materialAggregate = materialAggregateRows[0];
  const topicsTotal = materialTopicIds.length;
  const topicsTouched = toNumber(materialAggregate?.topicsTouched);
  const distinctQuestionsPracticed = toNumber(
    materialAggregate?.distinctQuestionsPracticed
  );
  const questionsInBank = questionCounts.reduce(
    (sum, row) => sum + row._count.id,
    0
  );
  const studyMaterials = {
    topicsTotal,
    topicsWithPractice: topicsTouched,
    topicsCoveragePercent:
      topicsTotal > 0 ? clampPct((topicsTouched / topicsTotal) * 100) : 0,
    questionsInBank,
    distinctQuestionsPracticed,
    bankCoveragePercent:
      questionsInBank > 0
        ? clampPct((distinctQuestionsPracticed / questionsInBank) * 100)
        : 0,
    lastActivityAt: toIsoString(materialAggregate?.lastActivityAt),
  };

  const bankByTopic = new Map(
    questionCounts.map((row) => [row.topicId ?? "", row._count.id])
  );
  const attemptsByTopic = new Map(
    topicAttemptRows.map((row) => [
      row.topicId,
      {
        attempted: toNumber(row.attempted),
        correct: toNumber(row.correct),
        lastAttemptAt: toIsoString(row.lastAttemptAt),
      },
    ])
  );
  const topicBreakdown: DashboardTopicInput[] = materialTopics.map((topic) => {
    const attempts = attemptsByTopic.get(topic.id);
    const attempted = attempts?.attempted ?? 0;
    const correct = attempts?.correct ?? 0;
    return {
      topicId: topic.id,
      topicTitle: topic.title,
      subjectName: topic.subject.name,
      totalQuestions: bankByTopic.get(topic.id) ?? 0,
      attempted,
      correct,
      accuracyPct: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      lastAttemptAt: attempts?.lastAttemptAt ?? null,
    };
  });
  const { focusTopics, recommendedTopic } = deriveTopicInsights(topicBreakdown);

  const examRows = mockGraded.map((mock) => {
    const questionCount =
      mock.template.totalMarks ?? mock.template.questionCount;
    const score = mock.totalScore ?? 0;
    let durationMinutes: number | null = null;
    if (mock.submittedAt && mock.startedAt) {
      const elapsed = mock.submittedAt.getTime() - mock.startedAt.getTime();
      durationMinutes = elapsed > 0 ? Math.round((elapsed / 60000) * 10) / 10 : 0;
    }
    return {
      instanceId: mock.id,
      subjectId: mock.template.subjectId,
      templateTitle: mock.template.title,
      score,
      questionCount,
      scorePercent:
        questionCount > 0 ? clampPct((score / questionCount) * 100) : null,
      graded: mock.graded,
      startedAt: mock.startedAt.toISOString(),
      submittedAt: mock.submittedAt?.toISOString() ?? null,
      durationMinutes,
    };
  });
  const mockSummary = mockSummaryRows[0];
  const mockTotalCount = toNumber(mockSummary?.count);
  const totalScore = toNumber(mockSummary?.totalScore);
  const averageDurationRaw = mockSummary?.averageDurationMinutes;
  const mockExams = {
    count: mockTotalCount,
    allTimeCount: allTimeMockCount,
    inProgressCount,
    averageScorePercent: clampPct(toNumber(mockSummary?.averageScorePercent)),
    averageDurationMinutes:
      averageDurationRaw == null
        ? null
        : Math.round(toNumber(averageDurationRaw) * 10) / 10,
    totalScore,
    averageScore: mockTotalCount > 0 ? totalScore / mockTotalCount : 0,
    exams: examRows,
    pagination: getPaginationMeta(
      mockTotalCount,
      mockPagination.page,
      mockPagination.pageSize
    ),
  };

  const trend = buildProgressTrend(
    range,
    new Date(period.endExclusive.getTime() - 1),
    dailyPracticeRows.map((row) => ({
      date: row.date,
      attempted: toNumber(row.attempted),
      correct: toNumber(row.correct),
    })),
    dailyMockRows.map((row) => ({
      date: row.date,
      completed: toNumber(row.completed),
      scorePercentTotal: toNumber(row.scorePercentTotal),
    }))
  );
  const rangeEnd = new Date(period.endExclusive);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() - 1);

  return NextResponse.json({
    filters: {
      range,
      rangeLabel: period.label,
      rangeStart: period.start.toISOString().slice(0, 10),
      rangeEnd: rangeEnd.toISOString().slice(0, 10),
      subjectId: selectedSubjectId,
      topicId: selectedTopicId,
      subjects: materialSubjects,
      topics: materialTopics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        subjectId: topic.subjectId,
        subjectName: topic.subject.name,
      })),
    },
    subjects,
    studyMaterials,
    pastQuestions,
    mockExams,
    trend,
    topicInsights: {
      focusTopics,
      recommendedTopic,
      minimumEvidenceQuestions: MIN_FOCUS_ATTEMPTS,
    },
    aiActivity,
  });
}
