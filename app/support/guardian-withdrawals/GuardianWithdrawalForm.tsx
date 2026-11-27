"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import { readResponseError } from "@/lib/client-response-error";

export default function GuardianWithdrawalForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ studentNotified: boolean; guardianNotified: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/v1/support/guardian-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorizationId: String(data.get("authorizationId") ?? "").trim(),
          caseReference: data.get("caseReference"),
          verified: data.get("verified") === "on",
        }),
      });
      if (!response.ok) {
        setError(await readResponseError(response, "The withdrawal could not be saved. Review the case before retrying."));
        return;
      }
      setResult(await response.json());
    } catch {
      setError("The result could not be confirmed. Use the same references to check or retry the notices.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto my-8 w-full max-w-xl space-y-5 rounded-xl border border-gray-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-gray-900">Guardian withdrawal</h1>
      <p className="text-sm text-gray-700">Use the verified request in the private privacy register. This ends the learner’s sessions and restricts access while saved work is held for a decision.</p>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold text-gray-900">
          Guardian authorisation ID
          <input name="authorizationId" autoComplete="off" required maxLength={36} className="mt-1 block w-full rounded-lg border border-gray-400 p-3" />
        </label>
        <label className="block text-sm font-semibold text-gray-900">
          Private case reference
          <input name="caseReference" autoComplete="off" required minLength={8} maxLength={80} className="mt-1 block w-full rounded-lg border border-gray-400 p-3" />
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-900">
          <input type="checkbox" name="verified" required className="mt-1" />
          <span>I verified the requester’s authority and matched the case to this authorisation.</span>
        </label>
        <Button type="submit" variant="destructive" loading={busy}>
          {result && (!result.studentNotified || !result.guardianNotified) ? "Retry notices" : "Restrict the account"}
        </Button>
        <FormErrorMessage id="guardian-withdrawal-error" message={error} />
      </form>
      {result && (
        <div role="status" className="space-y-2 text-sm text-gray-900">
          <p>The account is restricted.</p>
          <p>Student notice {result.studentNotified ? "accepted for sending." : "needs a retry."}</p>
          <p>Guardian notice {result.guardianNotified ? "accepted for sending." : "needs a retry."}</p>
        </div>
      )}
    </section>
  );
}
