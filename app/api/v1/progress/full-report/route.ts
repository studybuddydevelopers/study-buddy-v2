// app/api/v1/progress/full-report/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------
  // 2. FETCH SUBJECT-LEVEL PROGRESS
  // -------------------------------------
  const subjectProgress = await prisma.progressTrack.findMany({
    where: { userId: dbUser.id },
    include: {
      subject: {
        select: { id: true, name: true }
      }
    }
  });

  // Format subject progress
  const subjects = subjectProgress.map((sp) => ({
    subjectId: sp.subjectId,
    subjectName: sp.subject.name,
    progressPercentage: sp.progressPercentage,
    updatedAt: sp.updatedAt
  }));

  // -------------------------------------
  // 3. PAST QUESTION PERFORMANCE
  // -------------------------------------
  const pastAttempts = await prisma.pastQuestionAttempt.findMany({
    where: { userId: dbUser.id },
    include: {
      question: {
        select: {
          id: true,
          subjectId: true,
        }
      }
    }
  });

  const totalAttempts = pastAttempts.length;
  const correctAttempts = pastAttempts.filter((a) => a.isCorrect).length;

  // Group accuracy per subject
  const accuracyPerSubject: Record<string, { subjectId: string; attempts: number; correct: number }> = {};

  for (const attempt of pastAttempts) {
    const sid = attempt.question.subjectId;
    if (!accuracyPerSubject[sid]) {
      accuracyPerSubject[sid] = { subjectId: sid, attempts: 0, correct: 0 };
    }
    accuracyPerSubject[sid].attempts++;
    if (attempt.isCorrect) accuracyPerSubject[sid].correct++;
  }

  const pastQuestions = {
    totalAttempts,
    correctAttempts,
    accuracyRate: totalAttempts > 0 ? correctAttempts / totalAttempts : 0,
    perSubject: Object.values(accuracyPerSubject).map((item) => ({
      subjectId: item.subjectId,
      attempts: item.attempts,
      correct: item.correct,
      accuracyRate: item.attempts > 0 ? item.correct / item.attempts : 0,
    }))
  };

  // -------------------------------------
  // 4. MOCK EXAM PERFORMANCE
  // -------------------------------------
  const mockInstances = await prisma.mockExamInstance.findMany({
    where: { userId: dbUser.id, graded: true },
    include: {
      template: {
        select: { id: true, title: true, subjectId: true }
      }
    }
  });

  const mockCount = mockInstances.length;
  const totalMockScore = mockInstances.reduce((sum, m) => sum + (m.totalScore ?? 0), 0);
  const avgMockScore = mockCount > 0 ? totalMockScore / mockCount : 0;

  const mockExams = {
    count: mockCount,
    totalScore: totalMockScore,
    averageScore: avgMockScore,
    exams: mockInstances.map((m) => ({
      instanceId: m.id,
      subjectId: m.template.subjectId,
      templateTitle: m.template.title,
      score: m.totalScore,
      graded: m.graded,
      startedAt: m.startedAt,
      submittedAt: m.submittedAt
    }))
  };

  // -------------------------------------
  // 5. AI QUESTION USAGE
  // -------------------------------------
  const aiCount = await prisma.aiQuestion.count({
    where: { userId: dbUser.id }
  });

  const aiActivity = {
    totalQuestionsAsked: aiCount
  };

  // -------------------------------------
  // 6. FINAL RESPONSE
  // -------------------------------------
  return NextResponse.json({
    subjects,
    pastQuestions,
    mockExams,
    aiActivity
  });
}
