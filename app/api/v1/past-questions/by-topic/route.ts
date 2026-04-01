// app/api/v1/past-questions/by-topic/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const topicId = new URL(req.url).searchParams.get("topicId");
  if (!topicId) {
    return NextResponse.json(
      { error: "topicId query parameter is required" },
      { status: 400 }
    );
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      subject: { select: { id: true, name: true, examCode: true } },
    },
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const questions = await prisma.pastQuestion.findMany({
    where: { topicId },
    orderBy: [{ difficulty: "asc" }, { id: "asc" }],
    select: {
      id: true,
      questionText: true,
      questionImageUrl: true,
      year: true,
      difficulty: true,
    },
  });

  return NextResponse.json({
    topic: {
      id: topic.id,
      title: topic.title,
      subjectId: topic.subjectId,
    },
    subject: topic.subject,
    questions,
  });
}
