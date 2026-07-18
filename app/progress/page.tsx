import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import ProgressClient from "./ProgressClient";
import type { ProgressFullReport } from "@/app/dashboard/dashboard.types";

export default async function ProgressPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const progressRes = await fetch(
    `${baseUrl}/api/v1/progress/full-report`,
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
