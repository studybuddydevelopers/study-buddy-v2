// app/api/v1/progress/subject/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE INPUT
  // -------------------------------------
  const body = await req.json().catch(() => null);
  const subjectId = body?.subjectId;
  const progressPercentage = body?.progressPercentage;

  if (!subjectId) {
    return NextResponse.json(
      { error: "subjectId is required" },
      { status: 400 }
    );
  }

  if (progressPercentage == null || isNaN(progressPercentage)) {
    return NextResponse.json(
      { error: "progressPercentage is required and must be a number" },
      { status: 400 }
    );
  }

  // Clamp progress value 0–100
  const clampedProgress = Math.max(0, Math.min(100, Number(progressPercentage)));

  // -------------------------------------
  // 3. VALIDATE SUBJECT EXISTS
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
  // 4. UPSERT PROGRESS
  // -------------------------------------
  const updated = await prisma.progressTrack.upsert({
    where: {
      // Composite uniqueness is not defined in schema,
      // so we use userId + subjectId combination as unique for upsert.
      id: (
        await prisma.progressTrack.findFirst({
          where: { userId: dbUser.id, subjectId },
          select: { id: true },
        })
      )?.id ?? "__new__"
    },
    update: {
      progressPercentage: clampedProgress,
      updatedAt: new Date(),
    },
    create: {
      userId: dbUser.id,
      subjectId,
      progressPercentage: clampedProgress,
    },
  });

  // -------------------------------------
  // 5. RESPONSE
  // -------------------------------------
  return NextResponse.json({
    success: true,
    progress: {
      subjectId: updated.subjectId,
      progressPercentage: updated.progressPercentage,
      updatedAt: updated.updatedAt,
    },
  });
}
