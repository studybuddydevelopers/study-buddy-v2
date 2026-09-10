"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { readResponseError } from "@/lib/client-response-error";

interface UserSettings {
  cloudPracticeDraftsEnabled: boolean;
  lowDataModeEnabled: boolean;
}

type SettingKey = keyof UserSettings;

const DEFAULT_SETTINGS: UserSettings = {
  cloudPracticeDraftsEnabled: false,
  lowDataModeEnabled: false,
};

export default function SettingsClient() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountAction, setAccountAction] = useState<
    "deactivate" | "delete" | null
  >(null);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountActionError, setAccountActionError] = useState("");
  const [password, setPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/settings", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          settings?: UserSettings;
          error?: string;
        } | null;

        if (!active) return;
        if (!res.ok || !data?.settings) {
          setError(data?.error || "Could not load settings.");
          return;
        }

        setSettings({
          cloudPracticeDraftsEnabled: Boolean(
            data.settings.cloudPracticeDraftsEnabled
          ),
          lowDataModeEnabled: Boolean(data.settings.lowDataModeEnabled),
        });
      } catch {
        if (active) setError("Could not load settings.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  async function updateSetting(key: SettingKey, value: boolean) {
    const previous = settings;
    const next = { ...settings, [key]: value };

    setSettings(next);
    setSaving(key);
    setError(null);

    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = (await res.json().catch(() => null)) as {
        settings?: UserSettings;
        error?: string;
      } | null;

      if (!res.ok || !data?.settings) {
        setSettings(previous);
        setError(data?.error || "Could not save settings.");
        return;
      }

      setSettings({
        cloudPracticeDraftsEnabled: Boolean(
          data.settings.cloudPracticeDraftsEnabled
        ),
        lowDataModeEnabled: Boolean(data.settings.lowDataModeEnabled),
      });
    } catch {
      setSettings(previous);
      setError("Could not save settings.");
    } finally {
      setSaving(null);
    }
  }

  const cloudSyncPaused =
    settings.cloudPracticeDraftsEnabled && settings.lowDataModeEnabled;

  async function submitAccountAction(action: "DEACTIVATE" | "REQUEST_DELETION") {
    setAccountActionLoading(true);
    setAccountActionError("");
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
        setAccountActionError(
          await readResponseError(
            response,
            "The account action could not be completed."
          )
        );
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setAccountActionError(
        "The account action could not be completed. Check your connection and try again."
      );
    } finally {
      setAccountActionLoading(false);
    }
  }

  return (
    <div className="w-[90vw] max-w-3xl mx-auto py-10 space-y-6">
      <div className="space-y-2">
        <Link
          href="/profile"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Back to profile
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600">
          Control draft sync, image loading, and data usage for study sessions.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <SettingToggle
          title="Cloud-save practice drafts"
          description="Sync unfinished practice answers across devices when the connection allows it."
          checked={settings.cloudPracticeDraftsEnabled}
          disabled={loading || saving !== null}
          saving={saving === "cloudPracticeDraftsEnabled"}
          onChange={(checked) =>
            updateSetting("cloudPracticeDraftsEnabled", checked)
          }
        />

        <SettingToggle
          title="Low Data Mode"
          description="Pause background draft cloud sync and keep question images hidden until you choose to load them."
          checked={settings.lowDataModeEnabled}
          disabled={loading || saving !== null}
          saving={saving === "lowDataModeEnabled"}
          onChange={(checked) => updateSetting("lowDataModeEnabled", checked)}
        />
      </section>

      {cloudSyncPaused && (
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Cloud practice drafts are enabled but paused while Low Data Mode is on.
        </p>
      )}

      <section className="space-y-4 border-t border-gray-200 pt-8">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">Account access</h2>
          <p className="text-sm leading-6 text-gray-600">
            You can take a break without deleting your information, or request
            permanent deletion. Both choices sign you out immediately.
          </p>
        </div>

        {accountActionError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {accountActionError}
          </p>
        )}

        <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">Deactivate account</h3>
            <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-800">
              Recommended for a break
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            Your account is locked and you are signed out. Your information is
            kept under our inactive-account policy so you can reactivate by
            signing in again.
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
                  loading={accountActionLoading}
                  disabled={accountActionLoading}
                  onClick={() => void submitAccountAction("DEACTIVATE")}
                >
                  Confirm deactivation
                </Button>
                <Button
                  variant="neutral"
                  disabled={accountActionLoading}
                  onClick={() => {
                    setAccountAction(null);
                    setAccountActionError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-4"
              disabled={accountActionLoading}
              onClick={() => {
                setAccountAction("deactivate");
                setAccountActionError("");
              }}
            >
              Deactivate account
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-5">
          <h3 className="font-semibold text-red-800">Permanently delete account</h3>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            Access is restricted immediately. Your account and active-system
            personal data are scheduled for deletion within 30 days, except
            records we must retain by law. Deleted data ages out of backups
            within 90 days.
          </p>
          {accountAction === "delete" ? (
            <div className="mt-4 space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div>
                <label htmlFor="delete-password" className="text-sm font-medium text-gray-900">
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
                <label htmlFor="delete-confirmation" className="text-sm font-medium text-gray-900">
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
                  loading={accountActionLoading}
                  disabled={
                    accountActionLoading ||
                    !password ||
                    deleteConfirmation !== "DELETE"
                  }
                  onClick={() => void submitAccountAction("REQUEST_DELETION")}
                >
                  Request permanent deletion
                </Button>
                <Button
                  variant="neutral"
                  disabled={accountActionLoading}
                  onClick={() => {
                    setAccountAction(null);
                    setPassword("");
                    setDeleteConfirmation("");
                    setAccountActionError("");
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
              disabled={accountActionLoading}
              onClick={() => {
                setAccountAction("delete");
                setAccountActionError("");
              }}
            >
              Delete account permanently
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  disabled,
  saving,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-accent-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm leading-6 text-gray-600">{description}</p>
        {saving && <p className="text-xs text-gray-500">Saving...</p>}
      </div>

      <label className="relative mt-1 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-60" />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}
