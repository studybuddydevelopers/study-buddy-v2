// app/api/v1/past-questions/by-topic/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPagination, getPaginationMeta } from "@/lib/pagination";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  if (!topicId) {
    return NextResponse.json(
      { error: "topicId query parameter is required" },
      { status: 400 }
    );
  }
  const { page, pageSize, skip } = getPagination(searchParams, {
    defaultPageSize: 10,
    maxPageSize: 25,
  });

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      subject: { select: { id: true, name: true, examCode: true } },
    },
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const [questions, total] = await prisma.$transaction([
    prisma.pastQuestion.findMany({
      where: { topicId },
      orderBy: [{ difficulty: "asc" }, { id: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        questionText: true,
        questionImageUrl: true,
        year: true,
        difficulty: true,
      },
    }),
    prisma.pastQuestion.count({ where: { topicId } }),
  ]);

  return NextResponse.json({
    topic: {
      id: topic.id,
      title: topic.title,
      subjectId: topic.subjectId,
    },
    subject: topic.subject,
    questions,
    pagination: getPaginationMeta(total, page, pageSize),
  });
}
