// app/api/v1/mock-exams/mock-exam-templates/route.ts
import { NextResponse } from "next/server";
import { MockExamFormat } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { WRITTEN_MOCK_AI_CREDIT_COST } from "@/lib/mock-exam-ai-credits";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { getDailyAiCreditBalance } from "@/lib/security/rate-limit";

export async function GET() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

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
    const aiCredits = await getDailyAiCreditBalance(dbUser.id);

    // -------------------------------------
    // 2. FORMAT RESPONSE
    // -------------------------------------
    return NextResponse.json(
      templates.map((t) => {
        const requiresAiCredit = t.format === MockExamFormat.WRITTEN;
        const canStart =
          !requiresAiCredit ||
          (dbUser.aiAccessAuthorized &&
            aiCredits.remaining >= WRITTEN_MOCK_AI_CREDIT_COST);
        const startBlockedReason = !requiresAiCredit
          ? null
          : !dbUser.aiAccessAuthorized
            ? "AI access must be authorised before you can start this written paper."
            : !canStart
              ? `You need ${WRITTEN_MOCK_AI_CREDIT_COST} AI credits to start this written paper. Your daily credits reset tomorrow.`
              : null;

        return {
          id: t.id,
          subjectId: t.subjectId,
          title: t.title,
          description: t.description,
          questionCount: t.questionCount,
          format: t.format,
          durationMinutes: t.durationMinutes,
          totalMarks: t.totalMarks,
          requiredQuestionCount: t.requiredQuestionCount,
          subject: t.subject,
          canStart,
          startBlockedReason,
          aiCreditsRequired: requiresAiCredit
            ? WRITTEN_MOCK_AI_CREDIT_COST
            : 0,
          aiCreditsRemaining: aiCredits.remaining,
          aiCreditsResetAt: aiCredits.resetsAt,
        };
      })
    );
  } catch {
    logSecurityEvent("mock_exam_templates_load_failed", "error");
    return NextResponse.json(
      { error: "Failed to fetch mock exam templates" },
      { status: 500 }
    );
  }
}
