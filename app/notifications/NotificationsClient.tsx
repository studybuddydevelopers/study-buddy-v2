"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import LocalDateTime from "@/components/LocalDateTime";
import { useNotifications } from "@/components/NotificationProvider";
import type { LearnerNotification, NotificationPage } from "@/lib/notifications";

const control = "inline-flex min-h-11 items-center justify-center rounded-xl border border-primary-200 px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50";

export default function NotificationsClient() {
  const { unreadCount, refreshCount } = useNotifications();
  const [page, setPage] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  const load = useCallback((cursor?: string) => {
    if (busy.current) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    return fetch(`/api/v1/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to read your notifications." : "We couldn't load your notifications. Please try again.");
      const result = await response.json() as NotificationPage;
      if (controller.signal.aborted) return;
      setPage(previous => cursor && previous ? {
        ...result,
        // Keep the original cutoff: loading older items must not dismiss newer alerts.
        asOf: previous.asOf,
        notifications: [...previous.notifications, ...result.notifications.filter(item => !previous.notifications.some(existing => existing.id === item.id))],
      } : result);
      void refreshCount();
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "We couldn't load your notifications.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
  }, [refreshCount]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; pending.current?.abort(); };
  }, [load]);

  function startLoad(cursor?: string) {
    if (busy.current) return;
    setLoading(true);
    setError(null);
    void load(cursor);
  }

  async function update(item?: LearnerNotification) {
    if (!page || busy.current || loading) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    setNotice("");
    try {
      const response = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item ? { id: item.id, read: !item.readAt } : { all: true, before: page.asOf }),
      });
      if (!response.ok) throw new Error("Your change wasn't saved. Please try again.");
      const result = await response.json() as { readAt: string | null };
      if (mounted.current) {
        setPage(previous => previous && ({ ...previous, notifications: previous.notifications.map(notification => {
          const affected = item ? notification.id === item.id : !notification.readAt && notification.createdAt <= page.asOf;
          return affected ? { ...notification, readAt: result.readAt } : notification;
        }) }));
        setNotice(item ? (item.readAt ? "Marked as unread." : "Marked as read.") : "Notifications marked as read.");
      }
      await refreshCount();
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : "Your change wasn't saved.");
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const count = unreadCount;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 max-[320px]:px-[7.5px]">
      <Link href="/dashboard" className={`${control} mb-5`}>Back to dashboard</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-700">Your updates</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">Notifications</h1>
          <p className="mt-2 max-w-xl text-base leading-7 text-gray-600">Review decisions, with the question and explanation one tap away.</p>
        </div>
        {count !== undefined && count !== null ? <span className="rounded-full bg-primary-100 px-3 py-2 text-sm font-semibold text-primary-800">{count} unread</span> : null}
      </header>
      <div className="my-6 flex flex-wrap gap-3">
        <button type="button" className={control} disabled={loading || saving} onClick={() => startLoad()}>Refresh</button>
        <button type="button" className={control} disabled={loading || saving || !page || count === 0} onClick={() => void update()}>Mark all as read</button>
        <Link href="/marking-reviews" className={control}>All marking reviews</Link>
      </div>
      <p className="sr-only" role="status">{notice}</p>
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
          <p>{error}</p>
          <button type="button" className={`${control} mt-3`} disabled={loading || saving} onClick={() => startLoad()}>Reload notifications</button>
        </div>
      ) : null}
      {loading ? <p role="status" className="my-4 text-gray-600">Loading notifications…</p> : null}
      {page && page.notifications.length === 0 ? (
        <section className="rounded-2xl border border-primary-100 bg-white px-5 py-10 text-center">
          <span aria-hidden="true" className="text-3xl">🔔</span>
          <h2 className="mt-4 text-xl font-semibold text-gray-950">No notifications yet</h2>
          <p className="mx-auto mt-2 max-w-md leading-7 text-gray-600">When support completes a marking review, the decision will appear here. You can still check pending cases in All marking reviews.</p>
        </section>
      ) : null}
      <NotificationList items={page?.notifications ?? []} busy={loading || saving} onUpdate={item => void update(item)} />
      {page?.nextCursor ? <div className="mt-6 text-center"><button type="button" className={control} disabled={loading || saving} onClick={() => startLoad(page.nextCursor!)}>Load older notifications</button></div> : null}
    </div>
  );
}

export function NotificationList({ items, busy, onUpdate }: {
  items: LearnerNotification[];
  busy: boolean;
  onUpdate: (item: LearnerNotification) => void;
}) {
  return (
      <ol className="space-y-4" aria-label="Notifications" aria-busy={busy}>
        {items.map(item => (
          <li key={item.id} className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${item.readAt ? "border-gray-200 bg-white" : "border-primary-200 bg-primary-50"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-primary-800">{item.readAt ? "Read" : "Unread"}</span>
              <span className="text-gray-600"><LocalDateTime value={item.createdAt} /></span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-gray-950">{item.title}</h2>
            <p className="mt-2 break-words leading-7 text-gray-700">{item.description}</p>
            <p className="mt-2 break-all text-sm text-gray-600">Case {item.reference}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={item.href} prefetch={false} className={`${control} border-primary-700 bg-primary-700 text-white hover:bg-primary-800`}>View decision<span className="sr-only"> for {item.reference}</span></Link>
              <button type="button" className={control} disabled={busy} onClick={() => onUpdate(item)}>{item.readAt ? "Mark as unread" : "Mark as read"}<span className="sr-only">: {item.reference}</span></button>
            </div>
          </li>
        ))}
      </ol>
  );
}
