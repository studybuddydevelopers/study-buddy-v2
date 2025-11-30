// app/api/v1/progress/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  // -----------------------------------------
  // 1. AUTH
  // -----------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -----------------------------------------
  // 2. PARSE INPUT
  // -----------------------------------------
  const body = await req.json().catch(() => null);
  const updates = body?.updates;

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "updates must be a non-empty array" },
      { status: 400 }
    );
  }

  // -----------------------------------------
  // 3. VALIDATION: Ensure all subjectIds exist
  // -----------------------------------------
  const subjectIds = updates.map((u: any) => u.subjectId);

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true }
  });

  const validSubjectIds = new Set(subjects.map((s) => s.id));

  const invalid = updates.filter((u: any) => !validSubjectIds.has(u.subjectId));

  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: "Some subjectIds are invalid",
        invalidSubjectIds: invalid.map((i: any) => i.subjectId),
      },
      { status: 400 }
    );
  }

  // -----------------------------------------
  // 4. GET EXISTING PROGRESS TRACKS
  // -----------------------------------------
  const existingTracks = await prisma.progressTrack.findMany({
    where: {
      userId: dbUser.id,
      subjectId: { in: subjectIds }
    }
  });

  const existingMap = new Map(existingTracks.map((t) => [t.subjectId, t]));

  const operations = [];

  // -----------------------------------------
  // 5. CREATE UPDATE OPERATIONS
  // -----------------------------------------
  for (const item of updates) {
    const subjectId = item.subjectId;
    const percentage = Number(item.progressPercentage);

    if (isNaN(percentage)) {
      return NextResponse.json(
        { error: `Invalid progressPercentage for subject ${subjectId}` },
        { status: 400 }
      );
    }

    const clamped = Math.max(0, Math.min(100, percentage));
    const existing = existingMap.get(subjectId);

    if (existing) {
      // UPDATE
      operations.push(
        prisma.progressTrack.update({
          where: { id: existing.id },
          data: {
            progressPercentage: clamped,
            updatedAt: new Date(),
          }
        })
      );
    } else {
      // CREATE
      operations.push(
        prisma.progressTrack.create({
          data: {
            userId: dbUser.id,
            subjectId,
            progressPercentage: clamped,
          }
        })
      );
    }
  }

  // -----------------------------------------
  // 6. RUN TRANSACTION
  // -----------------------------------------
  const results = await prisma.$transaction(operations);

  // -----------------------------------------
  // 7. RESPONSE
  // -----------------------------------------
  return NextResponse.json({
    success: true,
    updated: results.map((r) => ({
      subjectId: r.subjectId,
      progressPercentage: r.progressPercentage,
      updatedAt: r.updatedAt
    }))
  });
}
