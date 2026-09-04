// app/api/v1/progress/subject/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

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
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const subjectId =
    typeof parsedBody.data.subjectId === "string"
      ? parsedBody.data.subjectId
      : undefined;
  const progressPercentage = parsedBody.data.progressPercentage;

  if (!subjectId) {
    return NextResponse.json(
      { error: "subjectId is required" },
      { status: 400 }
    );
  }

  if (
    progressPercentage == null ||
    !Number.isFinite(Number(progressPercentage))
  ) {
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
      userId_subjectId: {
        userId: dbUser.id,
        subjectId,
      },
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
