// app/exams/[instanceId]/page.tsx

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { createPageMetadata } from "@/lib/site-metadata";
import ExamInstanceClient from "../ExamInstanceClient";

export const metadata = createPageMetadata({
  title: "Mock Exam Session",
  description:
    "Complete your current Study Buddy mock-exam session, save your progress and submit your answers when you are ready for grading.",
  index: false,
});

export default async function ExamInstancePage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = await params;

  if (!instanceId) {
    return notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/v1/mock-exams/instance?instanceId=${instanceId}`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return notFound();
  }

  const data = await res.json();

  return <ExamInstanceClient data={data} />;
}
