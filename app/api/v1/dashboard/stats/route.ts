import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MATERIALS_SUBJECT_ORDER } from "@/lib/materials-display";
import {
  deriveTopicInsights,
  type DashboardTopicInput,
} from "@/lib/dashboard-insights";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

interface TopicAttemptAggregateRow {
  topicId: string;
  attempted: number | bigint | string | null;
  correct: number | bigint | string | null;
  lastAttemptAt: Date | string | null;
}

interface WeeklyActivityRow {
  date: string;
  count: number | bigint | string | null;
  correct: number | bigint | string | null;
}

interface ActiveDateRow {
  date: string;
}

export async function GET() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const waecSubjects = await prisma.subject.findMany({
    where: { examCode: { in: [...MATERIALS_SUBJECT_ORDER] } },
    select: { id: true },
  });
  const waecSubjectIds = waecSubjects.map((subject) => subject.id);

  const topics = await prisma.topic.findMany({
    where: { subjectId: { in: waecSubjectIds } },
    select: {
      id: true,
      title: true,
      sortOrder: true,
      subject: { select: { name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  const topicIds = topics.map((topic) => topic.id);

  const questionCounts = await prisma.pastQuestion.groupBy({
    by: ["topicId"],
    where: { topicId: { in: topicIds } },
    _count: { id: true },
  });
  const bankByTopic = new Map(
    questionCounts.map((row) => [row.topicId ?? "", row._count.id])
  );

  const now = new Date();
  const weekDays: { date: string; label: string }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    weekDays.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-GB", {
        weekday: "short",
        timeZone: "UTC",
      }),
    });
  }

  const weekStart = new Date(`${weekDays[0].date}T00:00:00.000Z`);
  const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);

  const [topicAttemptRows, weeklyRows, activeDateRows] =
    topicIds.length === 0
      ? [[], [], []]
      : await prisma.$transaction([
          prisma.$queryRaw<TopicAttemptAggregateRow[]>(Prisma.sql`
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
                AND q."topicId" IN (${Prisma.join(topicIds)})
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
          prisma.$queryRaw<WeeklyActivityRow[]>(Prisma.sql`
            SELECT
              to_char(a."attemptedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
              COUNT(*)::integer AS "count",
              COUNT(*) FILTER (WHERE a."isCorrect")::integer AS "correct"
            FROM "PastQuestionAttempt" a
            INNER JOIN "PastQuestion" q ON q.id = a."questionId"
            WHERE a."userId" = ${dbUser.id}
              AND q."topicId" IN (${Prisma.join(topicIds)})
              AND a."attemptedAt" >= ${weekStart}
            GROUP BY 1
          `),
          prisma.$queryRaw<ActiveDateRow[]>(Prisma.sql`
            SELECT DISTINCT
              to_char(a."attemptedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date"
            FROM "PastQuestionAttempt" a
            INNER JOIN "PastQuestion" q ON q.id = a."questionId"
            WHERE a."userId" = ${dbUser.id}
              AND q."topicId" IN (${Prisma.join(topicIds)})
            ORDER BY "date" DESC
          `),
        ]);

  const attemptsByTopic = new Map(
    topicAttemptRows.map((row) => [
      row.topicId,
      {
        attempted: toNumber(row.attempted),
        correct: toNumber(row.correct),
        lastAttemptAt: row.lastAttemptAt
          ? new Date(row.lastAttemptAt).toISOString()
          : null,
      },
    ])
  );

  const allTopicInsights: DashboardTopicInput[] = topics.map((topic) => {
    const aggregate = attemptsByTopic.get(topic.id);
    const attempted = aggregate?.attempted ?? 0;
    const correct = aggregate?.correct ?? 0;
    return {
      topicId: topic.id,
      topicTitle: topic.title,
      subjectName: topic.subject.name,
      totalQuestions: bankByTopic.get(topic.id) ?? 0,
      attempted,
      correct,
      accuracyPct: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      lastAttemptAt: aggregate?.lastAttemptAt ?? null,
    };
  });
  const topicBreakdown = allTopicInsights.filter((topic) => topic.attempted > 0);
  const { focusTopics, recommendedTopic } = deriveTopicInsights(allTopicInsights);

  const activityByDate = new Map(
    weeklyRows.map((row) => [
      row.date,
      { count: toNumber(row.count), correct: toNumber(row.correct) },
    ])
  );
  const weeklyActivity = weekDays.map((day) => ({
    day: day.label,
    date: day.date,
    count: activityByDate.get(day.date)?.count ?? 0,
    correct: activityByDate.get(day.date)?.correct ?? 0,
  }));
  const weeklySummary = weeklyActivity.reduce(
    (summary, day) => ({
      questionsAttempted: summary.questionsAttempted + day.count,
      correctAnswers: summary.correctAnswers + day.correct,
      accuracyPct: null,
      activeDays: summary.activeDays + (day.count > 0 ? 1 : 0),
    }),
    {
      questionsAttempted: 0,
      correctAnswers: 0,
      accuracyPct: null as number | null,
      activeDays: 0,
    }
  );
  weeklySummary.accuracyPct =
    weeklySummary.questionsAttempted > 0
      ? Math.round(
          (weeklySummary.correctAnswers / weeklySummary.questionsAttempted) * 100
        )
      : null;

  const distinctDates = new Set(activeDateRows.map((row) => row.date));
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  let streakDays = 0;
  const streakAnchor = distinctDates.has(today)
    ? today
    : distinctDates.has(yesterday)
      ? yesterday
      : null;

  if (streakAnchor) {
    const cursor = new Date(`${streakAnchor}T00:00:00.000Z`);
    while (distinctDates.has(cursor.toISOString().slice(0, 10))) {
      streakDays += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  const [
    lastInProgress,
    latestCloudDraft,
    completedMocksToday,
    legacyAiToday,
    chatAiToday,
  ] = await Promise.all([
    prisma.mockExamInstance.findFirst({
      where: { userId: dbUser.id, graded: false, submittedAt: null },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        answers: { select: { userAnswer: true } },
        template: {
          select: {
            title: true,
            questionCount: true,
            subject: { select: { name: true } },
          },
        },
      },
    }),
    prisma.practiceAnswerDraft.findFirst({
      where: {
        userId: dbUser.id,
        answerText: { not: "" },
        question: { topic: { subjectId: { in: waecSubjectIds } } },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        updatedAt: true,
        question: {
          select: {
            topic: {
              select: {
                id: true,
                title: true,
                subject: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.mockExamInstance.count({
      where: { userId: dbUser.id, submittedAt: { gte: todayStart } },
    }),
    prisma.aiQuestion.count({
      where: { userId: dbUser.id, createdAt: { gte: todayStart } },
    }),
    prisma.aiChatMessage.count({
      where: {
        role: "USER",
        createdAt: { gte: todayStart },
        chat: { userId: dbUser.id, deletedAt: null },
      },
    }),
  ]);

  const cloudDraftTopic = latestCloudDraft?.question.topic ?? null;
  const savedAnswerCount = cloudDraftTopic
    ? await prisma.practiceAnswerDraft.count({
        where: {
          userId: dbUser.id,
          answerText: { not: "" },
          question: { topicId: cloudDraftTopic.id },
        },
      })
    : 0;

  const lastInProgressMock = lastInProgress
    ? {
        instanceId: lastInProgress.id,
        title: lastInProgress.template.title,
        subjectName: lastInProgress.template.subject.name,
        answeredCount: lastInProgress.answers.filter(
          (answer) => answer.userAnswer?.trim()
        ).length,
        questionCount: lastInProgress.template.questionCount,
        startedAt: lastInProgress.startedAt.toISOString(),
      }
    : null;
  const resumePractice =
    cloudDraftTopic && latestCloudDraft
      ? {
          topicId: cloudDraftTopic.id,
          topicTitle: cloudDraftTopic.title,
          subjectName: cloudDraftTopic.subject.name,
          savedAnswerCount,
          updatedAt: latestCloudDraft.updatedAt.toISOString(),
        }
      : null;

  return NextResponse.json({
    availableTopics: allTopicInsights
      .filter((topic) => topic.totalQuestions > 0)
      .map(({ topicId, topicTitle, subjectName }) => ({
        topicId,
        topicTitle,
        subjectName,
      })),
    topicBreakdown,
    focusTopics,
    recommendedTopic,
    weeklyActivity,
    weeklySummary,
    todaySummary: {
      questionsAttempted: activityByDate.get(today)?.count ?? 0,
      mockExamsCompleted: completedMocksToday,
      aiQuestionsAsked: legacyAiToday + chatAiToday,
    },
    streakDays,
    lastInProgressMock,
    resumePractice,
  });
}
