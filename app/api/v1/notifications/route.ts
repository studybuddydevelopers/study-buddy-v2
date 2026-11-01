import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationContent } from "@/lib/notifications";
import { decodeNotificationCursor, encodeNotificationCursor, notificationUpdateSchema } from "@/lib/notification-input";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const userId = auth.dbUser.id;
  const query = new URL(request.url).searchParams;

  if (query.get("countOnly") === "true") {
    const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });
    return NextResponse.json({ unreadCount }, { headers });
  }

  const limit = Number(query.get("limit") ?? 20);
  const rawCursor = query.get("cursor");
  const cursor = rawCursor ? decodeNotificationCursor(rawCursor) : null;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || (rawCursor !== null && !cursor)) {
    return NextResponse.json({ error: "Invalid notification page." }, { status: 400, headers });
  }

  const asOf = new Date();
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        ...(cursor ? { OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true, createdAt: true, readAt: true,
        review: { select: {
          id: true, reference: true, status: true, paperTitleSnapshot: true,
          questionReferenceSnapshot: true, originalScore: true, revisedScore: true, maxScore: true,
        } },
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  const page = rows.slice(0, limit);
  return NextResponse.json({
    notifications: page.map(({ review, ...notification }) => ({
      ...notification, ...notificationContent(review), reference: review.reference,
    })),
    unreadCount,
    nextCursor: rows.length > limit ? encodeNotificationCursor(page[page.length - 1]) : null,
    asOf: asOf.toISOString(),
  }, { headers });
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const body = await parseJsonObjectRequest(request, 2048);
  if (!body.ok) return body.response;
  const parsed = notificationUpdateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a notification and a valid read state." }, { status: 400, headers });
  }
  const userId = auth.dbUser.id;
  const now = new Date();
  if ("all" in parsed.data) {
    const before = new Date(parsed.data.before);
    if (before > now) {
      return NextResponse.json({ error: "Refresh your notifications and try again." }, { status: 400, headers });
    }
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null, createdAt: { lte: before } },
      data: { readAt: now },
    });
    return NextResponse.json({ updated: result.count, readAt: now }, { headers });
  }
  const readAt = parsed.data.read ? now : null;
  const result = await prisma.notification.updateMany({
    where: { id: parsed.data.id, userId },
    data: { readAt },
  });
  if (!result.count) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404, headers });
  }
  return NextResponse.json({ readAt }, { headers });
}
