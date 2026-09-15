"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
import { accountStatusDestination } from "@/lib/account-status";
import { readResponseError } from "@/lib/client-response-error";
import { useAuthState } from "@/components/AuthStateProvider";

interface LifecycleResponse {
  accountStatus: string;
  deletionScheduledFor: string | null;
  inactiveDeletionScheduledFor: string | null;
  deletionCancellationAllowed: boolean;
}

export default function AccountLifecycleStatus({
  mode,
}: {
  mode: "deactivated" | "deletion-pending";
}) {
  const router = useRouter();
  const { setIsAuthenticated } = useAuthState();
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [cancellationAllowed, setCancellationAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<
    "restore" | "sign-out" | null
  >(null);
  const [error, setError] = useState("");
  const submitting = submittingAction !== null;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/v1/account/lifecycle", {
          cache: "no-store",
        });
        if (response.status === 401) {
          setIsAuthenticated(false);
          router.replace("/login");
          router.refresh();
          return;
        }
        const data = (await response.json().catch(() => null)) as
          | LifecycleResponse
          | null;
        if (!active) return;
        if (!response.ok || !data) {
          setError("Your account status could not be loaded.");
          return;
        }

        const expected =
          mode === "deactivated" ? "DEACTIVATED" : "DELETION_PENDING";
        if (data.accountStatus !== expected) {
          router.replace(
            data.accountStatus === "ACTIVE"
              ? "/dashboard"
              : accountStatusDestination(data.accountStatus) ?? "/unauthorized"
          );
          return;
        }
        setScheduledFor(
          mode === "deactivated"
            ? data.inactiveDeletionScheduledFor
            : data.deletionScheduledFor
        );
        setCancellationAllowed(data.deletionCancellationAllowed);
      } catch {
        if (active) setError("Your account status could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [mode, router, setIsAuthenticated]);

  async function restoreAccess() {
    setSubmittingAction("restore");
    setError("");
    try {
      const response = await fetch("/api/v1/account/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "deactivated" ? "REACTIVATE" : "CANCEL_DELETION",
        }),
      });
      if (!response.ok) {
        setError(
          await readResponseError(response, "The request could not be completed.")
        );
        return;
      }
      setIsAuthenticated(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setError("The request could not be completed. Try again.");
    } finally {
      setSubmittingAction(null);
    }
  }

  async function signOut() {
    setSubmittingAction("sign-out");
    try {
      const response = await fetch("/api/v1/logout", { method: "POST" });
      if (!response.ok) {
        setError("We couldn't sign you out. Try again.");
        return;
      }
      setIsAuthenticated(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setError("We couldn't sign you out. Check your connection and try again.");
    } finally {
      setSubmittingAction(null);
    }
  }

  const deletionDate = scheduledFor
    ? new Intl.DateTimeFormat("en-NG", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(scheduledFor))
    : null;

  if (mode === "deletion-pending") {
    return (
      <DeletionPendingView
        cancellationAllowed={cancellationAllowed}
        deletionDate={deletionDate}
        error={error}
        loading={loading}
        submittingAction={submittingAction}
        onCancelDeletion={() => void restoreAccess()}
        onSignOut={() => void signOut()}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <Heading1 gutter="sm">
          {mode === "deactivated"
            ? "Your account is deactivated"
            : "Account deletion is pending"}
        </Heading1>
        {mode === "deactivated" ? (
          <div className="space-y-3 text-gray-700">
            <p className="leading-relaxed">
              Your Study Buddy access is paused. We retain the account for 36
              months so you can return with your study history.
            </p>
            {deletionDate && (
              <p className="font-semibold">
                Automatic deletion date: {deletionDate}
              </p>
            )}
            <p className="text-sm text-gray-600">
              We will email you 90, 60, 15, and 1 day before that date. Sign in
              and reactivate before the deadline to keep the account.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-gray-700">
            {cancellationAllowed ? (
              <p className="leading-relaxed">
                Your account is locked. The 15-day cancellation window started
                when you confirmed the email request.
              </p>
            ) : (
              <p className="leading-relaxed">
                The 36-month inactive-account period has expired and account
                deletion is being completed.
              </p>
            )}
            {deletionDate && (
              <p className="font-semibold">Scheduled by: {deletionDate}</p>
            )}
            {cancellationAllowed && (
              <p className="text-sm text-gray-600">
                You may cancel here before processing begins or contact
                privacy@studybuddyng.com. Records that law requires us to retain
                are excluded from the account purge.
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <FormErrorMessage id="account-lifecycle-error" message={error} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {(mode === "deactivated" || cancellationAllowed) && (
            <Button
              variant={mode === "deactivated" ? "primary" : "outline"}
              loading={submittingAction === "restore"}
              disabled={loading || submitting}
              onClick={() => void restoreAccess()}
            >
              {mode === "deactivated"
                ? "Reactivate account"
                : "Cancel permanent deletion"}
            </Button>
          )}
          <Button
            variant="link"
            loading={submittingAction === "sign-out"}
            disabled={submitting}
            onClick={() => void signOut()}
          >
            Return to sign in
          </Button>
        </div>
        <p className="mt-6 text-sm text-gray-600">
          Need help? Email{" "}
          <a
            className="font-semibold text-primary-700 hover:underline"
            href="mailto:privacy@studybuddyng.com"
          >
            privacy@studybuddyng.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}

export function DeletionPendingView({
  cancellationAllowed,
  deletionDate,
  error,
  loading,
  submittingAction,
  onCancelDeletion,
  onSignOut,
}: {
  cancellationAllowed: boolean;
  deletionDate: string | null;
  error: string;
  loading: boolean;
  submittingAction: "restore" | "sign-out" | null;
  onCancelDeletion: () => void;
  onSignOut: () => void;
}) {
  const windowOpen = loading || cancellationAllowed;
  const submitting = submittingAction !== null;

  return (
    <main className="flex min-h-[70svh] min-w-0 items-center bg-[#FAF8FB] py-8 sm:px-6 sm:py-12 lg:py-16">
      <section
        aria-labelledby="deletion-pending-title"
        aria-busy={loading}
        className="mx-auto w-full min-w-0 max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(42,30,77,0.10)]"
      >
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="flex min-w-0 flex-col justify-between bg-primary-800 p-5 text-white sm:p-8 lg:p-10">
            <div>
              <span className="inline-flex max-w-full rounded-full border border-white/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Deletion pending
              </span>

              <div className="mt-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-white">
                <StudyBuddyIcon
                  name="clock"
                  size={96}
                  title="Account deletion cancellation window"
                />
              </div>

              <p className="mt-8 text-2xl font-bold leading-tight sm:text-3xl">
                Your account has not been deleted yet.
              </p>
              <p className="mt-4 max-w-sm leading-7 text-white/85">
                Study Buddy access is restricted while the deletion request is
                pending. You can still keep the account while the cancellation
                window is open.
              </p>
            </div>

            <p className="mt-10 border-t border-white/20 pt-5 text-sm leading-6 text-white/75">
              Cancelling the request stops permanent deletion. You will be
              asked to sign in again before returning to Study Buddy.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Account and data control
            </p>
            <h1
              id="deletion-pending-title"
              className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-950 sm:text-4xl"
            >
              Account deletion is pending
            </h1>

            <div
              className={`mt-7 rounded-2xl border p-5 sm:p-6 ${
                windowOpen
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-red-200 bg-red-50 text-red-950"
              }`}
            >
              <p className="text-lg font-bold">
                {loading
                  ? "Checking your deletion status…"
                  : cancellationAllowed
                    ? "Your cancellation window is open"
                    : "Deletion processing has started"}
              </p>
              <p className="mt-2 leading-7">
                {loading
                  ? "We are securely retrieving the latest status for your account."
                  : cancellationAllowed
                    ? "Permanent deletion has not happened. Cancel before the deadline below to keep your account and study history."
                    : "The cancellation deadline has passed, so this request can no longer be reversed here."}
              </p>
            </div>

            <dl className="mt-5 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
              <div className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="font-semibold text-gray-600">Current status</dt>
                <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
                  {loading
                    ? "Checking…"
                    : cancellationAllowed
                      ? "Pending deletion"
                      : "Deletion in progress"}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="font-semibold text-gray-600">
                  Deletion scheduled for
                </dt>
                <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
                  {loading ? "Checking…" : deletionDate ?? "Date unavailable"}
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="font-semibold text-gray-600">Account access</dt>
                <dd className="mt-1 font-bold text-gray-950 sm:mt-0">
                  Restricted
                </dd>
              </div>
            </dl>

            {!loading && cancellationAllowed && (
              <div className="mt-5 rounded-2xl border border-primary-200 bg-primary-50 p-4 text-gray-700">
                <p className="font-bold text-gray-950">
                  Want to keep your account?
                </p>
                <p className="mt-1 leading-7">
                  Cancel the deletion request below. Your account data remains
                  protected, and you can sign in again afterwards.
                </p>
              </div>
            )}

            <div className="mt-5">
              <FormErrorMessage id="account-lifecycle-error" message={error} />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {windowOpen && (
                <Button
                  variant="primary"
                  loading={submittingAction === "restore"}
                  disabled={loading || submitting}
                  ariaDescribedBy={error ? "account-lifecycle-error" : undefined}
                  onClick={onCancelDeletion}
                  className="min-h-11 w-full px-5 sm:w-auto"
                >
                  Cancel deletion request
                </Button>
              )}
              <Button
                variant="outline"
                loading={submittingAction === "sign-out"}
                disabled={submitting}
                onClick={onSignOut}
                className="min-h-11 w-full px-5 sm:w-auto"
              >
                Sign out
              </Button>
            </div>

            <p className="mt-7 text-sm leading-6 text-gray-600">
              Need help with this request? Email{" "}
              <a
                className="font-bold text-primary-800 underline underline-offset-4 [overflow-wrap:anywhere]"
                href="mailto:privacy@studybuddyng.com"
              >
                privacy@studybuddyng.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
