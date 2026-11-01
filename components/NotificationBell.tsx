"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "./NotificationProvider";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  return (
    <Link
      href="/notifications"
      prefetch={false}
      aria-label={unreadCount === null ? "Notifications" : `Notifications, ${unreadCount} unread`}
      aria-current={pathname === "/notifications" ? "page" : undefined}
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition hover:bg-accent-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <span aria-hidden="true">🔔</span>
      {unreadCount !== null && unreadCount > 0 ? (
        <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-6 rounded-full bg-primary-700 px-1 text-center text-xs font-bold leading-6 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
