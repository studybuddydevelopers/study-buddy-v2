import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), support: vi.fn(), rateLimit: vi.fn(),
  db: {
    aiChatMessage: { findFirst: vi.fn() },
    aiChatMessageReport: { findFirst: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ requireAiUser: mocks.auth }));
vi.mock("@/lib/marking-review-support", () => ({ requireMarkingReviewSupport: mocks.support }));
vi.mock("@/lib/security/rate-limit", () => ({ enforceRateLimitRules: mocks.rateLimit }));
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks.db, $transaction: (operation: (db: typeof mocks.db) => Promise<unknown>) => operation(mocks.db) } }));

import { getChatReport, submitChatReport } from "./chat-report-service";
import { GET, POST } from "@/app/api/v1/ai/chats/[chatId]/messages/[messageId]/report/route";
import { PATCH } from "@/app/api/v1/support/chat-reports/[id]/route";

const receipt = { id: "report-1", status: "OPEN", createdAt: "2026-11-22T12:00:00Z", reviewedAt: null, resolutionNote: null };
const context = { params: Promise.resolve({ chatId: "chat-1", messageId: "message-1" }) };
const request = (body: unknown) => new Request("http://localhost/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("chat response reporting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ dbUser: { id: "learner-1" } });
    mocks.support.mockResolvedValue({ dbUser: { id: "support-1" } });
    mocks.rateLimit.mockResolvedValue(null);
    mocks.db.aiChatMessage.findFirst.mockResolvedValue({ id: "message-1" });
    mocks.db.aiChatMessageReport.findFirst.mockResolvedValue(null);
    mocks.db.aiChatMessageReport.upsert.mockResolvedValue(receipt);
  });

  it("rejects unauthenticated report reads and submissions", async () => {
    mocks.auth.mockResolvedValue({ errorResponse: Response.json({}, { status: 401 }) });
    expect((await GET(new Request("http://localhost/api/report"), context))?.status).toBe(401);
    expect((await POST(request({ reason: "INCORRECT" }), context))?.status).toBe(401);
    expect(mocks.db.aiChatMessage.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.aiChatMessageReport.upsert).not.toHaveBeenCalled();
  });

  it("requires the requested message to be a completed tutor answer in the learner's active chat", async () => {
    mocks.db.aiChatMessage.findFirst.mockResolvedValue(null);
    await expect(submitChatReport("learner-1", "other-chat", "other-message", { reason: "INCORRECT", details: "" })).rejects.toMatchObject({ status: 404 });
    expect(mocks.db.aiChatMessage.findFirst).toHaveBeenCalledWith({
      where: { id: "other-message", chatId: "other-chat", role: "ASSISTANT", status: "COMPLETED", chat: { userId: "learner-1", deletedAt: null } },
      select: { id: true },
    });
    expect(mocks.db.aiChatMessageReport.upsert).not.toHaveBeenCalled();
  });

  it("attaches server-owned IDs and returns the existing reference for repeated submissions", async () => {
    const first = await POST(request({ reason: "INCOMPLETE", details: "Stops mid-sentence." }), context);
    const second = await POST(request({ reason: "OTHER" }), context);
    expect(await first?.json()).toEqual({ report: receipt });
    expect(await second?.json()).toEqual({ report: receipt });
    expect(mocks.db.aiChatMessageReport.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { messageId: "message-1" }, create: { userId: "learner-1", messageId: "message-1", reason: "INCOMPLETE", details: "Stops mid-sentence." }, update: {},
    }));
  });

  it.each([
    { reason: "FAKE" }, { reason: "OTHER", details: "x".repeat(2001) },
    { reason: "INCORRECT", userId: "someone-else" }, { reason: "OTHER", messageId: "different-message" },
  ])("rejects invalid or forged report fields before storing a case", async (body) => {
    expect((await POST(request(body), context))?.status).toBe(400);
    expect(mocks.db.aiChatMessageReport.upsert).not.toHaveBeenCalled();
  });

  it("respects report submission limits", async () => {
    mocks.rateLimit.mockResolvedValue(Response.json({}, { status: 429 }));
    expect((await POST(request({ reason: "OTHER" }), context))?.status).toBe(429);
    expect(mocks.db.aiChatMessageReport.upsert).not.toHaveBeenCalled();
  });

  it("returns a reviewed status and note only after checking the response owner", async () => {
    const reviewed = { ...receipt, status: "REVIEWED", resolutionNote: "Thank you. The example needed correcting." };
    mocks.db.aiChatMessageReport.findFirst.mockResolvedValue(reviewed);
    expect(await getChatReport("learner-1", "chat-1", "message-1")).toEqual(reviewed);
    expect(mocks.db.aiChatMessageReport.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { messageId: "message-1", userId: "learner-1" } }));
  });

  it("blocks learners from the support review action", async () => {
    mocks.support.mockResolvedValue({ errorResponse: Response.json({}, { status: 403 }) });
    expect((await PATCH(request({ resolutionNote: "Reviewed" }), { params: Promise.resolve({ id: "report-1" }) }))?.status).toBe(403);
    expect(mocks.db.aiChatMessageReport.updateMany).not.toHaveBeenCalled();
  });

  it("requires a review note and preserves the first support decision on a repeated review", async () => {
    const reportContext = { params: Promise.resolve({ id: "report-1" }) };
    expect((await PATCH(request({ resolutionNote: " " }), reportContext))?.status).toBe(400);
    const reviewed = { ...receipt, status: "REVIEWED", resolutionNote: "Original review note." };
    mocks.db.aiChatMessageReport.findFirst.mockResolvedValue(reviewed);
    mocks.db.aiChatMessageReport.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(request({ resolutionNote: "Later attempt to overwrite." }), reportContext);
    expect(await response?.json()).toEqual({ report: reviewed });
    expect(mocks.db.aiChatMessageReport.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "report-1", status: "OPEN", message: { chat: { deletedAt: null } } },
      data: expect.objectContaining({ reviewedById: "support-1", status: "REVIEWED" }),
    }));
  });
});
