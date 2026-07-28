import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getChatService } from "@/lib/ai/chats/chat-service";
import { chatRouteErrorResponse } from "@/lib/ai/chats/http";

interface RouteContext {
  params: Promise<{ chatId: string; requestId: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

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
