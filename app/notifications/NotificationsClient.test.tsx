import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearnerNotification } from "@/lib/notifications";

const mocks = vi.hoisted(() => ({ unreadCount: 2 as number | null }));
vi.mock("@/components/NotificationProvider", () => ({ useNotifications: () => ({ unreadCount: mocks.unreadCount, refreshCount: vi.fn() }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/notifications" }));
import NotificationBell from "@/components/NotificationBell";
import NotificationsClient, { NotificationList } from "./NotificationsClient";

const item: LearnerNotification = {
  id: "notification-1", title: "Your marking review is complete", description: "Maths Paper 2 · Question 1",
  reference: "SBMR-EXAMPLE", href: "/marking-reviews/review-1", readAt: null, createdAt: "2026-10-25T12:00:00.000Z",
};
describe("notification presentation", () => {
  beforeEach(() => { mocks.unreadCount = 2; });
  it("keeps the existing bell and provides an accessible unread count and 44px target", () => {
    const html = renderToStaticMarkup(<NotificationBell />);
    expect(html).toContain("🔔");
    expect(html).toContain('href="/notifications"');
    expect(html).toContain('aria-label="Notifications, 2 unread"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("h-11 w-11");
  });
  it("caps the visual badge but retains the full accessible count", () => {
    mocks.unreadCount = 108;
    const html = renderToStaticMarkup(<NotificationBell />);
    expect(html).toContain("99+");
    expect(html).toContain("108 unread");
  });
  it("doesn't present an unavailable count as zero", () => {
    mocks.unreadCount = null;
    const html = renderToStaticMarkup(<NotificationBell />);
    expect(html).toContain('aria-label="Notifications"');
    expect(html).not.toContain("0 unread");
  });
  it("shows the correct read control and a uniquely labelled decision link", () => {
    const html = renderToStaticMarkup(<NotificationList items={[item, { ...item, id: "notification-2", readAt: item.createdAt }]} busy={false} onUpdate={() => {}} />);
    expect(html).toContain("Mark as read");
    expect(html).toContain("Mark as unread");
    expect(html).toContain("for SBMR-EXAMPLE");
    expect(html).toContain('href="/marking-reviews/review-1"');
    expect(html).toContain("flex-wrap");
    expect(html).toContain("break-all");
  });
  it("disables read controls during a pending update", () => {
    const html = renderToStaticMarkup(<NotificationList items={[item]} busy onUpdate={() => {}} />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
  });
  it("starts with an announced loading state, not a false empty inbox", () => {
    const html = renderToStaticMarkup(<NotificationsClient />);
    expect(html).toContain("Loading notifications…");
    expect(html).not.toContain("No notifications yet");
    expect(html).not.toContain("<main");
  });
});
