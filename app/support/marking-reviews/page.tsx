import { notFound } from "next/navigation";
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

  return <MarkingReviewQueueClient />;
}
