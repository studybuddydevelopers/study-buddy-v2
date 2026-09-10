"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";

interface UserSettings {
  cloudPracticeDraftsEnabled: boolean;
  lowDataModeEnabled: boolean;
}

type SettingKey = keyof UserSettings;

const DEFAULT_SETTINGS: UserSettings = {
  cloudPracticeDraftsEnabled: false,
  lowDataModeEnabled: false,
};

export default function StudyPreferencesClient() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/settings", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as {
          settings?: UserSettings;
          error?: string;
        } | null;

        if (!active) return;
        if (!response.ok || !data?.settings) {
          setError(data?.error || "Could not load study preferences.");
          return;
        }

        setSettings({
          cloudPracticeDraftsEnabled: Boolean(
            data.settings.cloudPracticeDraftsEnabled
          ),
          lowDataModeEnabled: Boolean(data.settings.lowDataModeEnabled),
        });
      } catch {
        if (active) setError("Could not load study preferences.");
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
    setSettings({ ...settings, [key]: value });
    setSaving(key);
    setError(null);

    try {
      const response = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = (await response.json().catch(() => null)) as {
        settings?: UserSettings;
        error?: string;
      } | null;

      if (!response.ok || !data?.settings) {
        setSettings(previous);
        setError(data?.error || "Could not save study preferences.");
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
      setError("Could not save study preferences.");
    } finally {
      setSaving(null);
    }
  }

  const cloudSyncPaused =
    settings.cloudPracticeDraftsEnabled && settings.lowDataModeEnabled;

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
          <StudyBuddyIcon name="practice" size={52} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Study preferences
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Control draft syncing, image loading, and mobile data use.
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
    </main>
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
    <div className="flex items-start justify-between gap-4 rounded-xl border border-accent-200 bg-white p-5 shadow-sm">
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

