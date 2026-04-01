import { cookies } from "next/headers";
import ProgressClient from "./ProgressClient";
import type { ProgressFullReport } from "@/app/dashboard/dashboard.types";

export default async function ProgressPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const progressRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/progress/full-report`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  const progress: ProgressFullReport | null = progressRes.ok
    ? await progressRes.json()
    : null;

  return <ProgressClient progress={progress} />;
}
