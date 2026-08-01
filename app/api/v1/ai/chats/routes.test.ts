import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const serviceMocks = vi.hoisted(() => ({
  listChats: vi.fn(),
  sendMessage: vi.fn(),
  retryGeneration: vi.fn(),
  getCitationPreview: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/ai/chats/chat-service", () => ({
  getChatService: vi.fn(() => serviceMocks),
}));

describe("Stage 1 chat routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    serviceMocks.listChats.mockResolvedValue({ chats: [], pagination: {} });

    const { requireUser } = await import("@/lib/auth");
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: "user-1" },
      dbUser: { id: "user-1" },
    } as never);
  });

  it("rejects unauthenticated chat access", async () => {
    const { requireUser } = await import("@/lib/auth");
    vi.mocked(requireUser).mockResolvedValue({
      errorResponse: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
    } as never);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/v1/ai/chats"));

    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(401);
  });

  it("new chat route files do not import OpenAI or orchestrate generation directly", () => {
    const routeDir = path.resolve(__dirname);
    const routeFiles = [
      "route.ts",
      "[chatId]/route.ts",
      "[chatId]/messages/route.ts",
      "[chatId]/requests/[requestId]/retry/route.ts",
      "[chatId]/citations/[citationId]/route.ts",
    ];

    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(path.join(routeDir, routeFile), "utf8");
      expect(source).not.toMatch(/from ["']openai["']|new OpenAI/);
      expect(source).not.toMatch(/\$transaction|aiGenerationRequest|provider\.generate/);
      expect(source).toMatch(/getChatService|requireUser/);
    }
  });

  it("returns managed failed send generations as lifecycle payloads, not transport 500s", async () => {
    serviceMocks.sendMessage.mockResolvedValue({
      chat: { id: "chat-1" },
      generationRequest: {
        id: "request-1",
        status: "FAILED",
        failureCode: "PROVIDER_ERROR",
      },
      userMessage: {
        id: "user-message-1",
        role: "USER",
        content: "hello",
        status: "COMPLETED",
      },
      assistantMessage: {
        id: "assistant-message-1",
        role: "ASSISTANT",
        content: "",
        status: "FAILED",
        failureCode: "PROVIDER_ERROR",
      },
      error: { code: "PROVIDER_ERROR", status: 500 },
    });

    const { POST } = await import("./[chatId]/messages/route");
    const response = await POST(
      new Request("http://localhost/api/v1/ai/chats/chat-1/messages", {
        method: "POST",
        body: JSON.stringify({
          message: "hello",
          clientRequestId: "4ff95ba7-01fc-4936-b39b-344d8c67b3b9",
        }),
      }),
      { params: Promise.resolve({ chatId: "chat-1" }) }
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assistantMessage.status).toBe("FAILED");
    expect(body.assistantMessage.content).toBe("");
    expect(body.error.status).toBe(500);
  });

  it("returns managed failed retry generations as lifecycle payloads, not transport 500s", async () => {
    serviceMocks.retryGeneration.mockResolvedValue({
      chat: { id: "chat-1" },
      generationRequest: {
        id: "request-1",
        status: "FAILED",
        failureCode: "PROVIDER_ERROR",
      },
      userMessage: {
        id: "user-message-1",
        role: "USER",
        content: "hello",
        status: "COMPLETED",
      },
      assistantMessage: {
        id: "assistant-message-1",
        role: "ASSISTANT",
        content: "",
        status: "FAILED",
        failureCode: "PROVIDER_ERROR",
      },
      error: { code: "PROVIDER_ERROR", status: 500 },
    });

    const { POST } = await import(
      "./[chatId]/requests/[requestId]/retry/route"
    );
    const response = await POST(
      new Request(
        "http://localhost/api/v1/ai/chats/chat-1/requests/request-1/retry",
        { method: "POST" }
      ),
      { params: Promise.resolve({ chatId: "chat-1", requestId: "request-1" }) }
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assistantMessage.status).toBe("FAILED");
    expect(body.assistantMessage.content).toBe("");
    expect(body.error.status).toBe(500);
  });
});
