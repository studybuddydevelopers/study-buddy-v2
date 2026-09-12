"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
import { readResponseError } from "@/lib/client-response-error";
import { useAuthState } from "@/components/AuthStateProvider";

export default function AccountSettingsClient() {
  const router = useRouter();
  const { setIsAuthenticated } = useAuthState();
  const [accountAction, setAccountAction] = useState<
    "deactivate" | "delete" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  async function submitAccountAction(action: "DEACTIVATE" | "REQUEST_DELETION") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/account/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "REQUEST_DELETION"
            ? { password, confirmation: deleteConfirmation }
            : {}),
        }),
      });
      if (!response.ok) {
        setError(
          await readResponseError(
            response,
            "The account action could not be completed."
          )
        );
        return;
      }
      if (action === "REQUEST_DELETION") {
        setConfirmationEmailSent(true);
        setAccountAction(null);
        setPassword("");
        setDeleteConfirmation("");
        return;
      }
      setIsAuthenticated(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setError(
        "The account action could not be completed. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-[90vw] max-w-3xl space-y-6 py-10">
      <div className="space-y-3">
        <Link
          href="/settings"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Back to settings
        </Link>
        <div className="flex items-center gap-3">
          <StudyBuddyIcon name="shield" size={52} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Account management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Pause your account or request permanent deletion.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {confirmationEmailSent && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
        >
          Check your account email for the one-time deletion confirmation link.
          Your account remains active until you confirm on that page.
        </p>
      )}

      <section className="space-y-4">
        <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-900">Deactivate account</h2>
            <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-800">
              Recommended for a break
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            Your account is locked and you are signed out. Your information is
            kept for 36 months so you can reactivate by signing in again. If you
            do not return, we email warnings 90, 60, 15, and 1 day before
            automatic deletion.
          </p>
          {accountAction === "deactivate" ? (
            <div className="mt-4 rounded-lg border border-primary-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">
                Deactivate your account now?
              </p>
              <p className="mt-1 text-sm text-gray-600">
                You will need to sign in again before you can reactivate it.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                  onClick={() => void submitAccountAction("DEACTIVATE")}
                >
                  Confirm deactivation
                </Button>
                <Button
                  variant="neutral"
                  disabled={loading}
                  onClick={() => {
                    setAccountAction(null);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              className="mt-4"
              disabled={loading}
              onClick={() => {
                setAccountAction("deactivate");
                setError("");
              }}
            >
              Deactivate account
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-5">
          <h2 className="font-semibold text-red-800">
            Permanently delete account
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            We first email a one-time confirmation link to your account address.
            After you confirm, access is restricted immediately and you have 15
            days to reverse the request before deletion processing begins.
          </p>
          {accountAction === "delete" ? (
            <div className="mt-4 space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div>
                <label
                  htmlFor="delete-password"
                  className="text-sm font-medium text-gray-900"
                >
                  Current password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div>
                <label
                  htmlFor="delete-confirmation"
                  className="text-sm font-medium text-gray-900"
                >
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirmation"
                  type="text"
                  autoComplete="off"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  loading={loading}
                  disabled={
                    loading || !password || deleteConfirmation !== "DELETE"
                  }
                  onClick={() => void submitAccountAction("REQUEST_DELETION")}
                >
                  Request permanent deletion
                </Button>
                <Button
                  variant="neutral"
                  disabled={loading}
                  onClick={() => {
                    setAccountAction(null);
                    setPassword("");
                    setDeleteConfirmation("");
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              className="mt-4"
              disabled={loading}
              onClick={() => {
                setAccountAction("delete");
                setError("");
                setConfirmationEmailSent(false);
              }}
            >
              Delete account permanently
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
