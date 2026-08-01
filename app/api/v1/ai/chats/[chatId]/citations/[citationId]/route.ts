import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getChatService } from "@/lib/ai/chats/chat-service";
import { chatRouteErrorResponse } from "@/lib/ai/chats/http";

interface RouteContext {
  params: Promise<{ chatId: string; citationId: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { chatId, citationId } = await context.params;

  try {
    const result = await getChatService().getCitationPreview(
      auth.dbUser.id,
      chatId,
      citationId
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}
