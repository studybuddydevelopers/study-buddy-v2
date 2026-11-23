import { notFound } from "next/navigation";
import Link from "next/link";
import { requireMarkingReviewSupport } from "@/lib/marking-review-support";
import { createPageMetadata } from "@/lib/site-metadata";
import MarkingReviewQueueClient from "./MarkingReviewQueueClient";

export const metadata = createPageMetadata({
  title: "Marking Review Queue",
  description:
    "Restricted Study Buddy support workspace for reviewing disputed written mock-exam marks.",
  index: false,
});

export default async function MarkingReviewQueuePage() {
  const auth = await requireMarkingReviewSupport();
  if ("errorResponse" in auth) notFound();

  return <><Link href="/support/chat-reports" className="inline-flex min-h-11 items-center text-primary-700 underline">Chat response reports</Link><MarkingReviewQueueClient /></>;
}
