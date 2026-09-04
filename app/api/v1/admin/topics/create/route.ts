// app/api/v1/admin/topics/create/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // -------------------------------------
  // 2. PARSE JSON BODY
  // -------------------------------------
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const { subjectId, title, examOutlineRef, difficulty } = body;

  // -------------------------------------
  // 3. VALIDATION
  // -------------------------------------
  if (!subjectId || typeof subjectId !== "string") {
    return NextResponse.json(
      { error: "subjectId is required and must be a string" },
      { status: 400 }
    );
  }

  if (!title || typeof title !== "string") {
    return NextResponse.json(
      { error: "title is required and must be a string" },
      { status: 400 }
    );
  }

  if (
    examOutlineRef !== undefined &&
    examOutlineRef !== null &&
    typeof examOutlineRef !== "string"
  ) {
    return NextResponse.json(
      { error: "examOutlineRef must be a string" },
      { status: 400 }
    );
  }

  if (
    difficulty !== undefined &&
    difficulty !== null &&
    typeof difficulty !== "number"
  ) {
    return NextResponse.json(
      { error: "difficulty must be a number" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 4. CHECK SUBJECT EXISTS
  // -------------------------------------
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    return NextResponse.json(
      { error: "Subject not found" },
      { status: 404 }
    );
  }

  // -------------------------------------
  // 5. CREATE TOPIC
  // -------------------------------------
  const topic = await prisma.topic.create({
    data: {
      subjectId,
      title,
      examOutlineRef: (examOutlineRef as string | null | undefined) ?? null,
      difficulty: (difficulty as number | null | undefined) ?? null,
    },
  });

  // -------------------------------------
  // 6. RESPONSE
  // -------------------------------------
  return NextResponse.json(
    {
      id: topic.id,
      subjectId: topic.subjectId,
      title: topic.title,
      examOutlineRef: topic.examOutlineRef,
      difficulty: topic.difficulty,
    },
    { status: 201 }
  );
}
