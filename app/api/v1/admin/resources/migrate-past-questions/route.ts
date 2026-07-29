import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { migrateLegacyPastQuestions } from "@/lib/resources/past-question-migration";
import {
  resourceJsonResponse,
  resourceRouteErrorResponse,
} from "@/lib/resources/http";
import { migratePastQuestionsSchema } from "@/lib/resources/schemas";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = migratePastQuestionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Invalid migration request." },
      { status: 400 }
    );
  }

  try {
    const report = await migrateLegacyPastQuestions(parsed.data);
    return resourceJsonResponse({ report });
  } catch (error) {
    return resourceRouteErrorResponse(error);
  }
}
