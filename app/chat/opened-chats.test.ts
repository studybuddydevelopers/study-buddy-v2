import { afterEach, describe, expect, it, vi } from "vitest";
import { openedToday, readOpenedChats, saveOpenedChats } from "./opened-chats";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("opened chat history", () => {
  it("keeps the three most recently opened unique chats from today", () => {
    const now = new Date(2026, 10, 23, 12).getTime();
    const previousDay = new Date(2026, 10, 22, 23, 59).getTime();

    expect(openedToday([
      { id: "older-day", openedAt: previousDay },
      { id: "chat-c", openedAt: now - 3_000 },
      { id: "chat-a", openedAt: now - 1_000 },
      { id: "chat-a", openedAt: now - 4_000 },
      { id: "chat-d", openedAt: now - 4_000 },
      { id: "chat-b", openedAt: now - 2_000 },
      { id: "future", openedAt: now + 1 },
    ], now)).toEqual([
      { id: "chat-a", openedAt: now - 1_000 },
      { id: "chat-b", openedAt: now - 2_000 },
      { id: "chat-c", openedAt: now - 3_000 },
    ]);
  });

  it("rejects malformed entries", () => {
    const now = new Date(2026, 10, 23, 12).getTime();
    expect(openedToday([
      null,
      { id: "", openedAt: now },
      { id: "x".repeat(201), openedAt: now },
      { id: "chat-a", openedAt: "today" },
    ], now)).toEqual([]);
  });

  it("stores only bounded history under the current user's key", () => {
    const now = Date.now();
    const setItem = vi.fn();
    const getItem = vi.fn(() => JSON.stringify([{ id: "chat-a", openedAt: now }]));
    vi.stubGlobal("localStorage", { getItem, setItem });

    saveOpenedChats("user-a", [{ id: "chat-a", openedAt: now }]);
    expect(setItem).toHaveBeenCalledWith(
      "studybuddy:opened-chats:user-a",
      JSON.stringify([{ id: "chat-a", openedAt: now }]),
    );
    expect(readOpenedChats("user-a")).toEqual([{ id: "chat-a", openedAt: now }]);
    expect(getItem).toHaveBeenCalledWith("studybuddy:opened-chats:user-a");
  });
});
