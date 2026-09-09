"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import { readResponseError } from "@/lib/client-response-error";

export default function GuardianPendingClient() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function resend() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/v1/guardian-authorizations/resend", { method: "POST" });
      if (!response.ok) {
        setError(await readResponseError(response, response.status === 401 ? "Sign in first, then request another email." : "The email could not be sent."));
        return;
      }
      const data = await response.json();
      setMessage(`A new approval link was sent to ${data.guardianEmail}.`);
    } catch {
      setError("The email could not be sent. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <Heading1 gutter="sm">Guardian approval is required</Heading1>
        <p className="leading-relaxed text-gray-700">This account stays locked until the parent or legal guardian named during registration uses the one-time email link to approve or deny it.</p>
        <p className="mt-3 text-sm text-gray-600">If the student&apos;s email also needs verification, complete that first. Then sign in here to resend an expired or missing guardian email.</p>
        {message && <p className="mt-4 text-sm font-medium text-green-700" role="status">{message}</p>}
        <div className="mt-4"><FormErrorMessage id="guardian-resend-error" message={error} /></div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="primary" loading={loading} disabled={loading} onClick={resend}>Resend approval email</Button>
          <Link href="/login" className="rounded-xl px-5 py-3 font-semibold text-primary-700 hover:underline">Sign in</Link>
        </div>
        <p className="mt-6 text-sm text-gray-600">Need help? Email <a className="font-semibold text-primary-700 hover:underline" href="mailto:privacy@studybuddyng.com">privacy@studybuddyng.com</a>.</p>
      </section>
    </main>
  );
}
