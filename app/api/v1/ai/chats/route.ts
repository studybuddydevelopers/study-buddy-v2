import { NextResponse } from "next/server";
import { requireAiUser } from "@/lib/auth";
import { getChatService } from "@/lib/ai/chats/chat-service";
import {
  chatRouteErrorResponse,
  getRoutePagination,
  parseJsonBody,
} from "@/lib/ai/chats/http";
import { chatTitleSearchSchema, createChatSchema } from "@/lib/ai/chats/schemas";

export async function GET(req: Request) {
  const auth = await requireAiUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const search = chatTitleSearchSchema.safeParse(new URL(req.url).searchParams.get("q") ?? "");
  if (!search.success) {
    return NextResponse.json({ message: "Search titles using 120 characters or fewer." }, { status: 400 });
  }

  try {
    const result = await getChatService().listChats(
      auth.dbUser.id,
      getRoutePagination(req),
      search.data
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatRouteErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const auth = await requireAiUser();
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
