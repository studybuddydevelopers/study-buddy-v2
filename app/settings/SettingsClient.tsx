"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
          Control draft sync and data usage for practice sessions.
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
          description="Pause background draft cloud sync on this account."
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
