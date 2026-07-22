import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import ProgressClient from "./ProgressClient";
import type { ProgressFullReport } from "@/app/dashboard/dashboard.types";

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const mockPage = firstQueryValue(resolvedSearchParams.mockPage) ?? "1";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const progressUrl = new URL(`${baseUrl}/api/v1/progress/full-report`);
  progressUrl.searchParams.set("page", mockPage);
  progressUrl.searchParams.set("pageSize", "10");

  const progressRes = await fetch(progressUrl, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  const progress: ProgressFullReport | null = progressRes.ok
    ? await progressRes.json()
    : null;

  return <ProgressClient progress={progress} />;
}
