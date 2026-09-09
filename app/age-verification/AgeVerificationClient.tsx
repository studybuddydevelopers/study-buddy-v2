"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import TextField from "@/components/TextField";
import { latestAllowedBirthDate, parseBirthDate } from "@/lib/account-age";

export default function AgeVerificationClient() {
  const router = useRouter();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState<"PARENT" | "LEGAL_GUARDIAN">("PARENT");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const age = dateOfBirth ? parseBirthDate(dateOfBirth) : null;
  const isMinor = age?.ok && age.ageBand === "MINOR";

  async function submit() {
    setError("");
    if (!age?.ok) {
      setError("Enter a valid date of birth.");
      return;
    }
    if (age.ageBand !== "TOO_YOUNG" && !acceptedTerms) {
      setError("Enter your date of birth and accept the current terms.");
      return;
    }
    if (isMinor && (!guardianName.trim() || !guardianEmail.trim())) {
      setError("Enter your parent or legal guardian's name and email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/account/age-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth,
          acceptedTerms,
          guardianName: isMinor ? guardianName : undefined,
          guardianEmail: isMinor ? guardianEmail : undefined,
          guardianRelationship: isMinor ? guardianRelationship : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.nextPath) router.push(data.nextPath);
        else setError(typeof data.message === "string" ? data.message : "The age check could not be completed.");
        return;
      }
      router.push(data.nextPath || "/dashboard");
      router.refresh();
    } catch {
      setError("The age check could not be completed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <Heading1 gutter="sm">Complete your age check</Heading1>
        <p className="mb-6 leading-relaxed text-gray-700">
          Study Buddy is for users aged 13 and over. Users aged 13–17 need approval from a parent or legal guardian before the account can be used.
        </p>
        <div className="space-y-4">
          <TextField label="Date of Birth" type="date" value={dateOfBirth} max={latestAllowedBirthDate()} onChange={(event) => setDateOfBirth(event.target.value)} required autoComplete="bday" />
          {isMinor && (
            <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
              <p className="text-sm text-gray-800">We will email a one-time approval link to your parent or legal guardian. Your account stays locked until they approve it.</p>
              <TextField label="Parent or Legal Guardian Name" value={guardianName} onChange={(event) => setGuardianName(event.target.value)} required autoComplete="name" />
              <TextField label="Parent or Legal Guardian Email" type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} required autoComplete="email" />
              <label className="block text-sm font-semibold text-gray-900">
                Relationship
                <select value={guardianRelationship} onChange={(event) => setGuardianRelationship(event.target.value as "PARENT" | "LEGAL_GUARDIAN")} className="mt-1 w-full rounded-xl bg-white px-4 py-3">
                  <option value="PARENT">Parent</option>
                  <option value="LEGAL_GUARDIAN">Legal guardian</option>
                </select>
              </label>
            </div>
          )}
          <label className="flex items-start gap-3 text-sm leading-relaxed text-gray-700">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 accent-primary-600" />
            <span>I have read and agree to the <a href="/terms-of-service" target="_blank" rel="noreferrer" className="font-semibold text-primary-700 hover:underline">Terms of Service</a> and <a href="/privacy-policy" target="_blank" rel="noreferrer" className="font-semibold text-primary-700 hover:underline">Privacy Policy</a>.</span>
          </label>
          <FormErrorMessage id="age-verification-error" message={error} />
          <Button variant="primary" size="lg" className="w-full" loading={loading} disabled={loading} onClick={submit}>Continue</Button>
        </div>
      </section>
    </main>
  );
}
