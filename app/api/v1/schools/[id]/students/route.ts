// app/api/v1/schools/[id]/students/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getPagination, getPaginationMeta } from "@/lib/pagination";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // -------------------------------------
  // 1. AUTH (Admin required)
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  const schoolId = (await params).id;
  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = getPagination(searchParams, {
    defaultPageSize: 20,
    maxPageSize: 50,
  });

  // -------------------------------------
  // 2. VALIDATE SCHOOL
  // -------------------------------------
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  if (!school) {
    return NextResponse.json(
      { error: "School not found" },
      { status: 404 }
    );
  }

  // -------------------------------------
  // 3. GET STUDENTS
  // -------------------------------------
  const [students, total] = await prisma.$transaction([
    prisma.schoolStudent.findMany({
      where: { schoolId },
      skip,
      take: pageSize,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.schoolStudent.count({ where: { schoolId } }),
  ]);

  return NextResponse.json({
    schoolId,
    students: students.map((s) => ({
      id: s.id,
      userId: s.userId,
      joinedAt: s.joinedAt,
      profile: s.user.profile ?? null,
    })),
    pagination: getPaginationMeta(total, page, pageSize),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // -------------------------------------
  // 1. AUTH (Admin required)
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  const schoolId = (await params).id;

  // -------------------------------------
  // 2. PARSE INPUT
  // -------------------------------------
  const body = await req.json().catch(() => null);
  const userId = body?.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. VALIDATE SCHOOL
  // -------------------------------------
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  if (!school) {
    return NextResponse.json(
      { error: "School not found" },
      { status: 404 }
    );
  }

  // -------------------------------------
  // 4. VALIDATE USER
  // -------------------------------------
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // -------------------------------------
  // 5. ADD STUDENT TO SCHOOL (RESPECT UNIQUE CONSTRAINT)
  // -------------------------------------
  try {
    const schoolStudent = await prisma.schoolStudent.create({
      data: {
        schoolId,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: schoolStudent.id,
        userId: schoolStudent.userId,
        joinedAt: schoolStudent.joinedAt,
      },
    });
  } catch (err: unknown) {
    // Unique constraint error (already added)
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "User is already a student in this school" },
        { status: 400 }
      );
    }

    console.error("SCHOOL STUDENT CREATE ERROR:", err);
    return NextResponse.json(
      { error: "Failed adding student to school" },
      { status: 500 }
    );
  }
}
