// app/exams/[instanceId]/page.tsx

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ExamInstanceClient from "../ExamInstanceClient";

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

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/mock-exams/instance?instanceId=${instanceId}`,
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
