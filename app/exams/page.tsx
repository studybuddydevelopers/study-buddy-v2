// app/exams/page.tsx

import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import MockExamsClient, { MockExamTemplate } from "./MockExamsClient";

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
