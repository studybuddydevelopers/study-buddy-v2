// app/api/v1/admin/past-questions/batch/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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
  let body;
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
    if (!item.subjectId || !item.questionText || !item.answerText) {
      results.push({
        index: i,
        success: false,
        error: "Missing required fields (subjectId, questionText, answerText)",
      });
      continue;
    }

    // Optional numeric validations
    if (item.year && typeof item.year !== "number") {
      results.push({
        index: i,
        success: false,
        error: "year must be a number",
      });
      continue;
    }

    if (item.difficulty && typeof item.difficulty !== "number") {
      results.push({
        index: i,
        success: false,
        error: "difficulty must be a number",
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
    } catch (err: any) {
      results.push({
        index: i,
        success: false,
        error: err?.message || "Database error",
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
