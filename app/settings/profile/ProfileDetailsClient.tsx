"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Image from "@/components/Image";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
import { readResponseError } from "@/lib/client-response-error";
import { PROFILE_GRADE_OPTIONS } from "@/lib/profile-input";

interface EditableProfile {
  firstName: string;
  middleNames: string;
  lastNames: string;
  phoneNumber: string;
  gradeLevel: string;
  examYear: number | null;
  preferredSubjects: string[];
  avatarUrl: string | null;
}

interface SubjectOption {
  id: string;
  name: string;
}

const PHONE_PATTERN = /^[0-9+\-() ]{6,32}$/;

function fieldClass(hasError = false) {
  return `mt-1 min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-gray-300 focus:border-[#6C3483] focus:ring-[#E9D8F0]"
  }`;
}

export default function ProfileDetailsClient({
  backHref,
  backLabel,
  email,
  initialProfile,
  subjects,
}: {
  backHref: string;
  backLabel: string;
  email: string;
  initialProfile: EditableProfile;
  subjects: SubjectOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"firstName" | "lastNames" | "phoneNumber", string>>
  >({});
  const currentYear = new Date().getFullYear();
  const examYears = Array.from(
    { length: 8 },
    (_, index) => currentYear - 1 + index
  );

  function updateField<K extends keyof EditableProfile>(
    key: K,
    value: EditableProfile[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError("");
    if (key === "firstName" || key === "lastNames" || key === "phoneNumber") {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function toggleSubject(subjectId: string) {
    updateField(
      "preferredSubjects",
      form.preferredSubjects.includes(subjectId)
        ? form.preferredSubjects.filter((id) => id !== subjectId)
        : [...form.preferredSubjects, subjectId]
    );
  }

  function validate() {
    const nextErrors: typeof fieldErrors = {};
    if (!form.firstName.trim()) nextErrors.firstName = "Enter your first name.";
    if (!form.lastNames.trim()) nextErrors.lastNames = "Enter your surname.";
    if (!PHONE_PATTERN.test(form.phoneNumber.trim())) {
      nextErrors.phoneNumber = "Enter a valid phone number.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          middleNames: form.middleNames.trim() || null,
          lastNames: form.lastNames.trim(),
          phoneNumber: form.phoneNumber.trim(),
          gradeLevel: form.gradeLevel || null,
          examYear: form.examYear,
          preferredSubjects: form.preferredSubjects,
        }),
      });

      if (!response.ok) {
        setError(
          await readResponseError(
            response,
            "We couldn't save your profile. Please try again."
          )
        );
        return;
      }

      const body = (await response.json()) as { profile?: EditableProfile };
      if (body.profile) {
        setForm({
          ...form,
          ...body.profile,
          middleNames: body.profile.middleNames ?? "",
          gradeLevel: body.profile.gradeLevel ?? "",
          avatarUrl: body.profile.avatarUrl ?? null,
        });
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("We couldn't save your profile. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 py-4 pb-24 sm:py-8 lg:pb-8">
      <header className="rounded-3xl border border-[#E4D6EA] bg-[#F7F0FA] p-5 sm:p-7">
        <Link
          href={backHref}
          className="text-sm font-bold text-[#6C3483] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
        >
          {backLabel}
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-fit rounded-full bg-white p-1 shadow-sm">
            <Image
              src={form.avatarUrl || "/images/profile-avatar.svg"}
              alt="Your profile avatar"
              width={88}
              height={88}
              sizes="88px"
              widths={[88, 176]}
              rounded="full"
              className="!h-[88px] !w-[88px] object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#6C3483]">Your profile</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">
              Personal and study details
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Keep these details current so your Study Buddy experience reflects
              your learning stage and subjects.
            </p>
          </div>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {saved ? (
        <p
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          Your profile has been saved.
        </p>
      ) : null}

      <form onSubmit={saveProfile} className="space-y-6" noValidate>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <StudyBuddyIcon name="profile" size={56} className="shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-gray-950">Personal details</h2>
              <p className="mt-1 text-sm text-gray-600">
                Your account email is managed separately from these profile fields.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-900">
              First name <span className="text-red-600">*</span>
              <input
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                autoComplete="given-name"
                maxLength={80}
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? "first-name-error" : undefined}
                className={fieldClass(Boolean(fieldErrors.firstName))}
              />
              {fieldErrors.firstName ? (
                <span id="first-name-error" className="mt-1 block text-sm text-red-700">
                  {fieldErrors.firstName}
                </span>
              ) : null}
            </label>

            <label className="block text-sm font-semibold text-gray-900">
              Middle name(s)
              <input
                value={form.middleNames}
                onChange={(event) => updateField("middleNames", event.target.value)}
                autoComplete="additional-name"
                maxLength={120}
                className={fieldClass()}
              />
            </label>

            <label className="block text-sm font-semibold text-gray-900">
              Surname <span className="text-red-600">*</span>
              <input
                value={form.lastNames}
                onChange={(event) => updateField("lastNames", event.target.value)}
                autoComplete="family-name"
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.lastNames)}
                aria-describedby={fieldErrors.lastNames ? "surname-error" : undefined}
                className={fieldClass(Boolean(fieldErrors.lastNames))}
              />
              {fieldErrors.lastNames ? (
                <span id="surname-error" className="mt-1 block text-sm text-red-700">
                  {fieldErrors.lastNames}
                </span>
              ) : null}
            </label>

            <label className="block text-sm font-semibold text-gray-900">
              Phone number <span className="text-red-600">*</span>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(event) => updateField("phoneNumber", event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                maxLength={32}
                aria-invalid={Boolean(fieldErrors.phoneNumber)}
                aria-describedby={fieldErrors.phoneNumber ? "phone-error" : undefined}
                className={fieldClass(Boolean(fieldErrors.phoneNumber))}
              />
              {fieldErrors.phoneNumber ? (
                <span id="phone-error" className="mt-1 block text-sm text-red-700">
                  {fieldErrors.phoneNumber}
                </span>
              ) : null}
            </label>

            <label className="block text-sm font-semibold text-gray-900 sm:col-span-2">
              Account email
              <input
                type="email"
                value={email}
                readOnly
                aria-describedby="email-help"
                className={`${fieldClass()} cursor-not-allowed bg-gray-100 text-gray-600`}
              />
              <span id="email-help" className="mt-1 block text-xs leading-5 text-gray-500">
                Contact Study Buddy support if this address needs to change.
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <StudyBuddyIcon name="plan" size={56} className="shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-gray-950">Study profile</h2>
              <p className="mt-1 text-sm text-gray-600">
                Set the school level, exam year and subjects you want to prioritise.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-900">
              School level
              <select
                value={form.gradeLevel}
                onChange={(event) => updateField("gradeLevel", event.target.value)}
                className={fieldClass()}
              >
                <option value="">Not set</option>
                {form.gradeLevel &&
                !PROFILE_GRADE_OPTIONS.includes(
                  form.gradeLevel as (typeof PROFILE_GRADE_OPTIONS)[number]
                ) ? (
                  <option value={form.gradeLevel}>{form.gradeLevel}</option>
                ) : null}
                {PROFILE_GRADE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-gray-900">
              Target WAEC year
              <select
                value={form.examYear ?? ""}
                onChange={(event) =>
                  updateField(
                    "examYear",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                className={fieldClass()}
              >
                <option value="">Not set</option>
                {examYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-gray-900">
              Preferred subjects
            </legend>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Select every subject you want Study Buddy to keep easy to reach.
            </p>
            {subjects.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {subjects.map((subject) => {
                  const checked = form.preferredSubjects.includes(subject.id);
                  return (
                    <label
                      key={subject.id}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                        checked
                          ? "border-[#6C3483] bg-[#F7F0FA]"
                          : "border-gray-200 bg-white hover:border-[#C7A6D5]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubject(subject.id)}
                        className="h-5 w-5 shrink-0 accent-[#6C3483]"
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        {subject.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                No subjects are currently available to select.
              </p>
            )}
          </fieldset>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-800 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            loading={saving}
            disabled={saving}
            className="min-h-11 rounded-xl px-6"
          >
            Save profile
          </Button>
        </div>
      </form>
    </main>
  );
}
