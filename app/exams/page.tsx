// app/exams/page.tsx

import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { createPageMetadata } from "@/lib/site-metadata";
import MockExamsClient, { MockExamTemplate } from "./MockExamsClient";

export const metadata = createPageMetadata({
  title: "Mock Exams",
  description:
    "Choose a Study Buddy mock-exam template, complete a fresh set of WAEC-style questions and use the result to focus your revision.",
  index: false,
});

export default async function ExamsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const templateRes = await fetch(
    `${baseUrl}/api/v1/mock-exams/mock-exam-templates`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  const templates: MockExamTemplate[] = templateRes.ok
    ? await templateRes.json()
    : [];

  return <MockExamsClient templates={templates} />;
}
