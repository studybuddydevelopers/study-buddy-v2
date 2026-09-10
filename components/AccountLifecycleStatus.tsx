"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import { accountStatusDestination } from "@/lib/account-status";
import { readResponseError } from "@/lib/client-response-error";

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
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [cancellationAllowed, setCancellationAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/v1/account/lifecycle", {
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/login");
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
  }, [mode, router]);

  async function restoreAccess() {
    setSubmitting(true);
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
      router.replace("/login");
      router.refresh();
    } catch {
      setError("The request could not be completed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setSubmitting(true);
    try {
      await fetch("/api/v1/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const deletionDate = scheduledFor
    ? new Intl.DateTimeFormat("en-NG", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(scheduledFor))
    : null;

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
              loading={submitting}
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
