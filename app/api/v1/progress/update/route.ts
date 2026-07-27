// app/api/v1/progress/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isRecord } from "@/lib/type-utils";

interface ProgressUpdateInput {
  subjectId: string;
  progressPercentage: unknown;
}

interface NormalizedProgressUpdate {
  subjectId: string;
  progressPercentage: number;
}

function isProgressUpdateInput(value: unknown): value is ProgressUpdateInput {
  return (
    isRecord(value) &&
    typeof value.subjectId === "string" &&
    value.subjectId.length > 0 &&
    "progressPercentage" in value
  );
}

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
  const body: unknown = await req.json().catch(() => null);
  const rawUpdates = isRecord(body) ? body.updates : undefined;

  if (!Array.isArray(rawUpdates) || rawUpdates.length === 0) {
    return NextResponse.json(
      { error: "updates must be a non-empty array" },
      { status: 400 }
    );
  }

  const updates: ProgressUpdateInput[] = [];
  for (const item of rawUpdates) {
    if (!isProgressUpdateInput(item)) {
      return NextResponse.json(
        {
          error:
            "Each update must include subjectId and progressPercentage fields",
        },
        { status: 400 }
      );
    }
    updates.push(item);
  }

  // -----------------------------------------
  // 3. VALIDATION: Ensure all subjectIds exist
  // -----------------------------------------
  const subjectIds = updates.map((u) => u.subjectId);

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true },
  });

  const validSubjectIds = new Set(subjects.map((s) => s.id));

  const invalid = updates.filter((u) => !validSubjectIds.has(u.subjectId));

  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: "Some subjectIds are invalid",
        invalidSubjectIds: invalid.map((i) => i.subjectId),
      },
      { status: 400 }
    );
  }

  const normalizedUpdates: NormalizedProgressUpdate[] = [];
  for (const item of updates) {
    const percentage = Number(item.progressPercentage);

    if (Number.isNaN(percentage)) {
      return NextResponse.json(
        { error: `Invalid progressPercentage for subject ${item.subjectId}` },
        { status: 400 }
      );
    }

    normalizedUpdates.push({
      subjectId: item.subjectId,
      progressPercentage: Math.max(0, Math.min(100, percentage)),
    });
  }

  // -----------------------------------------
  // 4. CREATE UPSERT OPERATIONS
  // -----------------------------------------
  const operations = normalizedUpdates.map((item) => {
    const subjectId = item.subjectId;
    return prisma.progressTrack.upsert({
      where: {
        userId_subjectId: {
          userId: dbUser.id,
          subjectId,
        },
      },
      update: {
        progressPercentage: item.progressPercentage,
        updatedAt: new Date(),
      },
      create: {
        userId: dbUser.id,
        subjectId,
        progressPercentage: item.progressPercentage,
      },
    });
  });

  // -----------------------------------------
  // 5. RUN TRANSACTION
  // -----------------------------------------
  const results = await prisma.$transaction(operations);

  // -----------------------------------------
  // 6. RESPONSE
  // -----------------------------------------
  return NextResponse.json({
    success: true,
    updated: results.map((r) => ({
      subjectId: r.subjectId,
      progressPercentage: r.progressPercentage,
      updatedAt: r.updatedAt,
    })),
  });
}
