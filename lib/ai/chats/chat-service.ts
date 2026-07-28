import {
  AiChatMessageStatus,
  AiChatRole,
  AiGenerationFailureCode,
  AiGenerationRequestStatus,
  Prisma,
} from "@prisma/client";
import { getSafeProviderFailureCode } from "@/lib/ai/chat/errors";
import { getChatModelProvider } from "@/lib/ai/chat/provider";
import type {
  ChatModelProvider,
  GenerateMessage,
  GenerateResult,
  GenerateUsage,
} from "@/lib/ai/chat/types";
import { getPaginationMeta } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { CreateChatInput, SendChatMessageInput, UpdateChatInput } from "./schemas";
import { ChatServiceError } from "./errors";

const DEFAULT_CHAT_TITLE = "New chat";
const CHAT_PAGE_SIZE_DEFAULT = 20;
const CHAT_PAGE_SIZE_MAX = 50;
const MESSAGE_PAGE_SIZE_DEFAULT = 50;
const MESSAGE_PAGE_SIZE_MAX = 100;

const chatInclude = {
  subject: { select: { id: true, name: true, examCode: true } },
  topic: { select: { id: true, title: true, subjectId: true } },
  messages: {
    where: { role: AiChatRole.USER },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.AiChatInclude;

const requestInclude = {
  userMessage: true,
  assistantMessage: true,
} satisfies Prisma.AiGenerationRequestInclude;

const messageInclude = {
  userGenerationRequest: {
    select: {
      id: true,
      status: true,
      failureCode: true,
      attemptCount: true,
      completedAt: true,
      clientRequestId: true,
    },
  },
  assistantGenerationRequest: {
    select: {
      id: true,
      status: true,
      failureCode: true,
      attemptCount: true,
      completedAt: true,
      clientRequestId: true,
    },
  },
} satisfies Prisma.AiChatMessageInclude;

type PrismaClient = typeof prisma;
type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient;
type AiChatWithRelations = Prisma.AiChatGetPayload<{ include: typeof chatInclude }>;
type AiGenerationWithMessages = Prisma.AiGenerationRequestGetPayload<{
  include: typeof requestInclude;
}>;
type AiChatMessageWithRequest = Prisma.AiChatMessageGetPayload<{
  include: typeof messageInclude;
}>;

interface PaginationInput {
  page?: number;
  pageSize?: number;
}

interface InitializedGeneration {
  kind: "created" | "existing";
  retryRequired?: boolean;
  chat: AiChatWithRelations;
  request: AiGenerationWithMessages;
}

interface RetryAcquireResult {
  kind: "acquired" | "existing";
  chat: AiChatWithRelations;
  request: AiGenerationWithMessages;
}

function normalizePagination(
  input: PaginationInput | undefined,
  defaultPageSize: number,
  maxPageSize: number
) {
  const page = Number.isFinite(input?.page) && Number(input?.page) > 0
    ? Math.floor(Number(input?.page))
    : 1;
  const requestedPageSize =
    Number.isFinite(input?.pageSize) && Number(input?.pageSize) > 0
      ? Math.floor(Number(input?.pageSize))
      : defaultPageSize;
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

function truncateTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 80) return normalized;
  return `${normalized.slice(0, 77).trim()}...`;
}

function initialTitle(input?: string | null) {
  return input ? truncateTitle(input) : DEFAULT_CHAT_TITLE;
}

function deriveTitleFromMessage(message: string) {
  return initialTitle(message);
}

function serializeChat(chat: AiChatWithRelations) {
  return {
    id: chat.id,
    title: chat.title,
    subjectId: chat.subjectId,
    topicId: chat.topicId,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    deletedAt: chat.deletedAt?.toISOString() ?? null,
    subject: chat.subject,
    topic: chat.topic,
    isStarted: chat.messages.length > 0,
  };
}

function serializeGenerationRequest(request: AiGenerationWithMessages) {
  return {
    id: request.id,
    chatId: request.chatId,
    clientRequestId: request.clientRequestId,
    userMessageId: request.userMessageId,
    assistantMessageId: request.assistantMessageId,
    status: request.status,
    attemptCount: request.attemptCount,
    failureCode: request.failureCode,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    completedAt: request.completedAt?.toISOString() ?? null,
  };
}

function serializeMessage(message: AiChatMessageWithRequest | AiGenerationWithMessages["userMessage"]) {
  const request =
    "assistantGenerationRequest" in message
      ? message.assistantGenerationRequest ?? message.userGenerationRequest
      : null;

  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    content: message.content,
    status: message.status,
    failureCode: message.failureCode,
    modelProvider: message.modelProvider,
    modelName: message.modelName,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    requestId: request?.id ?? null,
    requestStatus: request?.status ?? null,
    clientRequestId: request?.clientRequestId ?? null,
  };
}

function serializeGenerationMessage(
  message: AiGenerationWithMessages["userMessage"],
  request: AiGenerationWithMessages
) {
  return {
    ...serializeMessage(message),
    requestId: request.id,
    requestStatus: request.status,
    clientRequestId: request.clientRequestId,
  };
}

function getTokenValue(value: number | undefined) {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw new ChatServiceError(
      "INVALID_PROVIDER_RESPONSE",
      502,
      "The AI provider returned invalid token usage."
    );
  }

  return Math.floor(value);
}

function validateProviderResult(result: GenerateResult) {
  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (!text) {
    throw new ChatServiceError(
      "INVALID_PROVIDER_RESPONSE",
      502,
      "The AI provider returned an empty response."
    );
  }

  const provider =
    typeof result.provider === "string" && result.provider.trim()
      ? result.provider.trim().slice(0, 80)
      : "unknown";
  const model =
    typeof result.model === "string" && result.model.trim()
      ? result.model.trim().slice(0, 120)
      : "unknown";
  const usage: GenerateUsage = result.usage ?? {};

  return {
    text,
    provider,
    model,
    inputTokens: getTokenValue(usage.inputTokens),
    outputTokens: getTokenValue(usage.outputTokens),
  };
}

function mapServiceFailureCode(error: unknown) {
  if (
    error instanceof ChatServiceError &&
    error.code === "INVALID_PROVIDER_RESPONSE"
  ) {
    return AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE;
  }

  return getSafeProviderFailureCode(error);
}

function mapServiceErrorCode(failureCode: AiGenerationFailureCode) {
  switch (failureCode) {
    case AiGenerationFailureCode.PROVIDER_TIMEOUT:
      return "PROVIDER_TIMEOUT";
    case AiGenerationFailureCode.RATE_LIMITED:
      return "RATE_LIMITED";
    case AiGenerationFailureCode.PROVIDER_ERROR:
      return "PROVIDER_ERROR";
    case AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE:
      return "INVALID_PROVIDER_RESPONSE";
    case AiGenerationFailureCode.INTERNAL_ERROR:
    default:
      return "INTERNAL_ERROR";
  }
}

function ensureSameChat(request: AiGenerationWithMessages) {
  if (
    request.userMessage.chatId !== request.chatId ||
    request.assistantMessage.chatId !== request.chatId
  ) {
    throw new ChatServiceError(
      "INTERNAL_ERROR",
      500,
      "Generation request message ownership is inconsistent."
    );
  }
}

export class ChatService {
  private resolvedProvider: ChatModelProvider | null = null;

  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly provider?: ChatModelProvider
  ) {}

  async createChat(userId: string, input: CreateChatInput) {
    await this.validateSubjectTopic(this.db, input.subjectId ?? null, input.topicId ?? null);

    const chat = await this.db.aiChat.create({
      data: {
        userId,
        title: initialTitle(input.title),
        subjectId: input.subjectId ?? null,
        topicId: input.topicId ?? null,
      },
      include: chatInclude,
    });

    return { chat: serializeChat(chat) };
  }

  async listChats(userId: string, pagination?: PaginationInput) {
    const page = normalizePagination(
      pagination,
      CHAT_PAGE_SIZE_DEFAULT,
      CHAT_PAGE_SIZE_MAX
    );

    const [total, chats] = await this.db.$transaction([
      this.db.aiChat.count({
        where: { userId, deletedAt: null },
      }),
      this.db.aiChat.findMany({
        where: { userId, deletedAt: null },
        include: chatInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: page.skip,
        take: page.pageSize,
      }),
    ]);

    return {
      chats: chats.map(serializeChat),
      pagination: getPaginationMeta(total, page.page, page.pageSize),
    };
  }

  async getChat(userId: string, chatId: string) {
    const chat = await this.findOwnedActiveChat(this.db, userId, chatId);
    return { chat: serializeChat(chat) };
  }

  async updateChat(userId: string, chatId: string, input: UpdateChatInput) {
    const chat = await this.db.$transaction(async (tx) => {
      const existing = await this.findOwnedActiveChat(tx, userId, chatId);

      const subjectProvided = Object.prototype.hasOwnProperty.call(
        input,
        "subjectId"
      );
      const topicProvided = Object.prototype.hasOwnProperty.call(input, "topicId");
      const nextSubjectId = subjectProvided
        ? input.subjectId ?? null
        : existing.subjectId;
      const subjectChanged = nextSubjectId !== existing.subjectId;
      const nextTopicId = topicProvided
        ? input.topicId ?? null
        : subjectChanged
          ? null
          : existing.topicId;
      const classificationChanged =
        nextSubjectId !== existing.subjectId || nextTopicId !== existing.topicId;

      if (classificationChanged && existing.messages.length > 0) {
        throw new ChatServiceError(
          "CHAT_LOCKED",
          409,
          "Subject and topic cannot be changed after a chat has started."
        );
      }

      await this.validateSubjectTopic(tx, nextSubjectId, nextTopicId);

      return tx.aiChat.update({
        where: { id: chatId },
        data: {
          title: input.title ? truncateTitle(input.title) : undefined,
          subjectId: nextSubjectId,
          topicId: nextTopicId,
        },
        include: chatInclude,
      });
    });

    return { chat: serializeChat(chat) };
  }

  async deleteChat(userId: string, chatId: string) {
    const update = await this.db.aiChat.updateMany({
      where: { id: chatId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (update.count !== 1) {
      throw new ChatServiceError("CHAT_NOT_FOUND", 404, "Chat not found.");
    }

    return { success: true };
  }

  async listMessages(userId: string, chatId: string, pagination?: PaginationInput) {
    await this.findOwnedActiveChat(this.db, userId, chatId);

    const page = normalizePagination(
      pagination,
      MESSAGE_PAGE_SIZE_DEFAULT,
      MESSAGE_PAGE_SIZE_MAX
    );

    const [total, messages] = await this.db.$transaction([
      this.db.aiChatMessage.count({ where: { chatId } }),
      this.db.aiChatMessage.findMany({
        where: { chatId },
        include: messageInclude,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: page.skip,
        take: page.pageSize,
      }),
    ]);

    return {
      messages: messages.map(serializeMessage),
      pagination: getPaginationMeta(total, page.page, page.pageSize),
    };
  }

  async sendMessage(userId: string, chatId: string, input: SendChatMessageInput) {
    const initialized = await this.initializeGeneration(userId, chatId, input);

    if (initialized.kind === "existing") {
      return this.serializeGenerationResult(initialized, false);
    }

    return this.generateAndPersist(initialized, "send");
  }

  async retryGeneration(userId: string, chatId: string, requestId: string) {
    const acquired = await this.acquireRetry(userId, chatId, requestId);

    if (acquired.kind === "existing") {
      return this.serializeGenerationResult(acquired, false);
    }

    return this.generateAndPersist(acquired, "retry");
  }

  private async initializeGeneration(
    userId: string,
    chatId: string,
    input: SendChatMessageInput
  ): Promise<InitializedGeneration> {
    try {
      return await this.db.$transaction(async (tx) => {
        const chat = await this.findOwnedActiveChat(tx, userId, chatId);
        const existing = await tx.aiGenerationRequest.findUnique({
          where: {
            chatId_clientRequestId: {
              chatId,
              clientRequestId: input.clientRequestId,
            },
          },
          include: requestInclude,
        });

        if (existing) {
          ensureSameChat(existing);
          return {
            kind: "existing",
            retryRequired:
              existing.status === AiGenerationRequestStatus.FAILED,
            chat,
            request: existing,
          };
        }

        const userMessage = await tx.aiChatMessage.create({
          data: {
            chatId,
            role: AiChatRole.USER,
            content: input.message,
            status: AiChatMessageStatus.COMPLETED,
          },
        });

        const assistantMessage = await tx.aiChatMessage.create({
          data: {
            chatId,
            role: AiChatRole.ASSISTANT,
            content: "",
            status: AiChatMessageStatus.PENDING,
            createdAt: new Date(userMessage.createdAt.getTime() + 1),
          },
        });

        const request = await tx.aiGenerationRequest.create({
          data: {
            chatId,
            clientRequestId: input.clientRequestId,
            userMessageId: userMessage.id,
            assistantMessageId: assistantMessage.id,
            status: AiGenerationRequestStatus.PENDING,
            attemptCount: 1,
          },
          include: requestInclude,
        });

        const title =
          chat.title === DEFAULT_CHAT_TITLE
            ? deriveTitleFromMessage(input.message)
            : chat.title;
        const updatedChat = await tx.aiChat.update({
          where: { id: chatId },
          data: { title, updatedAt: new Date() },
          include: chatInclude,
        });

        return {
          kind: "created",
          chat: updatedChat,
          request,
        };
      });
    } catch (error) {
      if (this.isUniqueRequestConflict(error)) {
        return this.getExistingGenerationForClientRequest(
          userId,
          chatId,
          input.clientRequestId
        );
      }

      throw error;
    }
  }

  private async getExistingGenerationForClientRequest(
    userId: string,
    chatId: string,
    clientRequestId: string
  ): Promise<InitializedGeneration> {
    const chat = await this.findOwnedActiveChat(this.db, userId, chatId);
    const request = await this.db.aiGenerationRequest.findUnique({
      where: { chatId_clientRequestId: { chatId, clientRequestId } },
      include: requestInclude,
    });

    if (!request) {
      throw new ChatServiceError(
        "REQUEST_CONFLICT",
        409,
        "Generation request conflict could not be resolved."
      );
    }

    ensureSameChat(request);
    return {
      kind: "existing",
      retryRequired: request.status === AiGenerationRequestStatus.FAILED,
      chat,
      request,
    };
  }

  private async acquireRetry(
    userId: string,
    chatId: string,
    requestId: string
  ): Promise<RetryAcquireResult> {
    return this.db.$transaction(async (tx) => {
      const chat = await this.findOwnedActiveChat(tx, userId, chatId);
      const request = await tx.aiGenerationRequest.findFirst({
        where: { id: requestId, chatId },
        include: requestInclude,
      });

      if (!request) {
        throw new ChatServiceError("CHAT_NOT_FOUND", 404, "Request not found.");
      }
      ensureSameChat(request);

      const acquired = await tx.aiGenerationRequest.updateMany({
        where: {
          id: requestId,
          chatId,
          status: AiGenerationRequestStatus.FAILED,
        },
        data: {
          status: AiGenerationRequestStatus.PENDING,
          attemptCount: { increment: 1 },
          failureCode: null,
          completedAt: null,
        },
      });

      if (acquired.count !== 1) {
        const latest = await tx.aiGenerationRequest.findUnique({
          where: { id: requestId },
          include: requestInclude,
        });

        if (!latest) {
          throw new ChatServiceError("CHAT_NOT_FOUND", 404, "Request not found.");
        }

        ensureSameChat(latest);
        if (
          latest.status === AiGenerationRequestStatus.PENDING ||
          latest.status === AiGenerationRequestStatus.COMPLETED
        ) {
          return { kind: "existing", chat, request: latest };
        }

        throw new ChatServiceError(
          "REQUEST_CONFLICT",
          409,
          "The generation request is not retryable right now."
        );
      }

      const reset = await tx.aiChatMessage.updateMany({
        where: { id: request.assistantMessageId, chatId },
        data: {
          content: "",
          status: AiChatMessageStatus.PENDING,
          failureCode: null,
          modelProvider: null,
          modelName: null,
          inputTokens: null,
          outputTokens: null,
        },
      });

      if (reset.count !== 1) {
        throw new ChatServiceError(
          "INTERNAL_ERROR",
          500,
          "Assistant message could not be reset for retry."
        );
      }

      const latest = await tx.aiGenerationRequest.findUnique({
        where: { id: requestId },
        include: requestInclude,
      });

      if (!latest) {
        throw new ChatServiceError("CHAT_NOT_FOUND", 404, "Request not found.");
      }

      ensureSameChat(latest);
      return { kind: "acquired", chat, request: latest };
    });
  }

  private async generateAndPersist(
    initialized: InitializedGeneration | RetryAcquireResult,
    source: "send" | "retry"
  ) {
    try {
      const messages = await this.buildProviderMessages(initialized.chat);
      const providerResult = await this.getProvider().generate({
        messages,
        temperature: 0.3,
        maxOutputTokens: 500,
      });
      const validated = validateProviderResult(providerResult);

      const request = await this.db.$transaction(async (tx) => {
        await tx.aiChatMessage.updateMany({
          where: {
            id: initialized.request.assistantMessageId,
            chatId: initialized.chat.id,
          },
          data: {
            content: validated.text,
            status: AiChatMessageStatus.COMPLETED,
            failureCode: null,
            modelProvider: validated.provider,
            modelName: validated.model,
            inputTokens: validated.inputTokens,
            outputTokens: validated.outputTokens,
          },
        });

        await tx.aiGenerationRequest.update({
          where: { id: initialized.request.id },
          data: {
            status: AiGenerationRequestStatus.COMPLETED,
            failureCode: null,
            completedAt: new Date(),
          },
        });

        await tx.aiChat.update({
          where: { id: initialized.chat.id },
          data: { updatedAt: new Date() },
        });

        const updated = await tx.aiGenerationRequest.findUnique({
          where: { id: initialized.request.id },
          include: requestInclude,
        });

        if (!updated) {
          throw new ChatServiceError(
            "INTERNAL_ERROR",
            500,
            "Completed generation request could not be loaded."
          );
        }

        ensureSameChat(updated);
        return updated;
      });

      return this.serializeGenerationResult(
        { kind: source === "send" ? "created" : "acquired", chat: initialized.chat, request },
        true
      );
    } catch (error) {
      const failureCode = mapServiceFailureCode(error);
      const request = await this.markGenerationFailed(
        initialized.chat.id,
        initialized.request.id,
        initialized.request.assistantMessageId,
        failureCode
      );

      const serviceCode = mapServiceErrorCode(failureCode);
      const status =
        failureCode === AiGenerationFailureCode.RATE_LIMITED
          ? 429
          : failureCode === AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE
            ? 502
            : 500;

      return {
        ...this.serializeGenerationResult(
          { kind: source === "send" ? "created" : "acquired", chat: initialized.chat, request },
          false
        ),
        request: serializeGenerationRequest(request),
        userMessage: serializeGenerationMessage(request.userMessage, request),
        assistantMessage: serializeGenerationMessage(
          request.assistantMessage,
          request
        ),
        error: {
          code: serviceCode,
          status,
        },
      };
    }
  }

  private async markGenerationFailed(
    chatId: string,
    requestId: string,
    assistantMessageId: string,
    failureCode: AiGenerationFailureCode
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.aiChatMessage.updateMany({
        where: { id: assistantMessageId, chatId },
        data: {
          content: "",
          status: AiChatMessageStatus.FAILED,
          failureCode,
        },
      });

      await tx.aiGenerationRequest.update({
        where: { id: requestId },
        data: {
          status: AiGenerationRequestStatus.FAILED,
          failureCode,
          completedAt: new Date(),
        },
      });

      const request = await tx.aiGenerationRequest.findUnique({
        where: { id: requestId },
        include: requestInclude,
      });

      if (!request) {
        throw new ChatServiceError(
          "INTERNAL_ERROR",
          500,
          "Failed generation request could not be loaded."
        );
      }

      ensureSameChat(request);
      return request;
    });
  }

  private async buildProviderMessages(chat: AiChatWithRelations) {
    const rows = await this.db.aiChatMessage.findMany({
      where: {
        chatId: chat.id,
        status: AiChatMessageStatus.COMPLETED,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
    });

    const history = [...rows].reverse();
    const contextParts = [
      chat.subject?.name ? `Subject: ${chat.subject.name}` : null,
      chat.topic?.title ? `Topic: ${chat.topic.title}` : null,
    ].filter(Boolean);

    const systemPrompt = [
      "You are StudyBuddy AI, a general study tutor for secondary school students.",
      "Give clear, concise, age-appropriate help.",
      "Use the selected subject or topic only as lightweight context.",
      "Stage 1 answers are general AI responses. Do not claim that answers are based on StudyBuddy resources, retrieved documents, citations, or past-paper evidence.",
      "If the question is unrelated to study support, politely steer the student back to learning.",
      contextParts.length > 0 ? contextParts.join("\n") : null,
    ]
      .filter(Boolean)
      .join("\n");

    const providerMessages: GenerateMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((message) => ({
        role:
          message.role === AiChatRole.USER
            ? ("user" as const)
            : ("assistant" as const),
        content: message.content,
      })),
    ];

    return providerMessages;
  }

  private serializeGenerationResult(
    initialized: InitializedGeneration | RetryAcquireResult,
    generated: boolean
  ) {
    const retryRequired =
      "retryRequired" in initialized && initialized.retryRequired
        ? initialized.retryRequired
        : initialized.request.status === AiGenerationRequestStatus.FAILED;

    return {
      chat: serializeChat(initialized.chat),
      request: serializeGenerationRequest(initialized.request),
      userMessage: serializeGenerationMessage(
        initialized.request.userMessage,
        initialized.request
      ),
      assistantMessage: serializeGenerationMessage(
        initialized.request.assistantMessage,
        initialized.request
      ),
      generated,
      retryRequired,
    };
  }

  private async findOwnedActiveChat(
    db: PrismaOrTransaction,
    userId: string,
    chatId: string
  ) {
    const chat = await db.aiChat.findFirst({
      where: {
        id: chatId,
        userId,
        deletedAt: null,
      },
      include: chatInclude,
    });

    if (!chat) {
      throw new ChatServiceError("CHAT_NOT_FOUND", 404, "Chat not found.");
    }

    return chat;
  }

  private async validateSubjectTopic(
    db: PrismaOrTransaction,
    subjectId: string | null,
    topicId: string | null
  ) {
    if (topicId && !subjectId) {
      throw new ChatServiceError(
        "INVALID_SUBJECT_TOPIC",
        400,
        "A topic cannot be selected without a subject."
      );
    }

    if (subjectId) {
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: { id: true },
      });

      if (!subject) {
        throw new ChatServiceError(
          "INVALID_SUBJECT_TOPIC",
          400,
          "Subject not found."
        );
      }
    }

    if (topicId) {
      const topic = await db.topic.findUnique({
        where: { id: topicId },
        select: { id: true, subjectId: true },
      });

      if (!topic || topic.subjectId !== subjectId) {
        throw new ChatServiceError(
          "INVALID_SUBJECT_TOPIC",
          400,
          "Topic does not belong to the selected subject."
        );
      }
    }
  }

  private isUniqueRequestConflict(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private getProvider() {
    if (this.provider) return this.provider;
    if (!this.resolvedProvider) {
      this.resolvedProvider = getChatModelProvider();
    }
    return this.resolvedProvider;
  }
}

export function getChatService() {
  return new ChatService();
}
