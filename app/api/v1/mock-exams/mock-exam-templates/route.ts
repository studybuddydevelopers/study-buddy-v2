// app/api/v1/mock-exams/mock-exam-templates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security/audit-log";

export async function GET() {
  try {
    // -------------------------------------
    // 1. FETCH ALL TEMPLATES
    // -------------------------------------
    const templates = await prisma.mockExamTemplate.findMany({
      orderBy: { title: "asc" },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // -------------------------------------
    // 2. FORMAT RESPONSE
    // -------------------------------------
    return NextResponse.json(
      templates.map((t) => ({
        id: t.id,
        subjectId: t.subjectId,
        title: t.title,
        description: t.description,
        questionCount: t.questionCount,
        subject: t.subject,
      }))
    );
  } catch {
    logSecurityEvent("mock_exam_templates_load_failed", "error");
    return NextResponse.json(
      { error: "Failed to fetch mock exam templates" },
      { status: 500 }
    );
  }
}
