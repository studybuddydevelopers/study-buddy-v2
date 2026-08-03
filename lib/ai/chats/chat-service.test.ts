import { describe, expect, it } from "vitest";
import {
  AiChatMessageStatus,
  AiChatRole,
  AiGroundingConfidence,
  AiGroundingSufficiencyReason,
  AiGroundingSufficiencyStatus,
  AiGenerationFailureCode,
  AiGenerationRequestStatus,
  ResourceApprovalStatus,
  ResourceChunkType,
  ResourceProcessingStatus,
  ResourceSourceKind,
} from "@prisma/client";
import type {
  ChatModelProvider,
  GenerateInput,
  GenerateResult,
  StructuredGenerateInput,
  StructuredGenerateResult,
} from "@/lib/ai/chat/types";
import { ChatProviderError } from "@/lib/ai/chat/errors";
import { GroundedGenerationService } from "@/lib/ai/grounding/grounded-generation-service";
import type {
  ResourceSearchRepository,
  RetrievedChunk,
} from "@/lib/resources/retrieval/types";
import { ChatService } from "./chat-service";
import { ChatServiceError } from "./errors";

type ChatRow = {
  id: string;
  userId: string;
  title: string;
  subjectId: string | null;
  topicId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type MessageRow = {
  id: string;
  chatId: string;
  role: AiChatRole;
  content: string;
  status: AiChatMessageStatus;
  failureCode: AiGenerationFailureCode | null;
  modelProvider: string | null;
  modelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  currentGroundingAttemptId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RequestRow = {
  id: string;
  chatId: string;
  clientRequestId: string;
  userMessageId: string;
  assistantMessageId: string;
  status: AiGenerationRequestStatus;
  attemptCount: number;
  failureCode: AiGenerationFailureCode | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

type GroundingAttemptRow = {
  id: string;
  generationRequestId: string;
  assistantMessageId: string;
  attemptNumber: number;
  retrievalQuery: string;
  embeddingConfigurationId: string | null;
  sufficiencyStatus: AiGroundingSufficiencyStatus;
  sufficiencyReason: AiGroundingSufficiencyReason;
  confidence: AiGroundingConfidence;
  selectedEvidenceMetadata: unknown;
  groundingVersion: string;
  promptVersion: string;
  sufficiencyPolicyVersion: string;
  retrievalDurationMs: number | null;
  generationDurationMs: number | null;
  createdAt: Date;
};

type CitationRow = {
  id: string;
  groundingAttemptId: string;
  messageId: string;
  resourceId: string;
  resourceChunkId: string;
  sourceLabel: string;
  retrievalRank: number | null;
  vectorDistance: number | null;
  keywordRank: number | null;
  fusionScore: number | null;
  contentHash: string;
  createdAt: Date;
};

type ResourceRow = {
  id: string;
  title: string;
  sourceKind: ResourceSourceKind;
  processingStatus: ResourceProcessingStatus;
  approvalStatus: ResourceApprovalStatus;
  activeChunkVersion: number | null;
};

type ResourceChunkRow = {
  id: string;
  resourceId: string;
  version: number;
  chunkType: ResourceChunkType;
  title: string | null;
  content: string;
  contentHash: string;
  pageStart: number | null;
  pageEnd: number | null;
  questionNumber: string | null;
};

class SequenceProvider implements ChatModelProvider {
  invocations = 0;

  constructor(private readonly results: Array<GenerateResult | Error>) {}

  async generate(input: GenerateInput): Promise<GenerateResult> {
    void input;
    this.invocations += 1;
    const next = this.results.shift();
    if (next instanceof Error) throw next;
    return (
      next ?? {
        text: "Generated answer.",
        provider: "fake",
        model: "fake-chat",
      }
    );
  }
}

class StructuredSequenceProvider extends SequenceProvider {
  structuredInvocations = 0;
  structuredInputs: StructuredGenerateInput[] = [];

  constructor(
    results: Array<GenerateResult | Error>,
    private readonly structuredResults: Array<StructuredGenerateResult | Error>
  ) {
    super(results);
  }

  async generateStructured(
    input: StructuredGenerateInput
  ): Promise<StructuredGenerateResult> {
    this.structuredInputs.push(input);
    this.structuredInvocations += 1;
    const next = this.structuredResults.shift();
    if (next instanceof Error) throw next;
    return (
      next ?? {
        value: {
          answer: "Grounded answer. [SOURCE_1]",
          citations: [{ sourceLabel: "SOURCE_1" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      }
    );
  }
}

class InMemoryChatDb {
  subjects = [{ id: "11111111-1111-4111-8111-111111111111", name: "Mathematics", examCode: "MATH" }];
  topics = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      subjectId: "11111111-1111-4111-8111-111111111111",
      title: "Number",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      subjectId: "44444444-4444-4444-8444-444444444444",
      title: "Cells",
    },
  ];
  chats: ChatRow[] = [];
  messages: MessageRow[] = [];
  requests: RequestRow[] = [];
  groundingAttempts: GroundingAttemptRow[] = [];
  citations: CitationRow[] = [];
  resources: ResourceRow[] = [
    {
      id: "resource-1",
      title: "Approved Maths Notes",
      sourceKind: ResourceSourceKind.UPLOAD,
      processingStatus: ResourceProcessingStatus.PROCESSED,
      approvalStatus: ResourceApprovalStatus.APPROVED,
      activeChunkVersion: 1,
    },
  ];
  resourceChunks: ResourceChunkRow[] = [
    {
      id: "chunk-1",
      resourceId: "resource-1",
      version: 1,
      chunkType: ResourceChunkType.CONTENT_SECTION,
      title: "Ratios",
      content: "A ratio compares quantities using division.",
      contentHash: "chunk-hash-1",
      pageStart: 1,
      pageEnd: 1,
      questionNumber: null,
    },
  ];
  private nextId = 1;

  $transaction = async (input: unknown) => {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    if (typeof input === "function") {
      return input(this);
    }

    throw new Error("Unsupported transaction input");
  };

  subject = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.subjects.find((subject) => subject.id === where.id) ?? null,
  };

  topic = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.topics.find((topic) => topic.id === where.id) ?? null,
  };

  aiChat = {
    create: async ({ data }: { data: Partial<ChatRow> }) => {
      const now = this.date();
      const chat: ChatRow = {
        id: data.id ?? this.id("chat"),
        userId: data.userId!,
        title: data.title!,
        subjectId: data.subjectId ?? null,
        topicId: data.topicId ?? null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
        deletedAt: data.deletedAt ?? null,
      };
      this.chats.push(chat);
      return this.withChatRelations(chat);
    },
    findFirst: async ({ where }: { where: Partial<ChatRow> }) => {
      const chat = this.chats.find((item) => this.matches(item, where));
      return chat ? this.withChatRelations(chat) : null;
    },
    findMany: async ({ where, orderBy, skip = 0, take }: {
      where: Partial<ChatRow>;
      orderBy?: Array<Record<string, "asc" | "desc">>;
      skip?: number;
      take?: number;
    }) => {
      const rows = this.chats
        .filter((item) => this.matches(item, where))
        .sort(this.sorter(orderBy));
      return rows.slice(skip, take ? skip + take : undefined).map((row) => this.withChatRelations(row));
    },
    count: async ({ where }: { where: Partial<ChatRow> }) =>
      this.chats.filter((item) => this.matches(item, where)).length,
    update: async ({ where, data }: { where: { id: string }; data: Partial<ChatRow> }) => {
      const chat = this.chats.find((item) => item.id === where.id);
      if (!chat) throw new Error("chat not found");
      Object.assign(chat, data, { updatedAt: data.updatedAt ?? this.date() });
      return this.withChatRelations(chat);
    },
    updateMany: async ({ where, data }: { where: Partial<ChatRow>; data: Partial<ChatRow> }) => {
      let count = 0;
      for (const chat of this.chats) {
        if (!this.matches(chat, where)) continue;
        Object.assign(chat, data, { updatedAt: this.date() });
        count += 1;
      }
      return { count };
    },
  };

  aiChatMessage = {
    create: async ({ data }: { data: Partial<MessageRow> }) => {
      const now = this.date();
      const message: MessageRow = {
        id: data.id ?? this.id("msg"),
        chatId: data.chatId!,
        role: data.role!,
        content: data.content ?? "",
        status: data.status ?? AiChatMessageStatus.COMPLETED,
        failureCode: data.failureCode ?? null,
        modelProvider: data.modelProvider ?? null,
        modelName: data.modelName ?? null,
        inputTokens: data.inputTokens ?? null,
        outputTokens: data.outputTokens ?? null,
        currentGroundingAttemptId: data.currentGroundingAttemptId ?? null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };
      this.messages.push(message);
      return message;
    },
    count: async ({ where }: { where: Partial<MessageRow> }) =>
      this.messages.filter((item) => this.matches(item, where)).length,
    findMany: async ({ where, orderBy, skip = 0, take }: {
      where: Partial<MessageRow>;
      orderBy?: Array<Record<string, "asc" | "desc">>;
      skip?: number;
      take?: number;
    }) => {
      const rows = this.messages
        .filter((item) => this.matches(item, where))
        .sort(this.sorter(orderBy));
      return rows
        .slice(skip, take ? skip + take : undefined)
        .map((message) => this.withMessageRequest(message));
    },
    updateMany: async ({ where, data }: { where: Partial<MessageRow>; data: Partial<MessageRow> }) => {
      let count = 0;
      for (const message of this.messages) {
        if (!this.matches(message, where)) continue;
        Object.assign(message, data, { updatedAt: this.date() });
        count += 1;
      }
      return { count };
    },
  };

  aiGenerationRequest = {
    create: async ({ data }: { data: Partial<RequestRow> }) => {
      if (
        this.requests.some(
          (item) =>
            item.chatId === data.chatId &&
            item.clientRequestId === data.clientRequestId
        )
      ) {
        throw new Error("unique request conflict");
      }

      const now = this.date();
      const request: RequestRow = {
        id: data.id ?? this.id("req"),
        chatId: data.chatId!,
        clientRequestId: data.clientRequestId!,
        userMessageId: data.userMessageId!,
        assistantMessageId: data.assistantMessageId!,
        status: data.status ?? AiGenerationRequestStatus.PENDING,
        attemptCount: data.attemptCount ?? 1,
        failureCode: data.failureCode ?? null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
        completedAt: data.completedAt ?? null,
      };
      this.requests.push(request);
      return this.withRequestMessages(request);
    },
    findUnique: async ({ where }: {
      where:
        | { id: string }
        | { chatId_clientRequestId: { chatId: string; clientRequestId: string } };
    }) => {
      const request =
        "id" in where
          ? this.requests.find((item) => item.id === where.id)
          : this.requests.find(
              (item) =>
                item.chatId === where.chatId_clientRequestId.chatId &&
                item.clientRequestId === where.chatId_clientRequestId.clientRequestId
            );
      return request ? this.withRequestMessages(request) : null;
    },
    findFirst: async ({ where }: { where: Partial<RequestRow> }) => {
      const request = this.requests.find((item) => this.matches(item, where));
      return request ? this.withRequestMessages(request) : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<RequestRow> }) => {
      const request = this.requests.find((item) => item.id === where.id);
      if (!request) throw new Error("request not found");
      Object.assign(request, data, { updatedAt: this.date() });
      return this.withRequestMessages(request);
    },
    updateMany: async ({ where, data }: { where: Partial<RequestRow>; data: Partial<RequestRow> & { attemptCount?: { increment: number } } }) => {
      let count = 0;
      for (const request of this.requests) {
        if (!this.matches(request, where)) continue;
        const attemptCount = data.attemptCount
          ? request.attemptCount + data.attemptCount.increment
          : request.attemptCount;
        Object.assign(request, data, {
          attemptCount,
          updatedAt: this.date(),
        });
        count += 1;
      }
      return { count };
    },
  };

  aiGroundingAttempt = {
    create: async ({ data }: { data: Partial<GroundingAttemptRow> }) => {
      const now = this.date();
      const attempt: GroundingAttemptRow = {
        id: data.id ?? this.id("attempt"),
        generationRequestId: data.generationRequestId!,
        assistantMessageId: data.assistantMessageId!,
        attemptNumber: data.attemptNumber!,
        retrievalQuery: data.retrievalQuery!,
        embeddingConfigurationId: data.embeddingConfigurationId ?? null,
        sufficiencyStatus: data.sufficiencyStatus!,
        sufficiencyReason: data.sufficiencyReason!,
        confidence: data.confidence!,
        selectedEvidenceMetadata: data.selectedEvidenceMetadata ?? [],
        groundingVersion: data.groundingVersion!,
        promptVersion: data.promptVersion!,
        sufficiencyPolicyVersion: data.sufficiencyPolicyVersion!,
        retrievalDurationMs: data.retrievalDurationMs ?? null,
        generationDurationMs: data.generationDurationMs ?? null,
        createdAt: data.createdAt ?? now,
      };
      this.groundingAttempts.push(attempt);
      return attempt;
    },
  };

  aiMessageCitation = {
    createMany: async ({ data }: { data: Array<Partial<CitationRow>> }) => {
      for (const row of data) {
        this.citations.push({
          id: row.id ?? this.id("citation"),
          groundingAttemptId: row.groundingAttemptId!,
          messageId: row.messageId!,
          resourceId: row.resourceId!,
          resourceChunkId: row.resourceChunkId!,
          sourceLabel: row.sourceLabel!,
          retrievalRank: row.retrievalRank ?? null,
          vectorDistance: row.vectorDistance ?? null,
          keywordRank: row.keywordRank ?? null,
          fusionScore: row.fusionScore ?? null,
          contentHash: row.contentHash!,
          createdAt: row.createdAt ?? this.date(),
        });
      }
      return { count: data.length };
    },
    findFirst: async ({ where }: { where: { id: string; message?: { chatId?: string; role?: AiChatRole } } }) => {
      const citation = this.citations.find((item) => item.id === where.id);
      if (!citation) return null;
      const message = this.messages.find((item) => item.id === citation.messageId);
      if (!message) return null;
      if (where.message?.chatId && message.chatId !== where.message.chatId) return null;
      if (where.message?.role && message.role !== where.message.role) return null;
      const groundingAttempt = this.groundingAttempts.find(
        (item) => item.id === citation.groundingAttemptId
      )!;
      const resource = this.resources.find((item) => item.id === citation.resourceId)!;
      const resourceChunk = this.resourceChunks.find(
        (item) => item.id === citation.resourceChunkId
      )!;

      return {
        ...citation,
        groundingAttempt,
        message: {
          id: message.id,
          chatId: message.chatId,
          currentGroundingAttemptId: message.currentGroundingAttemptId,
        },
        resource,
        resourceChunk,
      };
    },
  };

  seedChat(input: Partial<ChatRow>) {
    const now = this.date();
    const chat: ChatRow = {
      id: input.id ?? this.id("chat"),
      userId: input.userId ?? "user-a",
      title: input.title ?? "New chat",
      subjectId: input.subjectId ?? null,
      topicId: input.topicId ?? null,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      deletedAt: input.deletedAt ?? null,
    };
    this.chats.push(chat);
    return chat;
  }

  private id(prefix: string) {
    this.nextId += 1;
    return `${prefix}-${this.nextId}`;
  }

  private date() {
    const value = new Date(`2026-07-27T12:00:${String(this.nextId).padStart(2, "0")}Z`);
    this.nextId += 1;
    return value;
  }

  private withChatRelations(chat: ChatRow) {
    return {
      ...chat,
      subject: this.subjects.find((item) => item.id === chat.subjectId) ?? null,
      topic: this.topics.find((item) => item.id === chat.topicId) ?? null,
      messages: this.messages
        .filter(
          (message) =>
            message.chatId === chat.id && message.role === AiChatRole.USER
        )
        .slice(0, 1)
        .map((message) => ({ id: message.id })),
    };
  }

  private withRequestMessages(request: RequestRow) {
    return {
      ...request,
      userMessage: this.withMessageRequest(
        this.messages.find((item) => item.id === request.userMessageId)!
      ),
      assistantMessage: this.withMessageRequest(
        this.messages.find((item) => item.id === request.assistantMessageId)!
      ),
    };
  }

  private withMessageRequest(message: MessageRow) {
    const userGenerationRequest =
      message.role === AiChatRole.USER
        ? this.requests.find((item) => item.userMessageId === message.id) ?? null
        : null;
    const assistantGenerationRequest =
      message.role === AiChatRole.ASSISTANT
        ? this.requests.find((item) => item.assistantMessageId === message.id) ?? null
        : null;
    return {
      ...message,
      userGenerationRequest,
      assistantGenerationRequest,
      currentGroundingAttempt: message.currentGroundingAttemptId
        ? this.withGroundingAttempt(message.currentGroundingAttemptId)
        : null,
    };
  }

  private withGroundingAttempt(attemptId: string) {
    const attempt = this.groundingAttempts.find((item) => item.id === attemptId);
    if (!attempt) return null;
    return {
      ...attempt,
      citations: this.citations
        .filter((citation) => citation.groundingAttemptId === attempt.id)
        .sort((a, b) => a.sourceLabel.localeCompare(b.sourceLabel)),
    };
  }

  private matches<T extends Record<string, unknown>>(item: T, where: Partial<T>) {
    return Object.entries(where).every(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        "not" in value
      ) {
        return item[key] !== (value as { not: unknown }).not;
      }
      return item[key] === value;
    });
  }

  private sorter(orderBy?: Array<Record<string, "asc" | "desc">>) {
    return (a: Record<string, unknown>, b: Record<string, unknown>) => {
      for (const order of orderBy ?? []) {
        const [key, direction] = Object.entries(order)[0] ?? [];
        if (!key) continue;
        const left = a[key] instanceof Date ? (a[key] as Date).getTime() : String(a[key]);
        const right = b[key] instanceof Date ? (b[key] as Date).getTime() : String(b[key]);
        if (left === right) continue;
        return (left > right ? 1 : -1) * (direction === "desc" ? -1 : 1);
      }
      return 0;
    };
  }
}

function createService(
  db = new InMemoryChatDb(),
  provider = new SequenceProvider([
    { text: "Generated answer.", provider: "fake", model: "fake-chat" },
  ])
) {
  return {
    db,
    provider,
    service: new ChatService(db as never, provider),
  };
}

function retrievedChunk(input: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: input.id ?? "chunk-1",
    resourceId: input.resourceId ?? "resource-1",
    resourceTitle: input.resourceTitle ?? "Approved Maths Notes",
    sourceKind: input.sourceKind ?? ResourceSourceKind.UPLOAD,
    chunkIndex: input.chunkIndex ?? 0,
    chunkType: input.chunkType ?? ResourceChunkType.CONTENT_SECTION,
    title: input.title ?? "Ratios",
    content: input.content ?? "A ratio compares quantities using division.",
    snippet: input.snippet ?? "A ratio compares quantities...",
    contentHash: input.contentHash ?? "chunk-hash-1",
    subjectId: input.subjectId ?? null,
    topicId: input.topicId ?? null,
    questionNumber: input.questionNumber ?? null,
    vectorRank: input.vectorRank ?? null,
    vectorDistance: input.vectorDistance ?? 0.2,
    keywordRank: input.keywordRank ?? 1,
    keywordScore: input.keywordScore ?? 0.3,
    exactSignals: input.exactSignals ?? [],
    fusionScore: input.fusionScore ?? 0.05,
    bestBranchRank: input.bestBranchRank ?? 1,
    alternateProvenance: input.alternateProvenance ?? [],
  };
}

class FakeSearchRepository implements ResourceSearchRepository {
  calls = 0;

  constructor(private readonly chunks: RetrievedChunk[]) {}

  async keywordSearch() {
    return this.chunks;
  }

  async vectorSearch() {
    return this.chunks;
  }

  async hybridSearch() {
    this.calls += 1;
    return this.chunks;
  }

  async getActiveEmbeddingConfiguration() {
    return null;
  }
}

describe("ChatService Stage 1 lifecycle", () => {
  it("rejects another user's chat", async () => {
    const { db, service } = createService();
    db.seedChat({ id: "chat-1", userId: "owner" });

    await expect(service.getChat("intruder", "chat-1")).rejects.toMatchObject({
      code: "CHAT_NOT_FOUND",
    });
  });

  it("does not expose soft-deleted chats", async () => {
    const { db, service } = createService();
    db.seedChat({ id: "chat-1", userId: "user-a", deletedAt: new Date() });

    await expect(service.getChat("user-a", "chat-1")).rejects.toMatchObject({
      code: "CHAT_NOT_FOUND",
    });
  });

  it("validates that a topic belongs to the selected subject", async () => {
    const { service } = createService();

    await expect(
      service.createChat("user-a", {
        subjectId: "11111111-1111-4111-8111-111111111111",
        topicId: "33333333-3333-4333-8333-333333333333",
      })
    ).rejects.toMatchObject({
      code: "INVALID_SUBJECT_TOPIC",
    });
  });

  it("clears an invalid old topic when the subject changes without replacement", async () => {
    const { db, service } = createService();
    db.subjects.push({ id: "44444444-4444-4444-8444-444444444444", name: "Biology", examCode: "BIO" });
    db.seedChat({
      id: "chat-1",
      userId: "user-a",
      subjectId: "11111111-1111-4111-8111-111111111111",
      topicId: "22222222-2222-4222-8222-222222222222",
    });

    const result = await service.updateChat("user-a", "chat-1", {
      subjectId: "44444444-4444-4444-8444-444444444444",
    });

    expect(result.chat.subjectId).toBe("44444444-4444-4444-8444-444444444444");
    expect(result.chat.topicId).toBeNull();
  });

  it("allows an empty chat to change subject and topic", async () => {
    const { db, service } = createService();
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const result = await service.updateChat("user-a", "chat-1", {
      subjectId: "11111111-1111-4111-8111-111111111111",
      topicId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.chat.subjectId).toBe("11111111-1111-4111-8111-111111111111");
    expect(result.chat.topicId).toBe("22222222-2222-4222-8222-222222222222");
    expect(result.chat.isStarted).toBe(false);
  });

  it("rejects subject changes after the first user message", async () => {
    const { db, service } = createService();
    db.subjects.push({ id: "44444444-4444-4444-8444-444444444444", name: "Biology", examCode: "BIO" });
    db.seedChat({
      id: "chat-1",
      userId: "user-a",
      subjectId: "11111111-1111-4111-8111-111111111111",
      topicId: "22222222-2222-4222-8222-222222222222",
    });
    await db.aiChatMessage.create({
      data: {
        chatId: "chat-1",
        role: AiChatRole.USER,
        content: "Started",
        status: AiChatMessageStatus.COMPLETED,
      },
    });

    await expect(
      service.updateChat("user-a", "chat-1", {
        subjectId: "44444444-4444-4444-8444-444444444444",
      })
    ).rejects.toMatchObject({
      code: "CHAT_LOCKED",
      status: 409,
    });
  });

  it("rejects topic changes after the first user message", async () => {
    const { db, service } = createService();
    db.seedChat({
      id: "chat-1",
      userId: "user-a",
      subjectId: "11111111-1111-4111-8111-111111111111",
      topicId: "22222222-2222-4222-8222-222222222222",
    });
    await db.aiChatMessage.create({
      data: {
        chatId: "chat-1",
        role: AiChatRole.USER,
        content: "Started",
        status: AiChatMessageStatus.COMPLETED,
      },
    });

    await expect(
      service.updateChat("user-a", "chat-1", {
        topicId: null,
      })
    ).rejects.toMatchObject({
      code: "CHAT_LOCKED",
      status: 409,
    });
  });

  it("allows rename after a chat has started", async () => {
    const { db, service } = createService();
    db.seedChat({
      id: "chat-1",
      userId: "user-a",
      title: "Before",
      subjectId: "11111111-1111-4111-8111-111111111111",
      topicId: "22222222-2222-4222-8222-222222222222",
    });
    await db.aiChatMessage.create({
      data: {
        chatId: "chat-1",
        role: AiChatRole.USER,
        content: "Started",
        status: AiChatMessageStatus.COMPLETED,
      },
    });

    const result = await service.updateChat("user-a", "chat-1", {
      title: "After",
    });

    expect(result.chat.title).toBe("After");
    expect(result.chat.subjectId).toBe("11111111-1111-4111-8111-111111111111");
    expect(result.chat.topicId).toBe("22222222-2222-4222-8222-222222222222");
    expect(result.chat.isStarted).toBe(true);
  });

  it("creates one user message and an empty pending assistant before successful completion", async () => {
    const { db, service } = createService();
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const result = await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-1",
    });

    expect(db.messages.filter((message) => message.role === AiChatRole.USER)).toHaveLength(1);
    expect(db.messages.filter((message) => message.role === AiChatRole.ASSISTANT)).toHaveLength(1);
    expect(db.requests).toHaveLength(1);
    expect(result.userMessage.content).toBe("Explain ratios");
    expect(result.assistantMessage.content).toBe("Generated answer.");
    expect(result.assistantMessage.status).toBe(AiChatMessageStatus.COMPLETED);
  });

  it("duplicate completed requests do not regenerate", async () => {
    const { db, provider, service } = createService();
    db.seedChat({ id: "chat-1", userId: "user-a" });

    await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-1",
    });
    const duplicate = await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-1",
    });

    expect(provider.invocations).toBe(1);
    expect(duplicate.generated).toBe(false);
    expect(db.messages.filter((message) => message.role === AiChatRole.USER)).toHaveLength(1);
  });

  it("lists persisted two-turn messages in chronological chat order", async () => {
    const { db, service } = createService(
      new InMemoryChatDb(),
      new SequenceProvider([
        { text: "Assistant 1", provider: "fake", model: "fake-chat" },
        { text: "Assistant 2", provider: "fake", model: "fake-chat" },
      ])
    );
    db.seedChat({ id: "chat-1", userId: "user-a" });

    await service.sendMessage("user-a", "chat-1", {
      message: "User 1",
      clientRequestId: "request-1",
    });
    await service.sendMessage("user-a", "chat-1", {
      message: "User 2",
      clientRequestId: "request-2",
    });

    const result = await service.listMessages("user-a", "chat-1");

    expect(result.messages.map((message) => message.role)).toEqual([
      AiChatRole.USER,
      AiChatRole.ASSISTANT,
      AiChatRole.USER,
      AiChatRole.ASSISTANT,
    ]);
    expect(result.messages.map((message) => message.content)).toEqual([
      "User 1",
      "Assistant 1",
      "User 2",
      "Assistant 2",
    ]);
  });

  it("duplicate pending requests return pending state and do not regenerate", async () => {
    const { db, provider, service } = createService();
    db.seedChat({ id: "chat-1", userId: "user-a" });
    const userMessage = await db.aiChatMessage.create({
      data: { chatId: "chat-1", role: AiChatRole.USER, content: "Hi", status: AiChatMessageStatus.COMPLETED },
    });
    const assistantMessage = await db.aiChatMessage.create({
      data: { chatId: "chat-1", role: AiChatRole.ASSISTANT, content: "", status: AiChatMessageStatus.PENDING },
    });
    await db.aiGenerationRequest.create({
      data: {
        chatId: "chat-1",
        clientRequestId: "request-pending",
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        status: AiGenerationRequestStatus.PENDING,
      },
    });

    const duplicate = await service.sendMessage("user-a", "chat-1", {
      message: "Hi",
      clientRequestId: "request-pending",
    });

    expect(provider.invocations).toBe(0);
    expect(duplicate.request.status).toBe(AiGenerationRequestStatus.PENDING);
  });

  it("failed retry updates the existing assistant and does not duplicate the user message", async () => {
    const db = new InMemoryChatDb();
    const provider = new SequenceProvider([
      new ChatProviderError(AiGenerationFailureCode.PROVIDER_ERROR),
      { text: "Recovered answer.", provider: "fake", model: "fake-chat" },
    ]);
    const service = new ChatService(db as never, provider);
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const failed = await service.sendMessage("user-a", "chat-1", {
      message: "Explain indices",
      clientRequestId: "request-failed",
    });

    expect(failed.assistantMessage.requestId).toBe(failed.request.id);
    expect(failed.assistantMessage.requestStatus).toBe(
      AiGenerationRequestStatus.FAILED
    );

    const retry = await service.retryGeneration(
      "user-a",
      "chat-1",
      failed.request.id
    );

    expect(db.messages.filter((message) => message.role === AiChatRole.USER)).toHaveLength(1);
    expect(db.messages.filter((message) => message.role === AiChatRole.ASSISTANT)).toHaveLength(1);
    expect(retry.assistantMessage.id).toBe(failed.assistantMessage.id);
    expect(retry.assistantMessage.content).toBe("Recovered answer.");
  });

  it("two concurrent retries trigger at most one provider invocation", async () => {
    const db = new InMemoryChatDb();
    const provider = new SequenceProvider([
      new ChatProviderError(AiGenerationFailureCode.PROVIDER_ERROR),
      { text: "Retry answer.", provider: "fake", model: "fake-chat" },
      { text: "Should not be used.", provider: "fake", model: "fake-chat" },
    ]);
    const service = new ChatService(db as never, provider);
    db.seedChat({ id: "chat-1", userId: "user-a" });
    const failed = await service.sendMessage("user-a", "chat-1", {
      message: "Explain algebra",
      clientRequestId: "request-retry",
    });
    provider.invocations = 0;

    await Promise.all([
      service.retryGeneration("user-a", "chat-1", failed.request.id),
      service.retryGeneration("user-a", "chat-1", failed.request.id),
    ]);

    expect(provider.invocations).toBeLessThanOrEqual(1);
  });

  it("empty provider output marks the request and assistant as INVALID_PROVIDER_RESPONSE", async () => {
    const db = new InMemoryChatDb();
    const provider = new SequenceProvider([{ text: "   ", provider: "fake", model: "fake-chat" }]);
    const service = new ChatService(db as never, provider);
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const result = await service.sendMessage("user-a", "chat-1", {
      message: "Explain decimals",
      clientRequestId: "request-empty",
    });

    expect(result.request.status).toBe(AiGenerationRequestStatus.FAILED);
    expect(result.assistantMessage.requestId).toBe(result.request.id);
    expect(result.assistantMessage.status).toBe(AiChatMessageStatus.FAILED);
    expect(result.assistantMessage.content).toBe("");
    expect(result.assistantMessage.failureCode).toBe(AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE);
  });

  it("rejects generation requests whose messages are not in the same chat", async () => {
    const { db, service } = createService();
    db.seedChat({ id: "chat-1", userId: "user-a" });
    db.seedChat({ id: "chat-2", userId: "user-a" });
    const userMessage = await db.aiChatMessage.create({
      data: { chatId: "chat-2", role: AiChatRole.USER, content: "Hi", status: AiChatMessageStatus.COMPLETED },
    });
    const assistantMessage = await db.aiChatMessage.create({
      data: { chatId: "chat-1", role: AiChatRole.ASSISTANT, content: "", status: AiChatMessageStatus.PENDING },
    });
    await db.aiGenerationRequest.create({
      data: {
        chatId: "chat-1",
        clientRequestId: "request-bad",
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        status: AiGenerationRequestStatus.PENDING,
      },
    });

    await expect(
      service.sendMessage("user-a", "chat-1", {
        message: "Hi",
        clientRequestId: "request-bad",
      })
    ).rejects.toBeInstanceOf(ChatServiceError);
  });

  it("chat and message pagination are bounded and stably ordered", async () => {
    const { db, service } = createService();
    const sameDate = new Date("2026-07-27T12:00:00Z");
    db.seedChat({ id: "chat-b", userId: "user-a", updatedAt: sameDate });
    db.seedChat({ id: "chat-a", userId: "user-a", updatedAt: sameDate });
    db.seedChat({ id: "chat-c", userId: "user-a", updatedAt: sameDate });

    const chats = await service.listChats("user-a", { page: 1, pageSize: 500 });
    expect(chats.pagination.pageSize).toBe(50);
    expect(chats.chats.map((chat) => chat.id)).toEqual(["chat-c", "chat-b", "chat-a"]);

    await db.aiChatMessage.create({
      data: { id: "msg-b", chatId: "chat-a", role: AiChatRole.USER, content: "B", status: AiChatMessageStatus.COMPLETED, createdAt: sameDate },
    });
    await db.aiChatMessage.create({
      data: { id: "msg-a", chatId: "chat-a", role: AiChatRole.USER, content: "A", status: AiChatMessageStatus.COMPLETED, createdAt: sameDate },
    });
    const messages = await service.listMessages("user-a", "chat-a", { page: 1, pageSize: 500 });
    expect(messages.pagination.pageSize).toBe(100);
    expect(messages.messages.map((message) => message.id)).toEqual(["msg-a", "msg-b"]);
  });

  it("feature-gated grounded generation persists an attempt and visible citations", async () => {
    const db = new InMemoryChatDb();
    const provider = new StructuredSequenceProvider([], [
      {
        value: {
          answer: "A ratio compares quantities using division. [SOURCE_1]",
          citations: [{ sourceLabel: "SOURCE_1" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
        usage: { inputTokens: 10, outputTokens: 12 },
      },
    ]);
    const searchRepository = new FakeSearchRepository([retrievedChunk()]);
    const service = new ChatService(db as never, provider, {
      groundedChatEnabled: true,
      groundingService: new GroundedGenerationService({ searchRepository }),
    });
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const result = await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-grounded",
    });

    expect(searchRepository.calls).toBe(1);
    expect(provider.structuredInvocations).toBe(1);
    expect(db.groundingAttempts).toHaveLength(1);
    expect(db.citations).toHaveLength(1);
    expect(result.assistantMessage.content).toContain("[SOURCE_1]");
    expect(result.assistantMessage.citations).toHaveLength(1);
    expect(result.assistantMessage.grounding?.insufficientContext).toBe(false);
    expect(
      db.messages.find((message) => message.id === result.assistantMessage.id)
        ?.currentGroundingAttemptId
    ).toBe(db.groundingAttempts[0].id);
  });

  it("grounded no-result cases complete with deterministic refusal and no model call", async () => {
    const db = new InMemoryChatDb();
    const provider = new StructuredSequenceProvider([], []);
    const service = new ChatService(db as never, provider, {
      groundedChatEnabled: true,
      groundingService: new GroundedGenerationService({
        searchRepository: new FakeSearchRepository([]),
      }),
    });
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const result = await service.sendMessage("user-a", "chat-1", {
      message: "What is the official WAEC question this year?",
      clientRequestId: "request-refusal",
    });

    expect(provider.structuredInvocations).toBe(0);
    expect(db.groundingAttempts).toHaveLength(1);
    expect(db.citations).toHaveLength(0);
    expect(result.assistantMessage.status).toBe(AiChatMessageStatus.COMPLETED);
    expect(result.assistantMessage.grounding?.insufficientContext).toBe(true);
    expect(result.assistantMessage.content).toContain("approved StudyBuddy material");
  });

  it("grounded retry creates a new attempt and refreshes current citations", async () => {
    const db = new InMemoryChatDb();
    const provider = new StructuredSequenceProvider([], [
      {
        value: {
          answer: "Bad citation.",
          citations: [{ sourceLabel: "SOURCE_9" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      },
      {
        value: {
          answer: "Still bad.",
          citations: [{ sourceLabel: "SOURCE_9" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      },
      {
        value: {
          answer: "Recovered grounded answer. [SOURCE_1]",
          citations: [{ sourceLabel: "SOURCE_1" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      },
    ]);
    const service = new ChatService(db as never, provider, {
      groundedChatEnabled: true,
      groundingService: new GroundedGenerationService({
        searchRepository: new FakeSearchRepository([retrievedChunk()]),
      }),
    });
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const failed = await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-retry-grounded",
    });
    expect(failed.request.status).toBe(AiGenerationRequestStatus.FAILED);
    expect(db.groundingAttempts).toHaveLength(1);
    expect(db.citations).toHaveLength(0);

    const retry = await service.retryGeneration(
      "user-a",
      "chat-1",
      failed.request.id
    );

    expect(db.messages.filter((message) => message.role === AiChatRole.USER)).toHaveLength(1);
    expect(db.messages.filter((message) => message.role === AiChatRole.ASSISTANT)).toHaveLength(1);
    expect(db.groundingAttempts).toHaveLength(2);
    expect(db.citations).toHaveLength(1);
    expect(db.groundingAttempts.map((attempt) => attempt.attemptNumber)).toEqual([1, 2]);
    expect(retry.assistantMessage.id).toBe(failed.assistantMessage.id);
    expect(retry.assistantMessage.citations).toHaveLength(1);
    expect(retry.assistantMessage.content).toContain("Recovered");
  });

  it("sends only the safe validation reason into the single structured repair attempt", async () => {
    const db = new InMemoryChatDb();
    const provider = new StructuredSequenceProvider([], [
      {
        value: {
          answer: "Citation object but no marker.",
          citations: [{ sourceLabel: "SOURCE_1" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      },
      {
        value: {
          answer: "A ratio compares quantities. [SOURCE_1]",
          citations: [{ sourceLabel: "SOURCE_1" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      },
    ]);
    const service = new ChatService(db as never, provider, {
      groundedChatEnabled: true,
      groundingService: new GroundedGenerationService({
        searchRepository: new FakeSearchRepository([retrievedChunk()]),
      }),
    });
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const result = await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-repair-message",
    });

    expect(result.request.status).toBe(AiGenerationRequestStatus.COMPLETED);
    expect(provider.structuredInvocations).toBe(2);
    const repairMessage = provider.structuredInputs[1]?.messages.at(-1)?.content;
    expect(repairMessage).toContain(
      "Citation markers and objects differ."
    );
    expect(repairMessage).toContain("Cite only supplied SOURCE labels");
    expect(repairMessage).not.toContain("api key");
  });

  it("marks grounded generations failed when citation persistence fails", async () => {
    const db = new InMemoryChatDb();
    db.aiMessageCitation.createMany = async () => {
      throw new Error("citation persistence failed");
    };
    const provider = new StructuredSequenceProvider([], [
      {
        value: {
          answer: "A ratio compares quantities. [SOURCE_1]",
          citations: [{ sourceLabel: "SOURCE_1" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      },
    ]);
    const service = new ChatService(db as never, provider, {
      groundedChatEnabled: true,
      groundingService: new GroundedGenerationService({
        searchRepository: new FakeSearchRepository([retrievedChunk()]),
      }),
    });
    db.seedChat({ id: "chat-1", userId: "user-a" });

    const result = await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-citation-fail",
    });

    expect(result.request.status).toBe(AiGenerationRequestStatus.FAILED);
    expect(result.assistantMessage.status).toBe(AiChatMessageStatus.FAILED);
    expect(result.assistantMessage.content).toBe("");
    expect(result.assistantMessage.citations).toHaveLength(0);
    const errorCode =
      "error" in result
        ? (result.error as { code?: string } | undefined)?.code
        : undefined;
    expect(errorCode).toBe("INTERNAL_ERROR");
  });

  it("citation preview enforces ownership and returns bounded historical evidence", async () => {
    const db = new InMemoryChatDb();
    const provider = new StructuredSequenceProvider([], [
      {
        value: {
          answer: "A ratio compares quantities. [SOURCE_1]",
          citations: [{ sourceLabel: "SOURCE_1" }],
          insufficientContext: false,
        },
        provider: "fake",
        model: "fake-structured",
      },
    ]);
    const service = new ChatService(db as never, provider, {
      groundedChatEnabled: true,
      groundingService: new GroundedGenerationService({
        searchRepository: new FakeSearchRepository([retrievedChunk()]),
      }),
    });
    db.seedChat({ id: "chat-1", userId: "user-a" });
    const result = await service.sendMessage("user-a", "chat-1", {
      message: "Explain ratios",
      clientRequestId: "request-preview",
    });
    const citationId = result.assistantMessage.citations[0].id;

    const preview = await service.getCitationPreview(
      "user-a",
      "chat-1",
      citationId
    );

    expect(preview.chunk.excerpt).toContain("ratio compares quantities");
    expect(preview.citation.isCurrentForMessage).toBe(true);
    await expect(
      service.getCitationPreview("intruder", "chat-1", citationId)
    ).rejects.toMatchObject({ code: "CHAT_NOT_FOUND" });
  });
});
