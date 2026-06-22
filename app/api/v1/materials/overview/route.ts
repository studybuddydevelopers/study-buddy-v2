// app/api/v1/materials/overview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  MATERIALS_SUBJECT_LABELS,
  MATERIALS_SUBJECT_ORDER,
} from "@/lib/materials-display";

export async function GET() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const subjects = await prisma.subject.findMany({
    where: {
      examCode: { in: [...MATERIALS_SUBJECT_ORDER] },
    },
    include: {
      topics: {
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      },
    },
  });

  const orderIndex = new Map<string, number>(
    MATERIALS_SUBJECT_ORDER.map((code, i) => [code, i])
  );
  subjects.sort((a, b) => {
    const ai = orderIndex.get(a.examCode ?? "") ?? 99;
    const bi = orderIndex.get(b.examCode ?? "") ?? 99;
    return ai - bi;
  });

  const topicIds = subjects.flatMap((s) => s.topics.map((t) => t.id));
  if (topicIds.length === 0) {
    return NextResponse.json({ subjects: [] });
  }

  const [countsByTopic, userAttempts] = await Promise.all([
    prisma.pastQuestion.groupBy({
      by: ["topicId"],
      where: { topicId: { in: topicIds } },
      _count: { id: true },
    }),
    prisma.pastQuestionAttempt.findMany({
      where: {
        userId: dbUser.id,
        question: { topicId: { in: topicIds } },
      },
      select: { questionId: true, question: { select: { topicId: true } } },
    }),
  ]);

  const totalByTopic = new Map<string, number>();
  for (const row of countsByTopic) {
    if (row.topicId) totalByTopic.set(row.topicId, row._count.id);
  }

  const distinctAttemptedByTopic = new Map<string, Set<string>>();
  for (const a of userAttempts) {
    const tid = a.question.topicId;
    if (!tid) continue;
    if (!distinctAttemptedByTopic.has(tid)) {
      distinctAttemptedByTopic.set(tid, new Set());
    }
    distinctAttemptedByTopic.get(tid)!.add(a.questionId);
  }

  const response = {
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      examCode: s.examCode,
      displayName:
        (s.examCode && MATERIALS_SUBJECT_LABELS[s.examCode]) ?? s.name,
      topics: s.topics.map((t) => {
        const total = totalByTopic.get(t.id) ?? 0;
        const attempted = distinctAttemptedByTopic.get(t.id)?.size ?? 0;
        const progressPercentage =
          total > 0
            ? Math.max(0, Math.min(100, Math.round((attempted / total) * 100)))
            : 0;
        return {
          id: t.id,
          title: t.title,
          sortOrder: t.sortOrder,
          questionCount: total,
          questionsAttempted: attempted,
          progressPercentage,
        };
      }),
    })),
  };

  return NextResponse.json(response);
}
