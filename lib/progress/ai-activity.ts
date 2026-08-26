import { AiChatRole } from "@prisma/client";

interface CountDelegate<TWhere> {
  count(args: { where: TWhere }): Promise<number>;
}

interface AiActivityDb {
  aiQuestion: CountDelegate<{ userId: string }>;
  aiChat: CountDelegate<{
    userId: string;
    deletedAt: null;
    messages: { some: { role: AiChatRole } };
  }>;
}

export interface AiActivitySummary {
  threadsStarted: number;
  totalQuestionsAsked: number;
  legacyThreadsStarted: number;
  persistentThreadsStarted: number;
}

export async function getAiActivitySummary(
  db: AiActivityDb,
  userId: string
): Promise<AiActivitySummary> {
  const [legacyThreadsStarted, persistentThreadsStarted] = await Promise.all([
    db.aiQuestion.count({ where: { userId } }),
    db.aiChat.count({
      where: {
        userId,
        deletedAt: null,
        messages: { some: { role: AiChatRole.USER } },
      },
    }),
  ]);

  const threadsStarted = legacyThreadsStarted + persistentThreadsStarted;

  return {
    threadsStarted,
    totalQuestionsAsked: threadsStarted,
    legacyThreadsStarted,
    persistentThreadsStarted,
  };
}
