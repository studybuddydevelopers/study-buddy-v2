import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getChatService } from "@/lib/ai/chats/chat-service";
import {
  chatRouteErrorResponse,
  getRoutePagination,
  parseJsonBody,
} from "@/lib/ai/chats/http";
import { createChatSchema } from "@/lib/ai/chats/schemas";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const result = await getChatService().listChats(
      auth.dbUser.id,
      getRoutePagination(req)
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsed = await parseJsonBody(req, createChatSchema);
  if (!parsed.success) return parsed.response;

  try {
    const result = await getChatService().createChat(auth.dbUser.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}
