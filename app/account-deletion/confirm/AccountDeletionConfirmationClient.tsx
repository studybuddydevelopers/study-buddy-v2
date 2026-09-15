"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
import { useAuthState } from "@/components/AuthStateProvider";

interface ConfirmedDeletionState {
  scheduledFor: string;
  notificationEmailSent: boolean;
}

const DELETION_EFFECTS = [
  {
    title: "Restrict account access immediately",
    description:
      "This browser is signed out and normal Study Buddy access is locked.",
  },
  {
    title: "Start a 15-day cancellation window",
    description:
      "You can reverse the request at any point before deletion processing begins.",
  },
  {
    title: "Schedule eligible account data for deletion",
    description:
      "Processing begins after the deadline. Records that must be retained by law are excluded.",
  },
];

export default function AccountDeletionConfirmationClient() {
  const { setIsAuthenticated } = useAuthState();
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] =
    useState<ConfirmedDeletionState | null>(null);

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
      setIsAuthenticated(false);
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
    <div className="flex min-h-[70svh] items-center bg-[#FAF8FB] py-8 sm:px-6 sm:py-12 lg:py-16">
      <section
        aria-labelledby="account-deletion-confirmation-title"
        className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(42,30,77,0.10)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr]">
          <div
            className={`flex min-w-0 flex-col justify-between p-5 text-white sm:p-8 lg:p-10 ${
              confirmed ? "bg-secondary-500" : "bg-primary-800"
            }`}
          >
            <div>
              <span className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {confirmed ? "Deletion pending" : "Final confirmation"}
              </span>
              <div className="mt-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-white">
                <StudyBuddyIcon
                  name={confirmed ? "clock" : "warning"}
                  size={96}
                  title={
                    confirmed
                      ? "Deletion cancellation window"
                      : "Permanent deletion warning"
                  }
                />
              </div>
              <p className="mt-8 text-2xl font-bold leading-tight sm:text-3xl">
                {confirmed
                  ? "Your 15-day cancellation window has started."
                  : "Take a moment before you confirm."}
              </p>
              <p className="mt-4 max-w-sm leading-7 text-white/85">
                {confirmed
                  ? "The account is restricted now, but you can still reverse this request before the deadline."
                  : "Your account has not been scheduled for deletion. Review every consequence before making the final choice."}
              </p>
            </div>

            <p className="mt-10 border-t border-white/20 pt-5 text-sm leading-6 text-white/75">
              {confirmed
                ? "To keep the account, cancel this request before the displayed deadline."
                : "Simply opening this page cannot confirm deletion. Only pressing the confirmation button starts the process."}
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Account and data control
            </p>
            <h1
              id="account-deletion-confirmation-title"
              className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-950 sm:text-4xl"
            >
              {confirmed
                ? "Your account is pending deletion"
                : "Confirm permanent account deletion"}
            </h1>

            {confirmed ? (
              <DeletionPendingSummary
                confirmed={confirmed}
                deadline={deadline}
              />
            ) : (
              <div className="mt-7 space-y-5">
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 sm:p-6">
                  <h2 className="text-lg font-bold text-red-950">
                    This starts the deletion process
                  </h2>
                  <p className="mt-2 leading-7 text-red-900">
                    Confirmation restricts your account immediately. Permanent
                    deletion is scheduled after the cancellation window.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                  <h2 className="text-lg font-bold text-gray-950">
                    What confirming does
                  </h2>
                  <ol
                    className="mt-5 space-y-5"
                    aria-label="Permanent deletion effects"
                  >
                    {DELETION_EFFECTS.map((effect, index) => (
                      <li key={effect.title} className="flex items-start gap-4">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-800"
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-gray-950">
                            {effect.title}
                          </p>
                          <p className="mt-1 leading-7 text-gray-700">
                            {effect.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-gray-700">
                  <p className="font-semibold text-gray-950">
                    You can change your mind for 15 days
                  </p>
                  <p className="mt-1 leading-7">
                    Before processing begins, sign in and cancel the request or
                    email{" "}
                    <a
                      href="mailto:privacy@studybuddyng.com"
                      className="font-bold text-primary-800 underline underline-offset-4 [overflow-wrap:anywhere]"
                    >
                      privacy@studybuddyng.com
                    </a>
                    .
                  </p>
                </div>

                {loadingToken && (
                  <p role="status" className="text-sm font-medium text-gray-600">
                    Checking the secure confirmation link…
                  </p>
                )}

                {!loadingToken && !token && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 text-red-900"
                  >
                    <p className="font-bold">
                      This confirmation link is incomplete
                    </p>
                    <p className="mt-1 leading-7">
                      Request a new confirmation email from Account management,
                      then open the complete link from that message.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <FormErrorMessage
                id="deletion-confirmation-error"
                message={error}
              />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {!confirmed && (
                <Button
                  variant="destructive"
                  loading={submitting}
                  disabled={loadingToken || !token || submitting}
                  ariaDescribedBy={
                    error ? "deletion-confirmation-error" : undefined
                  }
                  onClick={() => void confirmDeletion()}
                  className="min-h-11 w-full px-5 sm:w-auto"
                >
                  Confirm permanent deletion
                </Button>
              )}
              <Link
                href={confirmed ? "/login" : "/"}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 font-semibold text-primary-700 transition hover:bg-primary-50 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 sm:w-auto"
              >
                {confirmed ? "Return to sign in" : "Return without confirming"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function DeletionPendingSummary({
  confirmed,
  deadline,
}: {
  confirmed: ConfirmedDeletionState;
  deadline: string | null;
}) {
  return (
    <div className="mt-7 space-y-5" aria-live="polite">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 sm:p-6">
        <p className="text-lg font-bold">Account access is now restricted</p>
        <p className="mt-2 leading-7">
          Deletion has not happened yet. Processing begins only after the
          cancellation window closes.
        </p>
      </div>

      <dl className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white px-5">
        <div className="py-4 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="font-semibold text-gray-600">Current status</dt>
          <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
            Pending deletion
          </dd>
        </div>
        <div className="py-4 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="font-semibold text-gray-600">Cancellation deadline</dt>
          <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
            {deadline ?? "15 days after confirmation"}
          </dd>
        </div>
        <div className="py-4 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="font-semibold text-gray-600">Confirmation email</dt>
          <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
            {confirmed.notificationEmailSent ? "Sent" : "Could not be sent"}
          </dd>
        </div>
      </dl>

      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 text-gray-800">
        <p className="font-bold">Want to keep your account?</p>
        <p className="mt-1 leading-7">
          Sign in before the deadline and choose “Cancel permanent deletion”,
          or email{" "}
          <a
            href="mailto:privacy@studybuddyng.com"
            className="font-bold text-primary-800 underline underline-offset-4 [overflow-wrap:anywhere]"
          >
            privacy@studybuddyng.com
          </a>
          .
        </p>
      </div>

      {!confirmed.notificationEmailSent && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="font-bold">The final email could not be sent</p>
          <p className="mt-1 leading-7">
            The deletion request is still active. Contact the privacy address
            above if you need help.
          </p>
        </div>
      )}
    </div>
  );
}
