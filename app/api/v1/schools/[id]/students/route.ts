// app/api/v1/schools/[id]/students/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // -------------------------------------
  // 1. AUTH (Admin required)
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  const schoolId = params.id;

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
  const students = await prisma.schoolStudent.findMany({
    where: { schoolId },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({
    schoolId,
    students: students.map((s) => ({
      id: s.id,
      userId: s.userId,
      joinedAt: s.joinedAt,
      profile: s.user.profile ?? null,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // -------------------------------------
  // 1. AUTH (Admin required)
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  const schoolId = params.id;

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
  } catch (err: any) {
    // Unique constraint error (already added)
    if (err.code === "P2002") {
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
