"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";

interface LockedAccountState {
  lockedUntil: string;
  recoveryEmailSent: boolean;
}

const LOCK_EFFECTS = [
  "Sign out every active Study Buddy session",
  "Temporarily block new sign-ins for 24 hours",
  "Keep the previous password from being used",
];

export default function PasswordResetAlertClient() {
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState<LockedAccountState | null>(null);

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
        setError(
          data?.message ?? data?.error ?? "The account could not be locked."
        );
        return;
      }
      setToken("");
      setLocked({
        lockedUntil: data.lockedUntil,
        recoveryEmailSent: Boolean(data.recoveryEmailSent),
      });
    } catch {
      setError(
        "The account could not be locked. Check your connection and retry."
      );
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
  const missingToken = !loadingToken && !token;

  return (
    <div className="flex min-h-[70svh] items-center bg-[#FAF8FB] px-4 py-10 sm:px-6 lg:py-16">
      <section
        aria-labelledby="password-reset-alert-title"
        className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(42,30,77,0.10)]"
      >
        <div className="grid lg:grid-cols-[0.78fr_1.22fr]">
          <div
            className={`flex flex-col justify-between p-6 text-white sm:p-8 lg:p-10 ${
              locked ? "bg-secondary-500" : "bg-primary-800"
            }`}
          >
            <div>
              <span className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {locked ? "Protection active" : "Security alert"}
              </span>
              <div className="mt-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-white">
                <StudyBuddyIcon
                  name={locked ? "shield" : "warning"}
                  size={96}
                  title={locked ? "Protected account" : "Security warning"}
                />
              </div>
              <p className="mt-8 text-2xl font-bold leading-tight sm:text-3xl">
                {locked
                  ? "Your protective lock is now active."
                  : "You stay in control of your account."}
              </p>
              <p className="mt-4 max-w-sm leading-7 text-white/85">
                {locked
                  ? "Active sessions have been closed while you recover access securely."
                  : "Review the password-reset activity before deciding whether any security action is needed."}
              </p>
            </div>

            <div className="mt-10 border-t border-white/20 pt-5 text-sm leading-6 text-white/75">
              Study Buddy will never ask you to share your password or security
              token by email.
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Password reset protection
            </p>
            <h1
              id="password-reset-alert-title"
              className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-950 sm:text-4xl"
            >
              {locked ? "Your account has been secured" : "Was this password reset you?"}
            </h1>

            {locked ? (
              <LockedAccountSummary locked={locked} deadline={deadline} />
            ) : (
              <div className="mt-7 space-y-5">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <h2 className="font-bold text-green-950">
                    Yes, I requested the reset
                  </h2>
                  <p className="mt-2 leading-7 text-green-900">
                    No security action is needed. You can safely leave this page
                    and continue with the newest password-reset email.
                  </p>
                </div>

                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 sm:p-6">
                  <h2 className="text-xl font-bold text-red-950">
                    No, I did not request it
                  </h2>
                  <p className="mt-2 leading-7 text-red-900">
                    Secure the account immediately. This single action will:
                  </p>
                  <ul className="mt-4 space-y-3" aria-label="Account lock effects">
                    {LOCK_EFFECTS.map((effect) => (
                      <li key={effect} className="flex items-start gap-3 text-red-950">
                        <span
                          aria-hidden="true"
                          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-200 text-sm font-bold"
                        >
                          ✓
                        </span>
                        <span className="leading-7">{effect}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 border-t border-red-200 pt-5 sm:hidden">
                    <Button
                      variant="destructive"
                      loading={submitting}
                      disabled={loadingToken || !token || submitting}
                      onClick={() => void lockAccount()}
                      className="min-h-11 w-full px-5"
                    >
                      Secure and lock account
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-gray-700">
                  <p className="font-semibold text-gray-950">Nothing has changed yet</p>
                  <p className="mt-1 leading-7">
                    Simply opening this page does not lock the account. The
                    protective lock starts only after you confirm below.
                  </p>
                </div>

                {loadingToken && (
                  <p role="status" className="text-sm font-medium text-gray-600">
                    Checking the secure email link…
                  </p>
                )}
                {missingToken && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 text-red-900"
                  >
                    <p className="font-bold">This security link is incomplete</p>
                    <p className="mt-1 leading-7">
                      Open the complete link from the newest security email. Older
                      links may no longer work.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <FormErrorMessage
                id="password-reset-security-error"
                message={error}
              />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {!locked && (
                <div className="hidden sm:block">
                  <Button
                    variant="destructive"
                    loading={submitting}
                    disabled={loadingToken || !token || submitting}
                    onClick={() => void lockAccount()}
                    className="min-h-11 px-5"
                  >
                    Secure and lock account
                  </Button>
                </div>
              )}
              <Link
                href="/"
                className={`${locked ? "inline-flex" : "hidden sm:inline-flex"} min-h-11 items-center justify-center rounded-xl px-5 font-semibold text-primary-700 transition hover:bg-primary-50 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2`}
              >
                {locked ? "Return to Study Buddy" : "No action needed"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function LockedAccountSummary({
  locked,
  deadline,
}: {
  locked: LockedAccountState;
  deadline: string | null;
}) {
  return (
    <div className="mt-7 space-y-5" aria-live="polite">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-6">
        <p className="text-lg font-bold text-green-950">
          The suspicious activity has been contained
        </p>
        <p className="mt-2 leading-7 text-green-900">
          Active sessions were revoked and the previous password can no longer
          be used.
        </p>
      </div>

      <dl className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white px-5">
        <div className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
          <dt className="font-semibold text-gray-600">Account access</dt>
          <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
            Temporarily locked
          </dd>
        </div>
        <div className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
          <dt className="font-semibold text-gray-600">Lock ends</dt>
          <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
            {deadline ?? "After the 24-hour protection period"}
          </dd>
        </div>
        <div className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
          <dt className="font-semibold text-gray-600">Recovery email</dt>
          <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
            {locked.recoveryEmailSent ? "Sent" : "Could not be sent"}
          </dd>
        </div>
      </dl>

      <div
        className={`rounded-2xl border p-5 ${
          locked.recoveryEmailSent
            ? "border-primary-200 bg-primary-50 text-gray-800"
            : "border-amber-300 bg-amber-50 text-amber-950"
        }`}
      >
        <p className="font-bold">
          {locked.recoveryEmailSent
            ? "Check the account email"
            : "Recovery email needs attention"}
        </p>
        <p className="mt-1 leading-7">
          {locked.recoveryEmailSent ? (
            "Use the newest recovery message to choose a fresh password."
          ) : (
            <>
              We could not send the recovery message. Contact{" "}
              <a
                href="mailto:security@studybuddyng.com"
                className="font-bold underline underline-offset-4"
              >
                security@studybuddyng.com
              </a>{" "}
              for help.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
