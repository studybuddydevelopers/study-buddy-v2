"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";

const RECOVERY_STEPS = [
  {
    title: "Open a secure recovery window",
    description:
      "Study Buddy allows password recovery while keeping normal account access restricted.",
  },
  {
    title: "Send fresh reset instructions",
    description:
      "A new password-reset email is sent to the email address on the account.",
  },
  {
    title: "Protect the account until you finish",
    description:
      "The previous password stays unusable, and the security restriction remains until you set a new one.",
  },
];

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
    <div className="flex min-h-[70svh] items-center bg-[#FAF8FB] py-8 sm:px-6 sm:py-12 lg:py-16">
      <section
        aria-labelledby="password-reset-recovery-title"
        className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(42,30,77,0.10)]"
      >
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <div
            className={`flex flex-col justify-between p-6 text-white sm:p-8 lg:p-10 ${
              sent ? "bg-secondary-500" : "bg-primary-800"
            }`}
          >
            <div>
              <span className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {sent ? "Recovery started" : "Secure account recovery"}
              </span>
              <div className="mt-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-white">
                <StudyBuddyIcon
                  name={sent ? "mail" : "lock"}
                  size={96}
                  title={sent ? "Recovery email sent" : "Locked account"}
                />
              </div>
              <p className="mt-8 text-2xl font-bold leading-tight sm:text-3xl">
                {sent
                  ? "Your secure route back into the account is ready."
                  : "Recover access without weakening the account lock."}
              </p>
              <p className="mt-4 max-w-sm leading-7 text-white/85">
                {sent
                  ? "Finish the recovery from your inbox by choosing a fresh password."
                  : "This controlled process lets you reset the password while Study Buddy continues to protect the account."}
              </p>
            </div>

            <p className="mt-10 border-t border-white/20 pt-5 text-sm leading-6 text-white/75">
              Study Buddy will never ask you to send your password or recovery
              token by email.
            </p>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Password reset protection
            </p>
            <h1
              id="password-reset-recovery-title"
              className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-950 sm:text-4xl"
            >
              {sent ? "Check your email" : "Recover your locked account"}
            </h1>

            {sent ? (
              <RecoveryEmailSentSummary />
            ) : (
              <div className="mt-7 space-y-5">
                <p className="max-w-2xl leading-7 text-gray-700">
                  Use this one-time security link to begin recovery. Your account
                  stays protected until you create a new password.
                </p>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                  <h2 className="text-lg font-bold text-gray-950">
                    What happens when you continue
                  </h2>
                  <ol
                    className="mt-5 space-y-5"
                    aria-label="Account recovery steps"
                  >
                    {RECOVERY_STEPS.map((step, index) => (
                      <li key={step.title} className="flex items-start gap-4">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-bold text-white"
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-gray-950">{step.title}</p>
                          <p className="mt-1 leading-7 text-gray-700">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-gray-700">
                  <p className="font-semibold text-gray-950">
                    Nothing has changed yet
                  </p>
                  <p className="mt-1 leading-7">
                    Opening this page did not unlock the account or send an
                    email. Recovery starts only after you continue below.
                  </p>
                </div>

                {loadingToken && (
                  <p role="status" className="text-sm font-medium text-gray-600">
                    Checking the secure recovery link…
                  </p>
                )}

                {!loadingToken && !token && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 text-red-900"
                  >
                    <p className="font-bold">This recovery link is incomplete</p>
                    <p className="mt-1 leading-7">
                      Open the complete link from the newest security email.
                      Older links may no longer work.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <FormErrorMessage
                id="password-reset-recovery-error"
                message={error}
              />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {!sent && (
                <Button
                  variant="primary"
                  loading={submitting}
                  disabled={loadingToken || !token || submitting}
                  ariaDescribedBy={
                    error ? "password-reset-recovery-error" : undefined
                  }
                  onClick={() => void startRecovery()}
                  className="min-h-11 w-full px-5 sm:w-auto"
                >
                  Start secure recovery
                </Button>
              )}
              <Link
                href={sent ? "/" : "/forgot-password"}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 font-semibold text-primary-700 transition hover:bg-primary-50 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 sm:w-auto"
              >
                {sent ? "Return to Study Buddy" : "Get help another way"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RecoveryEmailSentSummary() {
  return (
    <div className="mt-7 space-y-5" aria-live="polite">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-6">
        <p className="text-lg font-bold text-green-950">
          Password-reset instructions have been sent
        </p>
        <p className="mt-2 leading-7 text-green-900">
          Open the newest message sent to the account email and use it to choose
          a fresh password.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-gray-950">Finish the recovery</h2>
        <ol className="mt-4 space-y-4" aria-label="Remaining recovery steps">
          <li className="flex items-start gap-3 text-gray-700">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-800"
            >
              1
            </span>
            <span className="leading-7">Open the newest reset email.</span>
          </li>
          <li className="flex items-start gap-3 text-gray-700">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-800"
            >
              2
            </span>
            <span className="leading-7">Create a strong, unique password.</span>
          </li>
          <li className="flex items-start gap-3 text-gray-700">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-800"
            >
              3
            </span>
            <span className="leading-7">
              Study Buddy clears the security restriction after the new
              password is saved.
            </span>
          </li>
        </ol>
      </div>

      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-gray-700">
        <p className="font-semibold text-gray-950">Use the newest email only</p>
        <p className="mt-1 leading-7">
          If it does not arrive, check spam before requesting another reset
          message.
        </p>
      </div>
    </div>
  );
}
