// app/api/v1/admin/past-questions/batch/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getErrorMessage, isRecord } from "@/lib/type-utils";

interface PastQuestionBatchInput {
  subjectId: string;
  topicId?: string | null;
  questionText: string;
  questionImageUrl?: string | null;
  answerText: string;
  explanationText?: string | null;
  year?: number | null;
  questionNumber?: string | null;
  difficulty?: number | null;
}

function isPastQuestionBatchInput(
  value: unknown
): value is PastQuestionBatchInput {
  if (!isRecord(value)) return false;

  return (
    typeof value.subjectId === "string" &&
    value.subjectId.length > 0 &&
    typeof value.questionText === "string" &&
    value.questionText.length > 0 &&
    typeof value.answerText === "string" &&
    value.answerText.length > 0 &&
    (value.topicId === undefined ||
      value.topicId === null ||
      typeof value.topicId === "string") &&
    (value.questionImageUrl === undefined ||
      value.questionImageUrl === null ||
      typeof value.questionImageUrl === "string") &&
    (value.explanationText === undefined ||
      value.explanationText === null ||
      typeof value.explanationText === "string") &&
    (value.year === undefined ||
      value.year === null ||
      typeof value.year === "number") &&
    (value.questionNumber === undefined ||
      value.questionNumber === null ||
      typeof value.questionNumber === "string") &&
    (value.difficulty === undefined ||
      value.difficulty === null ||
      typeof value.difficulty === "number")
  );
}

/**
 * POST /v1/admin/past-questions/batch
 *
 * Accepts a JSON array of past questions:
 *
 * [
 *   {
 *     subjectId: string,
 *     topicId?: string,
 *     questionText: string,
 *     answerText: string,
 *     explanationText?: string,
 *     year?: number,
 *     questionNumber?: string,
 *     difficulty?: number
 *   }
 * ]
 */
export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH (Admin Required)
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // -------------------------------------
  // 2. Parse Input
  // -------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be an array of past questions" },
      { status: 400 }
    );
  }

  if (body.length === 0) {
    return NextResponse.json(
      { error: "At least one question is required" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. Validate Each Entry
  // -------------------------------------
  const results: {
    index: number;
    success: boolean;
    id?: string;
    error?: string;
  }[] = [];

  for (let i = 0; i < body.length; i++) {
    const item = body[i];

    // Required fields
    if (!isPastQuestionBatchInput(item)) {
      results.push({
        index: i,
        success: false,
        error:
          "Each item must include string subjectId, questionText, and answerText; optional fields must match their expected types",
      });
      continue;
    }

    // -------------------------------------
    // 4. Insert Into Database
    // -------------------------------------
    try {
      const record = await prisma.pastQuestion.create({
        data: {
          subjectId: item.subjectId,
          topicId: item.topicId ?? null,
          questionText: item.questionText,
          questionImageUrl: item.questionImageUrl ?? null,
          answerText: item.answerText,
          explanationText: item.explanationText ?? null,
          year: item.year ?? null,
          questionNumber: item.questionNumber ?? null,
          difficulty: item.difficulty ?? null,
        },
      });

      results.push({
        index: i,
        success: true,
        id: record.id,
      });
    } catch (err: unknown) {
      results.push({
        index: i,
        success: false,
        error: getErrorMessage(err, "Database error"),
      });
    }
  }

  // -------------------------------------
  // 5. Response
  // -------------------------------------
  return NextResponse.json({
    total: body.length,
    inserted: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
