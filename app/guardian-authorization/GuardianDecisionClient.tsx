"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import Heading1 from "@/components/Heading1";
import { readResponseError } from "@/lib/client-response-error";

type RequestDetails = {
  valid: boolean;
  status: string;
  expired: boolean;
  guardianName: string;
  relationship: string;
  studentName: string;
};

export default function GuardianDecisionClient() {
  const tokenRef = useRef("");
  const [details, setDetails] = useState<RequestDetails | null>(null);
  const [lookupComplete, setLookupComplete] = useState(false);
  const [confirmsAuthority, setConfirmsAuthority] = useState(false);
  const [acceptsNotices, setAcceptsNotices] = useState(false);
  const [aiAuthorized, setAiAuthorized] = useState(false);
  const [loading, setLoading] = useState<"GRANT" | "DENY" | null>(null);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<"GRANT" | "DENY" | null>(null);

  useEffect(() => {
    const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    window.history.replaceState({}, "", "/guardian-authorization");
    tokenRef.current = fragmentToken;

    async function lookup() {
      if (!fragmentToken) {
        setLookupComplete(true);
        return;
      }
      try {
        const response = await fetch("/api/v1/guardian-authorizations/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: fragmentToken }),
        });
        if (response.ok) setDetails(await response.json());
      } finally {
        setLookupComplete(true);
      }
    }
    void lookup();
  }, []);

  async function decide(decision: "GRANT" | "DENY") {
    setError("");
    if (decision === "GRANT" && (!confirmsAuthority || !acceptsNotices)) {
      setError("Confirm your authority and that you reviewed both notices.");
      return;
    }
    setLoading(decision);
    try {
      const response = await fetch("/api/v1/guardian-authorizations/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, decision, confirmsAuthority, acceptsNotices, aiAuthorized }),
      });
      if (!response.ok) {
        setError(await readResponseError(response, "The decision could not be saved."));
        return;
      }
      setCompleted(decision);
      tokenRef.current = "";
    } catch {
      setError("The decision could not be saved. Check your connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  const unavailable =
    lookupComplete &&
    (!details?.valid || details.expired || details.status !== "PENDING");
  const studentName = details?.studentName ?? "the student";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <Heading1 gutter="sm">Guardian authorisation</Heading1>
        {!lookupComplete ? (
          <p className="leading-relaxed text-gray-700" role="status">Checking the secure link…</p>
        ) : completed ? (
          <p className="leading-relaxed text-gray-700">Your decision has been recorded. {completed === "GRANT" ? `${studentName}'s account may now be used with the permissions you selected.` : `${studentName}'s account will remain locked.`}</p>
        ) : unavailable ? (
          <p className="leading-relaxed text-gray-700">This link is invalid, expired, already decided, or has been replaced. The student can sign in to request a new link. For help, email <a className="font-semibold text-primary-700 hover:underline" href="mailto:privacy@studybuddyng.com">privacy@studybuddyng.com</a>.</p>
        ) : details ? (
          <div className="space-y-5 text-gray-700">
            <p><strong>{details.guardianName}</strong>, {studentName} identified you as their {details.relationship === "LEGAL_GUARDIAN" ? "legal guardian" : "parent"}. Study Buddy is for users aged 13+, and a 13–17-year-old account stays locked until a parent or legal guardian approves it.</p>
            <div className="rounded-xl bg-primary-50 p-4 text-sm leading-relaxed">Approval permits us to operate the learner account, store profile and study activity, provide practice and progress features, and apply security controls using the overseas providers explained in the notices. AI chat sends relevant prompts and context to OpenAI; that permission is separate below. A school is not given access by this approval.</div>
            <label className="flex items-start gap-3"><input className="mt-1 h-4 w-4 accent-primary-600" type="checkbox" checked={confirmsAuthority} onChange={(event) => setConfirmsAuthority(event.target.checked)} /><span>I confirm I am this student&apos;s parent or legal guardian and have authority to make this decision.</span></label>
            <label className="flex items-start gap-3"><input className="mt-1 h-4 w-4 accent-primary-600" type="checkbox" checked={acceptsNotices} onChange={(event) => setAcceptsNotices(event.target.checked)} /><span>I reviewed the <a target="_blank" rel="noreferrer" className="font-semibold text-primary-700 hover:underline" href="/parent-student-privacy">Parent and Student Privacy Notice</a>, <a target="_blank" rel="noreferrer" className="font-semibold text-primary-700 hover:underline" href="/privacy-policy">Privacy Policy</a>, and <a target="_blank" rel="noreferrer" className="font-semibold text-primary-700 hover:underline" href="/terms-of-service">Terms of Service</a>.</span></label>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4"><input className="mt-1 h-4 w-4 accent-primary-600" type="checkbox" checked={aiAuthorized} onChange={(event) => setAiAuthorized(event.target.checked)} /><span><strong>Optional AI permission:</strong> I authorise this student to use Study Buddy&apos;s AI features, including sending their prompts and relevant context to OpenAI. Without this, the non-AI learning account can still be approved.</span></label>
            <p className="text-sm">You can later withdraw authorisation or request deletion through a verified request to <a className="font-semibold text-primary-700 hover:underline" href="mailto:privacy@studybuddyng.com">privacy@studybuddyng.com</a>. After a verified withdrawal, we sign the student out, restrict the account, stop new AI and WhatsApp activity, and notify both of you while you choose reauthorisation or permanent deletion.</p>
            <FormErrorMessage id="guardian-decision-error" message={error} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" size="lg" className="flex-1" loading={loading === "GRANT"} disabled={Boolean(loading)} onClick={() => decide("GRANT")}>Approve account</Button>
              <Button variant="secondary" size="lg" className="flex-1" loading={loading === "DENY"} disabled={Boolean(loading)} onClick={() => decide("DENY")}>Deny request</Button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
