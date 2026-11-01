import { z } from "zod";

const cursorSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.iso.datetime(),
});

export function encodeNotificationCursor(row: { id: string; createdAt: Date }) {
  return Buffer.from(JSON.stringify({ id: row.id, createdAt: row.createdAt.toISOString() })).toString("base64url");
}

export function decodeNotificationCursor(value: string) {
  if (value.length > 512 || !/^[\w-]+$/.test(value)) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? { id: parsed.data.id, createdAt: new Date(parsed.data.createdAt) } : null;
  } catch {
    return null;
  }
}

export const notificationUpdateSchema = z.union([
  z.object({ id: z.string().uuid(), read: z.boolean() }).strict(),
  z.object({ all: z.literal(true), before: z.iso.datetime() }).strict(),
]);
