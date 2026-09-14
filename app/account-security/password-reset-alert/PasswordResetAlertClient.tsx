"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";

export default function PasswordResetAlertClient() {
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState<{
    lockedUntil: string;
    recoveryEmailSent: boolean;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const fragmentToken = params.get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    const timer = window.setTimeout(() => {
      setToken(fragmentToken);
      setLoadingToken(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function lockAccount() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/account/security/password-reset-lock",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      const data = (await response.json().catch(() => null)) as {
        lockedUntil?: string;
        recoveryEmailSent?: boolean;
        error?: string;
        message?: string;
      } | null;
      if (!response.ok || !data?.lockedUntil) {
        setError(data?.message ?? data?.error ?? "The account could not be locked.");
        return;
      }
      setToken("");
      setLocked({
        lockedUntil: data.lockedUntil,
        recoveryEmailSent: Boolean(data.recoveryEmailSent),
      });
    } catch {
      setError("The account could not be locked. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  const deadline = locked
    ? new Intl.DateTimeFormat("en-NG", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(locked.lockedUntil))
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <StudyBuddyIcon name={locked ? "shield" : "warning"} size={64} className="mx-auto" />
        <Heading1 gutter="sm">
          {locked ? "Your account is locked" : "Protect your account"}
        </Heading1>

        {locked ? (
          <div className="space-y-3 text-gray-700">
            <p>Active sessions were revoked and the previous password can no longer be used.</p>
            {deadline && <p className="font-semibold">Provider lock ends: {deadline}</p>}
            <p className="text-sm text-gray-600">
              {locked.recoveryEmailSent
                ? "We sent secure recovery instructions to the account email."
                : "We could not send the recovery message. Contact security@studybuddyng.com for help."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-gray-700">
            <p>If the password-reset requests were yours, you do not need to do anything.</p>
            <p>If they were not yours, confirm below to revoke active sessions and temporarily lock sign-in for 24 hours.</p>
            <p className="text-sm text-gray-600">
              Opening this page did not change the account. The lock is applied only when you press the button.
            </p>
            {!loadingToken && !token && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                The security token is missing. Use the complete link from the newest email.
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <FormErrorMessage id="password-reset-security-error" message={error} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!locked && (
            <Button
              variant="destructive"
              loading={submitting}
              disabled={loadingToken || !token || submitting}
              onClick={() => void lockAccount()}
            >
              Lock my account
            </Button>
          )}
          <Link href="/" className="rounded-xl px-5 py-3 font-semibold text-primary-700 hover:underline">
            {locked ? "Return home" : "No action needed"}
          </Link>
        </div>
      </section>
    </main>
  );
}
