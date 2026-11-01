"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const NotificationContext = createContext<{
  unreadCount: number | null;
  refreshCount: () => Promise<void>;
} | null>(null);

export default function NotificationProvider({ enabled, children }: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const pending = useRef<AbortController | null>(null);
  const refreshCount = useCallback(async () => {
    if (!enabled) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response = await fetch("/api/v1/notifications?countOnly=true", {
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("Notifications unavailable");
      const body = await response.json();
      if (!Number.isInteger(body.unreadCount) || body.unreadCount < 0) throw new Error("Invalid count");
      if (!controller.signal.aborted) setUnreadCount(body.unreadCount);
    } catch {
      // Unknown is not the same as zero: don't claim the learner is caught up.
      if (!controller.signal.aborted) setUnreadCount(null);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };
    refreshIfVisible();
    const timer = window.setInterval(refreshIfVisible, 60_000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      pending.current?.abort();
    };
  }, [enabled, refreshCount]);

  const value = useMemo(() => ({ unreadCount: enabled ? unreadCount : null, refreshCount }), [enabled, unreadCount, refreshCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("Notifications require NotificationProvider");
  return value;
}
