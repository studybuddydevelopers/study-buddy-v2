export interface OpenedChat {
  id: string;
  openedAt: number;
}

export function openedToday(value: unknown, now = Date.now()): OpenedChat[] {
  if (!Array.isArray(value)) return [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const seen = new Set<string>();
  return value
    .filter((entry): entry is OpenedChat => Boolean(entry)
      && typeof entry.id === "string" && entry.id.length > 0 && entry.id.length <= 200
      && typeof entry.openedAt === "number"
      && entry.openedAt >= start.getTime() && entry.openedAt <= now)
    .sort((a, b) => b.openedAt - a.openedAt)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .slice(0, 3);
}

export function readOpenedChats(userId?: string): OpenedChat[] {
  if (!userId) return [];
  try {
    return openedToday(JSON.parse(localStorage.getItem(`studybuddy:opened-chats:${userId}`) ?? "[]"));
  } catch {
    return [];
  }
}

export function saveOpenedChats(userId: string, entries: OpenedChat[]) {
  try {
    // Only IDs and today's opening times; no titles, questions or responses.
    localStorage.setItem(`studybuddy:opened-chats:${userId}`, JSON.stringify(openedToday(entries)));
  } catch {
    // The in-memory list still works when browser storage is unavailable.
  }
}
