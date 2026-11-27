import { PRIVACY_EMAIL } from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Guardian Authorisation Withdrawn",
  description: "Contact Study Buddy Privacy about a restricted learner account.",
  index: false,
});

export default function GuardianAuthorisationWithdrawnPage() {
  return (
    <section className="mx-auto my-10 w-full max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-gray-900">Account access is paused</h1>
      <p className="text-gray-700">Study Buddy has ended access to this learner account following a verified withdrawal of guardian approval. Saved work is held securely while the guardian decides what happens next.</p>
      <p className="text-gray-700">
        Ask your parent or guardian, or email{" "}
        <a className="font-semibold text-primary-700 underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
        {" "}for help.
      </p>
    </section>
  );
}
