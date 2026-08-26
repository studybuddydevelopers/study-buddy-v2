import { AiChatRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { getAiActivitySummary } from "./ai-activity";

interface LegacyThread {
  userId: string;
}

interface ChatThread {
  id: string;
  userId: string;
  deletedAt: Date | null;
}

interface ChatMessage {
  chatId: string;
  role: AiChatRole;
}

function fakeDb({
  legacyThreads = [],
  chats = [],
  messages = [],
}: {
  legacyThreads?: LegacyThread[];
  chats?: ChatThread[];
  messages?: ChatMessage[];
}) {
  return {
    aiQuestion: {
      count: vi.fn(async ({ where }: { where: { userId: string } }) =>
        legacyThreads.filter((thread) => thread.userId === where.userId).length
      ),
    },
    aiChat: {
      count: vi.fn(
        async ({
          where,
        }: {
          where: {
            userId: string;
            deletedAt: null;
            messages: { some: { role: AiChatRole } };
          };
        }) =>
          chats.filter(
            (chat) =>
              chat.userId === where.userId &&
              chat.deletedAt === where.deletedAt &&
              messages.some(
                (message) =>
                  message.chatId === chat.id &&
                  message.role === where.messages.some.role
              )
          ).length
      ),
    },
  };
}

describe("getAiActivitySummary", () => {
  it("counts legacy Q&A threads and started persistent chats", async () => {
    const db = fakeDb({
      legacyThreads: [{ userId: "user-1" }],
      chats: [
        { id: "started-chat", userId: "user-1", deletedAt: null },
        { id: "empty-chat", userId: "user-1", deletedAt: null },
        { id: "deleted-chat", userId: "user-1", deletedAt: new Date() },
        { id: "other-user-chat", userId: "user-2", deletedAt: null },
      ],
      messages: [
        { chatId: "started-chat", role: AiChatRole.USER },
        { chatId: "deleted-chat", role: AiChatRole.USER },
        { chatId: "other-user-chat", role: AiChatRole.USER },
      ],
    });

    const summary = await getAiActivitySummary(db, "user-1");

    expect(summary).toEqual({
      threadsStarted: 2,
      totalQuestionsAsked: 2,
      legacyThreadsStarted: 1,
      persistentThreadsStarted: 1,
    });
    expect(db.aiChat.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        deletedAt: null,
        messages: { some: { role: AiChatRole.USER } },
      },
    });
  });
});
