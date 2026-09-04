import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getChatService } from "@/lib/ai/chats/chat-service";
import { chatRouteErrorResponse } from "@/lib/ai/chats/http";
import { enforceAiRequestLimits } from "@/lib/security/rate-limit";

interface RouteContext {
  params: Promise<{ chatId: string; requestId: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const aiLimitResponse = await enforceAiRequestLimits({
    accountId: auth.dbUser.id,
    requestHeaders: req.headers,
  });
  if (aiLimitResponse) return aiLimitResponse;

  const { chatId, requestId } = await context.params;

  try {
    const result = await getChatService().retryGeneration(
      auth.dbUser.id,
      chatId,
      requestId
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}
