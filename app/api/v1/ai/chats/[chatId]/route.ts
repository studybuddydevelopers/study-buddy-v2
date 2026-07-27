import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getChatService } from "@/lib/ai/chats/chat-service";
import {
  chatRouteErrorResponse,
  parseJsonBody,
} from "@/lib/ai/chats/http";
import { updateChatSchema } from "@/lib/ai/chats/schemas";

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { chatId } = await context.params;

  try {
    const result = await getChatService().getChat(auth.dbUser.id, chatId);
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsed = await parseJsonBody(req, updateChatSchema);
  if (!parsed.success) return parsed.response;

  const { chatId } = await context.params;

  try {
    const result = await getChatService().updateChat(
      auth.dbUser.id,
      chatId,
      parsed.data
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { chatId } = await context.params;

  try {
    const result = await getChatService().deleteChat(auth.dbUser.id, chatId);
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}
