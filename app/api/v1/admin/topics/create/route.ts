// app/api/v1/admin/topics/create/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // -------------------------------------
  // 2. PARSE JSON BODY
  // -------------------------------------
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  if (examOutlineRef && typeof examOutlineRef !== "string") {
    return NextResponse.json(
      { error: "examOutlineRef must be a string" },
      { status: 400 }
    );
  }

  if (difficulty !== undefined && typeof difficulty !== "number") {
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
      examOutlineRef: examOutlineRef ?? null,
      difficulty: difficulty ?? null,
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
