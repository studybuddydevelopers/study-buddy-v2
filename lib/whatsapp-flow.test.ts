import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  messageCreate: vi.fn(),
  messageFindFirst: vi.fn(),
  findWhatsAppThread: vi.fn(),
  deleteWhatsAppConversation: vi.fn(),
  getOrCreateWhatsAppThread: vi.fn(),
  getOrCreateWhatsAppUser: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    aiQuestionMessage: {
      create: mocks.messageCreate,
      findFirst: mocks.messageFindFirst,
    },
  },
}));

vi.mock("@/lib/whatsapp-thread", () => ({
  findWhatsAppThread: mocks.findWhatsAppThread,
  deleteWhatsAppConversation: mocks.deleteWhatsAppConversation,
  getOrCreateWhatsAppThread: mocks.getOrCreateWhatsAppThread,
}));

vi.mock("@/lib/whatsapp-user", () => ({
  getOrCreateWhatsAppUser: mocks.getOrCreateWhatsAppUser,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  securityFingerprint: vi.fn(() => "account-fingerprint"),
}));

import { handleIncomingMessage } from "@/lib/whatsapp-flow";

describe("WhatsApp conversation deletion flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    mocks.findWhatsAppThread.mockResolvedValue("thread-1");
    mocks.messageCreate.mockResolvedValue({ id: "message-1" });
    mocks.messageFindFirst.mockResolvedValue(null);
    mocks.deleteWhatsAppConversation.mockResolvedValue(1);
  });

  it("records the first deletion step and asks for confirmation", async () => {
    const reply = await handleIncomingMessage("+2348000000000", "delete my chat");

    expect(mocks.messageCreate).toHaveBeenCalledWith({
      data: {
        aiQuestionId: "thread-1",
        sender: "user",
        message: "DELETE MY CHAT",
      },
    });
    expect(reply).toContain("within 15 minutes");
    expect(reply).toContain("DELETE MY CHAT CONFIRM");
    expect(mocks.deleteWhatsAppConversation).not.toHaveBeenCalled();
  });

  it("rejects a confirmation without a current first-step request", async () => {
    const reply = await handleIncomingMessage(
      "+2348000000000",
      "DELETE MY CHAT CONFIRM"
    );

    expect(reply).toContain("missing or expired");
    expect(mocks.deleteWhatsAppConversation).not.toHaveBeenCalled();
  });

  it("hard-deletes the thread after a current confirmation request", async () => {
    mocks.messageFindFirst.mockResolvedValue({ id: "message-1" });

    const reply = await handleIncomingMessage(
      "+2348000000000",
      "DELETE MY CHAT CONFIRM"
    );

    expect(mocks.deleteWhatsAppConversation).toHaveBeenCalledWith("user-1");
    expect(reply).toContain("permanently deleted");
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      "whatsapp_conversation_deleted",
      "info",
      { accountFingerprint: "account-fingerprint" }
    );
  });
});
