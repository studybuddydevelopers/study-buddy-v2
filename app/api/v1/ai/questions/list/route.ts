// app/api/v1/ai/questions/list/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPagination, getPaginationMeta } from "@/lib/pagination";

export async function GET(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE QUERY PARAMS
  // -------------------------------------
  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = getPagination(searchParams, {
    defaultPageSize: 20,
    maxPageSize: 50,
  });

  // -------------------------------------
  // 3. GET THREADS (PAGINATED)
  // -------------------------------------
  // Fetch threads + their last message
  const threads = await prisma.aiQuestion.findMany({
    where: { userId: dbUser.id },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1, // only latest message
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: pageSize,
  });

  const total = await prisma.aiQuestion.count({
    where: { userId: dbUser.id },
  });

  // -------------------------------------
  // 4. FORMAT CLEAN RESPONSE
  // -------------------------------------
  const formattedThreads = threads.map((t) => ({
    id: t.id,
    questionText: t.questionText,
    createdAt: t.createdAt,
    subjectId: t.subjectId,
    topicId: t.topicId,
    lastMessage: t.messages[0]
      ? {
          id: t.messages[0].id,
          message: t.messages[0].message,
          sender: t.messages[0].sender,
          createdAt: t.messages[0].createdAt,
        }
      : null,
  }));

  // -------------------------------------
  // 5. RETURN
  // -------------------------------------
  return NextResponse.json({
    threads: formattedThreads,
    pagination: getPaginationMeta(total, page, pageSize),
  });
}
