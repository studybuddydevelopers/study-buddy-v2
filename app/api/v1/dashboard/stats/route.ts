import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MATERIALS_SUBJECT_ORDER } from "@/lib/materials-display";

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
}

interface WeeklyActivityRow {
  date: string;
  count: number | bigint | string | null;
}

interface ActiveDateRow {
  date: string;
}

export async function GET() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // WAEC subject ids
  const waecSubjects = await prisma.subject.findMany({
    where: { examCode: { in: [...MATERIALS_SUBJECT_ORDER] } },
    select: { id: true },
  });
  const waecSubjectIds = waecSubjects.map((s) => s.id);

  // All topics with question bank count
  const topics = await prisma.topic.findMany({
    where: { subjectId: { in: waecSubjectIds } },
    select: { id: true, title: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  const topicIds = topics.map((t) => t.id);

  const questionCounts = await prisma.pastQuestion.groupBy({
    by: ["topicId"],
    where: { topicId: { in: topicIds } },
    _count: { id: true },
  });
  const bankByTopic = new Map(
    questionCounts.map((r) => [r.topicId ?? "", r._count.id])
  );

  // Weekly activity — last 7 days (UTC dates)
  const now = new Date();
  const weekDays: { date: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    weekDays.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    });
  }

  const weekStart = new Date(`${weekDays[0].date}T00:00:00.000Z`);

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
              COUNT(*) FILTER (WHERE "isCorrect")::integer AS "correct"
            FROM latest_attempts
            GROUP BY "topicId"
          `),
          prisma.$queryRaw<WeeklyActivityRow[]>(Prisma.sql`
            SELECT
              to_char(a."attemptedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
              COUNT(*)::integer AS "count"
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
      },
    ])
  );

  const topicBreakdown = topics
    .filter((t) => attemptsByTopic.has(t.id))
    .map((t) => {
      const aggregate = attemptsByTopic.get(t.id)!;
      const attempted = aggregate.attempted;
      const correct = aggregate.correct;
      return {
        topicId: t.id,
        topicTitle: t.title,
        totalQuestions: bankByTopic.get(t.id) ?? 0,
        attempted,
        correct,
        accuracyPct: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      };
    });

  // Weakest topic (lowest accuracy, at least 1 attempt)
  const attempted = topicBreakdown.filter((t) => t.attempted > 0);
  const weakestTopic =
    attempted.length > 0
      ? attempted.reduce((min, t) => (t.accuracyPct < min.accuracyPct ? t : min))
      : null;

  const countByDate = new Map(
    weeklyRows.map((row) => [row.date, toNumber(row.count)])
  );

  const weeklyActivity = weekDays.map((d) => ({
    day: d.label,
    date: d.date,
    count: countByDate.get(d.date) ?? 0,
  }));

  // Streak — consecutive days ending today (or yesterday, so overnight doesn't break it)
  const distinctDates = new Set(activeDateRows.map((row) => row.date));
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  let streakDays = 0;
  const streakAnchor = distinctDates.has(todayStr)
    ? todayStr
    : distinctDates.has(yesterdayStr)
    ? yesterdayStr
    : null;

  if (streakAnchor) {
    const cursor = new Date(streakAnchor + "T00:00:00Z");
    while (distinctDates.has(cursor.toISOString().slice(0, 10))) {
      streakDays++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  // Last in-progress mock exam
  const lastInProgress = await prisma.mockExamInstance.findFirst({
    where: { userId: dbUser.id, graded: false, submittedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  return NextResponse.json({
    topicBreakdown,
    weeklyActivity,
    streakDays,
    weakestTopic,
    lastInProgressMock: lastInProgress ? { instanceId: lastInProgress.id } : null,
  });
}
