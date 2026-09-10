import { describe, expect, it } from "vitest";
import {
  getWhatsAppDeletionConfirmationCutoff,
  getWhatsAppConversationCommand,
  selectRecentWhatsAppContext,
} from "@/lib/whatsapp-retention";

describe("WhatsApp conversation retention controls", () => {
  it("requires an explicit two-step deletion phrase", () => {
    expect(getWhatsAppConversationCommand(" delete   my chat ")).toBe(
      "delete-request"
    );
    expect(
      getWhatsAppConversationCommand("DELETE MY CHAT CONFIRM")
    ).toBe("delete-confirm");
    expect(getWhatsAppConversationCommand("delete chat")).toBeNull();
  });

  it("uses a 15-minute confirmation window", () => {
    expect(
      getWhatsAppDeletionConfirmationCutoff(
        new Date("2026-09-10T12:30:00.000Z")
      ).toISOString()
    ).toBe("2026-09-10T12:15:00.000Z");
  });

  it("returns bounded recent messages in chronological order", () => {
    const newestFirst = Array.from({ length: 15 }, (_, index) => ({
      id: String(15 - index),
      message: `message-${15 - index}`,
    }));

    const selected = selectRecentWhatsAppContext(newestFirst);

    expect(selected).toHaveLength(12);
    expect(selected[0]?.id).toBe("4");
    expect(selected.at(-1)?.id).toBe("15");
  });

  it("does not send deletion-control commands to the model", () => {
    const selected = selectRecentWhatsAppContext([
      { id: "new", message: "DELETE MY CHAT" },
      { id: "previous", message: "Explain photosynthesis" },
    ]);

    expect(selected.map((message) => message.id)).toEqual(["previous"]);
  });

  it("bounds context by characters while always retaining the newest message", () => {
    const selected = selectRecentWhatsAppContext([
      { id: "new", message: "n".repeat(8_000) },
      { id: "old", message: "o".repeat(5_000) },
    ]);

    expect(selected.map((message) => message.id)).toEqual(["new"]);
  });
});
