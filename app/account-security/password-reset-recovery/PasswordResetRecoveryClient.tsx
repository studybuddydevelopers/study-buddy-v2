"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";

export default function PasswordResetRecoveryClient() {
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

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

  async function startRecovery() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/account/security/password-reset-recovery",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      if (!response.ok) {
        setError(data?.message ?? data?.error ?? "Recovery could not be started.");
        return;
      }
      setToken("");
      setSent(true);
    } catch {
      setError("Recovery could not be started. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <StudyBuddyIcon name={sent ? "mail" : "lock"} size={64} className="mx-auto" />
        <Heading1 gutter="sm">
          {sent ? "Check your email" : "Recover your locked account"}
        </Heading1>

        <div className="space-y-3 text-gray-700">
          <p>
            {sent
              ? "We sent password-reset instructions to the account email. Use the newest message and choose a new password."
              : "Confirm below to lift the provider lock and send a new password-reset email. Your previous password will remain unusable."}
          </p>
          {!sent && (
            <p className="text-sm text-gray-600">
              Opening this page did not unlock anything. You must press the button to begin recovery.
            </p>
          )}
          {!sent && !loadingToken && !token && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              The recovery token is missing. Use the complete link from the newest security email.
            </p>
          )}
        </div>

        <div className="mt-5">
          <FormErrorMessage id="password-reset-recovery-error" message={error} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!sent && (
            <Button
              variant="primary"
              loading={submitting}
              disabled={loadingToken || !token || submitting}
              onClick={() => void startRecovery()}
            >
              Send password-reset email
            </Button>
          )}
          <Link href={sent ? "/" : "/forgot-password"} className="rounded-xl px-5 py-3 font-semibold text-primary-700 hover:underline">
            {sent ? "Return home" : "Get help another way"}
          </Link>
        </div>
      </section>
    </main>
  );
}
