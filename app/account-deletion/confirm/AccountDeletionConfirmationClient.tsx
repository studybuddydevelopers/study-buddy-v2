"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";

export default function AccountDeletionConfirmationClient() {
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{
    scheduledFor: string;
    notificationEmailSent: boolean;
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

  async function confirmDeletion() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/v1/account/deletion/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json().catch(() => null)) as {
        deletionScheduledFor?: string;
        notificationEmailSent?: boolean;
        error?: string;
        message?: string;
      } | null;
      if (!response.ok || !data?.deletionScheduledFor) {
        setError(
          data?.message ??
            data?.error ??
            "The deletion request could not be confirmed."
        );
        return;
      }
      setToken("");
      setConfirmed({
        scheduledFor: data.deletionScheduledFor,
        notificationEmailSent: Boolean(data.notificationEmailSent),
      });
    } catch {
      setError("The deletion request could not be confirmed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const deadline = confirmed
    ? new Intl.DateTimeFormat("en-NG", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(confirmed.scheduledFor))
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <StudyBuddyIcon
          name={confirmed ? "clock" : "warning"}
          size={64}
          className="mx-auto"
        />
        <Heading1 gutter="sm">
          {confirmed
            ? "Your account is pending deletion"
            : "Confirm permanent account deletion"}
        </Heading1>

        {confirmed ? (
          <div className="space-y-3 text-gray-700">
            <p>
              Your account is now locked and is scheduled for deletion after
              the 15-day cancellation window.
            </p>
            {deadline && <p className="font-semibold">Deadline: {deadline}</p>}
            <p className="text-sm leading-6">
              To reverse the request before processing begins, email{" "}
              <a
                href="mailto:privacy@studybuddyng.com"
                className="font-semibold text-primary-700 hover:underline"
              >
                privacy@studybuddyng.com
              </a>
              . You can also cancel after signing in.
            </p>
            <p className="text-sm text-gray-600">
              {confirmed.notificationEmailSent
                ? "We sent a confirmation notice to your account email."
                : "We could not send the final notice. The request is still active, so contact privacy@studybuddyng.com if you need help."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-gray-700">
            <p>
              This is the final confirmation step. Confirming will immediately
              lock the account and start a 15-day cancellation window.
            </p>
            <p className="text-sm text-gray-600">
              Email-link scanners cannot complete this action automatically;
              you must press the button below.
            </p>
            {!loadingToken && !token && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                The confirmation token is missing. Request a new email from
                Account management.
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <FormErrorMessage id="deletion-confirmation-error" message={error} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!confirmed && (
            <Button
              variant="destructive"
              loading={submitting}
              disabled={loadingToken || !token || submitting}
              onClick={() => void confirmDeletion()}
            >
              Confirm permanent deletion
            </Button>
          )}
          <Link
            href={confirmed ? "/login" : "/"}
            className="rounded-xl px-5 py-3 font-semibold text-primary-700 hover:underline"
          >
            {confirmed ? "Return to sign in" : "Return without confirming"}
          </Link>
        </div>
      </section>
    </main>
  );
}
