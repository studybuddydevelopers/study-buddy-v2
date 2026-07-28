import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getChatService } from "@/lib/ai/chats/chat-service";
import {
  chatRouteErrorResponse,
  getRoutePagination,
  parseJsonBody,
} from "@/lib/ai/chats/http";
import { sendChatMessageSchema } from "@/lib/ai/chats/schemas";

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { chatId } = await context.params;

  try {
    const result = await getChatService().listMessages(
      auth.dbUser.id,
      chatId,
      getRoutePagination(req)
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsed = await parseJsonBody(req, sendChatMessageSchema);
  if (!parsed.success) return parsed.response;

  const { chatId } = await context.params;

  try {
    const result = await getChatService().sendMessage(
      auth.dbUser.id,
      chatId,
      parsed.data
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}
