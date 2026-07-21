import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MATERIALS_SUBJECT_ORDER } from "@/lib/materials-display";

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

  // All user attempts on WAEC topics
  const allAttempts = await prisma.pastQuestionAttempt.findMany({
    where: {
      userId: dbUser.id,
      question: { topicId: { in: topicIds } },
    },
    select: {
      questionId: true,
      isCorrect: true,
      attemptedAt: true,
      question: { select: { topicId: true } },
    },
  });

  // Topic breakdown: count each question once, using the latest submitted result.
  const latestAttemptByTopic = new Map<
    string,
    Map<string, { isCorrect: boolean; attemptedAt: Date }>
  >();
  for (const a of allAttempts) {
    const tid = a.question.topicId;
    if (!tid) continue;

    if (!latestAttemptByTopic.has(tid)) {
      latestAttemptByTopic.set(tid, new Map());
    }

    const topicAttempts = latestAttemptByTopic.get(tid)!;
    const existing = topicAttempts.get(a.questionId);
    if (!existing || a.attemptedAt > existing.attemptedAt) {
      topicAttempts.set(a.questionId, {
        isCorrect: a.isCorrect,
        attemptedAt: a.attemptedAt,
      });
    }
  }

  const topicBreakdown = topics
    .filter((t) => latestAttemptByTopic.has(t.id))
    .map((t) => {
      const latestAttempts = latestAttemptByTopic.get(t.id)!;
      const attempted = latestAttempts.size;
      const correct = Array.from(latestAttempts.values()).filter(
        (attempt) => attempt.isCorrect
      ).length;
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

  const countByDate = new Map<string, number>();
  for (const a of allAttempts) {
    const date = a.attemptedAt.toISOString().slice(0, 10);
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }

  const weeklyActivity = weekDays.map((d) => ({
    day: d.label,
    date: d.date,
    count: countByDate.get(d.date) ?? 0,
  }));

  // Streak — consecutive days ending today (or yesterday, so overnight doesn't break it)
  const distinctDates = new Set(
    allAttempts.map((a) => a.attemptedAt.toISOString().slice(0, 10))
  );
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
