// app/exams/page.tsx

import { cookies } from "next/headers";
import MockExamsClient, { MockExamTemplate } from "./MockExamsClient";

export default async function ExamsPage() {
  const cookieStore = cookies();

  const templateRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/mock-exams/mock-exam-templates`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  const templates: MockExamTemplate[] = templateRes.ok
    ? await templateRes.json()
    : [];

  return <MockExamsClient templates={templates} />;
}
