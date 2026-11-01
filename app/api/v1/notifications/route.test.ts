import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeNotificationCursor } from "@/lib/notification-input";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { findMany: mocks.findMany, count: mocks.count, updateMany: mocks.updateMany } } }));
import { GET, PATCH } from "./route";

const id = "4d84f1a0-c7be-4f56-80a0-f623b559b3e1";
const createdAt = new Date("2026-10-25T12:00:00.000Z");
const row = {
  id, createdAt, readAt: null,
  review: {
    id: "review-1", reference: "SBMR-20261025-EXAMPLE", status: "MARK_ADJUSTED",
    paperTitleSnapshot: "Mathematics Paper 2", questionReferenceSnapshot: "Part I · Question 2",
    originalScore: 3, revisedScore: 5, maxScore: 8,
  },
};
function patch(body: unknown) {
  return PATCH(new Request("http://localhost/api/v1/notifications", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
}
describe("learner notification API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ dbUser: { id: "learner-1" } });
    mocks.findMany.mockResolvedValue([row]);
    mocks.count.mockResolvedValue(1);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns only the signed-in learner's notifications and a private no-store response", async () => {
    const response = await GET(new Request("http://localhost/api/v1/notifications"));
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "learner-1" }, take: 21, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }));
    const body = await response!.json();
    expect(body).toMatchObject({ unreadCount: 1, nextCursor: null, notifications: [{ id, title: "Your mark has been updated", href: "/marking-reviews/review-1", readAt: null }] });
    expect(body.notifications[0].description).toContain("from 3 to 5 out of 8");
    expect(body.notifications[0]).not.toHaveProperty("review");
    expect(body.notifications[0]).not.toHaveProperty("userId");
    expect(Date.parse(body.asOf)).not.toBeNaN();
  });

  it("provides a small count-only response for the navbar", async () => {
    const response = await GET(new Request("http://localhost/api/v1/notifications?countOnly=true"));
    expect(await response!.json()).toEqual({ unreadCount: 1 });
    expect(mocks.count).toHaveBeenCalledWith({ where: { userId: "learner-1", readAt: null } });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("paginates deterministically without requiring a cursor record to still exist", async () => {
    mocks.findMany.mockResolvedValue([row, { ...row, id: "4d84f1a0-c7be-4f56-80a0-f623b559b3e0" }]);
    const response = await GET(new Request("http://localhost/api/v1/notifications?limit=1"));
    const body = await response!.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.nextCursor).toBe(encodeNotificationCursor(row));
    await GET(new Request(`http://localhost/api/v1/notifications?cursor=${body.nextCursor}`));
    expect(mocks.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {
      userId: "learner-1", OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
    } }));
  });

  it.each(["limit=0", "limit=1000", "limit=1.5", "limit=no", "cursor=invalid", "cursor="])("rejects malformed pagination: %s", async query => {
    const response = await GET(new Request(`http://localhost/api/v1/notifications?${query}`));
    expect(response?.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it.each([true, false])("sets read=%s with an ownership-scoped update", async read => {
    const response = await patch({ id, read });
    expect(response?.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id, userId: "learner-1" }, data: { readAt: read ? expect.any(Date) : null } });
    const body = await response!.json();
    if (read) expect(Date.parse(body.readAt)).not.toBeNaN();
    else expect(body.readAt).toBeNull();
  });

  it("does not disclose or modify another learner's notification", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await patch({ id, read: true });
    expect(response?.status).toBe(404);
    expect(await response!.json()).toEqual({ error: "Notification not found." });
  });

  it("marks all as read only for the current account and original inbox cutoff", async () => {
    const response = await patch({ all: true, before: createdAt.toISOString() });
    expect(response?.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { userId: "learner-1", readAt: null, createdAt: { lte: createdAt } },
      data: { readAt: expect.any(Date) },
    });
  });

  it.each([
    { id, read: "true" }, { id, read: true, userId: "other-learner" }, { id: "invalid", read: false },
    { all: true }, { all: true, before: "bad-date" }, { all: true, before: "9999-01-01T00:00:00.000Z" },
    { all: true, before: createdAt.toISOString(), read: false },
  ])("rejects malformed or unsafe updates: %j", async body => {
    expect((await patch(body))?.status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it.each([401, 403, 423, 429])("honours authentication/account/rate restrictions (%s)", async status => {
    mocks.auth.mockResolvedValue({ errorResponse: new Response(null, { status }) });
    expect((await GET(new Request("http://localhost/api/v1/notifications")))?.status).toBe(status);
    expect((await patch({ id, read: true }))?.status).toBe(status);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
