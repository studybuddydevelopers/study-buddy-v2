import { NextResponse } from "next/server";
import { requireAiUser } from "@/lib/auth";
import { getChatReport, submitChatReport } from "@/lib/ai/chat-report-service";
import { chatReportSchema } from "@/lib/ai/chat-report";
import { chatRouteErrorResponse, parseJsonBody } from "@/lib/ai/chats/http";
import {
  enforceRateLimitRules,
  getClientIp,
} from "@/lib/security/rate-limit";

type Context = { params: Promise<{ chatId: string; messageId: string }> };
const headers = { "Cache-Control": "no-store" };
const REPORT_RATE_LIMIT_WINDOW_MS = 60 * 60_000;

export async function GET(_request: Request, context: Context) {
  const auth = await requireAiUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { chatId, messageId } = await context.params;
  try {
    return NextResponse.json({ report: await getChatReport(auth.dbUser.id, chatId, messageId) }, { headers });
  } catch (error) { return chatRouteErrorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  const auth = await requireAiUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const parsed = await parseJsonBody(request, chatReportSchema);
  if (!parsed.success) return parsed.response;
  const limited = await enforceRateLimitRules([
    {
      scope: "chat-report:account",
      identifier: auth.dbUser.id,
      limit: 20,
      windowMs: REPORT_RATE_LIMIT_WINDOW_MS,
    },
    {
      scope: "chat-report:ip",
      identifier: getClientIp(request.headers),
      limit: 300,
      windowMs: REPORT_RATE_LIMIT_WINDOW_MS,
    },
  ]);
  if (limited) return limited;
  const { chatId, messageId } = await context.params;
  try {
    return NextResponse.json({ report: await submitChatReport(auth.dbUser.id, chatId, messageId, parsed.data) }, { headers });
  } catch (error) { return chatRouteErrorResponse(error); }
}
