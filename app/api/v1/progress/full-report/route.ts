// app/api/v1/progress/full-report/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MATERIALS_SUBJECT_ORDER } from "@/lib/materials-display";

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function GET() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

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

  const pastAttempts = await prisma.pastQuestionAttempt.findMany({
    where: { userId: dbUser.id },
    include: {
      question: {
        select: {
          id: true,
          subjectId: true,
        },
      },
    },
  });

  const totalAttempts = pastAttempts.length;
  const correctAttempts = pastAttempts.filter((a) => a.isCorrect).length;

  const accuracyPerSubject: Record<
    string,
    { subjectId: string; attempts: number; correct: number }
  > = {};

  for (const attempt of pastAttempts) {
    const sid = attempt.question.subjectId;
    if (!accuracyPerSubject[sid]) {
      accuracyPerSubject[sid] = { subjectId: sid, attempts: 0, correct: 0 };
    }
    accuracyPerSubject[sid].attempts++;
    if (attempt.isCorrect) accuracyPerSubject[sid].correct++;
  }

  const subjectMeta = await prisma.subject.findMany({
    where: {
      id: { in: Object.keys(accuracyPerSubject) },
    },
    select: { id: true, name: true },
  });
  const subjectNameById = new Map(subjectMeta.map((s) => [s.id, s.name]));

  const pastQuestions = {
    totalAttempts,
    correctAttempts,
    accuracyRate: totalAttempts > 0 ? correctAttempts / totalAttempts : 0,
    perSubject: Object.values(accuracyPerSubject).map((item) => ({
      subjectId: item.subjectId,
      subjectName: subjectNameById.get(item.subjectId) ?? "Subject",
      attempts: item.attempts,
      correct: item.correct,
      accuracyRate: item.attempts > 0 ? item.correct / item.attempts : 0,
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

  const materialsAttempts =
    materialTopicIds.length === 0
      ? []
      : await prisma.pastQuestionAttempt.findMany({
          where: {
            userId: dbUser.id,
            question: { topicId: { in: materialTopicIds } },
          },
          select: {
            questionId: true,
            attemptedAt: true,
            question: { select: { topicId: true } },
          },
        });

  const topicsTouched = new Set(
    materialsAttempts
      .map((a) => a.question.topicId)
      .filter((id): id is string => Boolean(id))
  ).size;

  const distinctQuestionsPracticed = new Set(
    materialsAttempts.map((a) => a.questionId)
  ).size;

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

  let lastMaterialsActivity: string | null = null;
  for (const a of materialsAttempts) {
    const iso = a.attemptedAt.toISOString();
    if (!lastMaterialsActivity || iso > lastMaterialsActivity) {
      lastMaterialsActivity = iso;
    }
  }

  const studyMaterials = {
    topicsTotal,
    topicsWithPractice: topicsTouched,
    topicsCoveragePercent,
    questionsInBank,
    distinctQuestionsPracticed,
    bankCoveragePercent,
    lastActivityAt: lastMaterialsActivity,
  };

  const mockGraded = await prisma.mockExamInstance.findMany({
    where: { userId: dbUser.id, graded: true },
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
  });

  const inProgressCount = await prisma.mockExamInstance.count({
    where: {
      userId: dbUser.id,
      graded: false,
      submittedAt: null,
    },
  });

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

  const withPercent = examRows.filter((e) => e.scorePercent != null);
  const averageScorePercent =
    withPercent.length > 0
      ? clampPct(
          withPercent.reduce((s, e) => s + (e.scorePercent as number), 0) /
            withPercent.length
        )
      : 0;

  const withDuration = examRows.filter(
    (e) => e.durationMinutes != null && (e.durationMinutes as number) > 0
  );
  const averageDurationMinutes =
    withDuration.length > 0
      ? Math.round(
          (withDuration.reduce(
            (s, e) => s + (e.durationMinutes as number),
            0
          ) /
            withDuration.length) *
            10
        ) / 10
      : null;

  const mockExams = {
    count: examRows.length,
    inProgressCount,
    averageScorePercent,
    averageDurationMinutes,
    totalScore: examRows.reduce((sum, e) => sum + e.score, 0),
    averageScore:
      examRows.length > 0
        ? examRows.reduce((sum, e) => sum + e.score, 0) / examRows.length
        : 0,
    exams: examRows,
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
