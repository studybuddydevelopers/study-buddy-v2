import Link from "next/link";
import Heading1 from "@/components/Heading1";
import { PRIVACY_EMAIL } from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Account Unavailable",
  description: "Study Buddy account age requirement.",
  index: false,
});

export default function AccountUnavailablePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <Heading1 gutter="sm">This account cannot be used yet</Heading1>
        <p className="leading-relaxed text-gray-700">Study Buddy accounts are currently available only to users aged 13 and over.</p>
        <p className="mt-4 text-sm text-gray-600">If the date of birth was entered incorrectly, contact <a className="font-semibold text-primary-700 hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</p>
        <Link href="/" className="mt-6 inline-block font-semibold text-primary-700 hover:underline">Return home</Link>
      </section>
    </main>
  );
}
