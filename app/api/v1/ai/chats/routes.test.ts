import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/ai/chats/chat-service", () => ({
  getChatService: vi.fn(() => ({
    listChats: vi.fn().mockResolvedValue({ chats: [], pagination: {} }),
  })),
}));

describe("Stage 1 chat routes", () => {
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
    ];

    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(path.join(routeDir, routeFile), "utf8");
      expect(source).not.toMatch(/from ["']openai["']|new OpenAI/);
      expect(source).not.toMatch(/\$transaction|aiGenerationRequest|provider\.generate/);
      expect(source).toMatch(/getChatService|requireUser/);
    }
  });
});
