"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "./NotificationProvider";

// Run only after this decision is actually opened, never during link prefetch.
export default function ReadNotificationOnOpen({ id }: { id: string }) {
  const { refreshCount } = useNotifications();
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(true);
  const save = useCallback((signal?: AbortSignal) => {
    return fetch("/api/v1/notifications", {
        method: "PATCH", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      }).then(async response => {
      if (!response.ok) throw new Error("Read state not saved");
      if (!signal?.aborted) await refreshCount();
    }).catch(() => {
      if (!signal?.aborted) setFailed(true);
    }).finally(() => {
      if (!signal?.aborted) setSaving(false);
    });
  }, [id, refreshCount]);

  useEffect(() => {
    const controller = new AbortController();
    void save(controller.signal);
    return () => controller.abort();
  }, [save]);

  if (!failed) return null;
  return (
    <div role="status" className="rounded-xl bg-amber-50 p-4 text-amber-950">
      <p>The decision is available, but we couldn&apos;t mark its notification as read.</p>
      <button type="button" disabled={saving} onClick={() => { setSaving(true); setFailed(false); void save(); }} className="mt-2 min-h-11 rounded-lg px-3 font-semibold underline focus-visible:outline focus-visible:outline-2">Try again</button>
    </div>
  );
}
