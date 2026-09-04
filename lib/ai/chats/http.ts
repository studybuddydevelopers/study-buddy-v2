import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { chatServiceErrorResponse } from "./errors";
import {
  parseJsonRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";

export async function parseJsonBody<T>(req: Request, schema: ZodSchema<T>) {
  const bodyResult = await parseJsonRequest(req, REQUEST_LIMITS.aiJson);
  if (!bodyResult.ok) {
    return {
      success: false as const,
      response: bodyResult.response,
    };
  }

  const parsed = schema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          error: "INVALID_INPUT",
          message: "Request body validation failed.",
          issues: formatZodIssues(parsed.error),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true as const, data: parsed.data };
}

export function chatRouteErrorResponse(error: unknown) {
  const safe = chatServiceErrorResponse(error);
  return NextResponse.json(safe.body, { status: safe.status });
}

export function getRoutePagination(req: Request) {
  const url = new URL(req.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "0", 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : undefined,
  };
}

function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
