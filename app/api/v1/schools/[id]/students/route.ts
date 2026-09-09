// app/api/v1/schools/[id]/students/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getPagination, getPaginationMeta } from "@/lib/pagination";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

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
          select: {
            profile: {
              select: {
                userId: true,
                firstName: true,
                middleNames: true,
                lastNames: true,
                phoneNumber: true,
                gradeLevel: true,
                examYear: true,
                preferredSubjects: true,
                avatarUrl: true,
              },
            },
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
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const userId =
    typeof parsedBody.data.userId === "string"
      ? parsedBody.data.userId
      : undefined;

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

    logSecurityEvent("school_student_create_failed", "error");
    return NextResponse.json(
      { error: "Failed adding student to school" },
      { status: 500 }
    );
  }
}
