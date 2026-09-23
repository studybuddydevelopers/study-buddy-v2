import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { createPageMetadata } from "@/lib/site-metadata";
import MarkingReviewsClient from "./MarkingReviewsClient";

export const metadata = createPageMetadata({
  title: "Marking Reviews",
  description:
    "Track requests for a Study Buddy support review of AI-marked written mock-exam answers.",
  index: false,
});

export default async function MarkingReviewsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/mock-exams/marking-reviews`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  const body = response.ok
    ? ((await response.json()) as { reviews?: LearnerReviewCase[] })
    : null;

  return <MarkingReviewsClient reviews={body?.reviews ?? null} />;
}

export interface LearnerReviewCase {
  id: string;
  reference: string;
  status: "PENDING" | "UPHELD" | "MARK_ADJUSTED";
  statusLabel: string;
  examInstanceId: string;
  examHref: string;
  paperTitle: string;
  subjectName: string;
  questionReference: string;
  originalScore: number;
  revisedScore: number | null;
  currentScore: number;
  maxScore: number;
  resolutionNote: string | null;
  submittedAt: string;
  resolvedAt: string | null;
}
