// app/dashboard/page.tsx

import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import type { MeResponse, DashboardStats } from "./dashboard.types";

export const metadata: Metadata = {
  title: "Dashboard | Study Buddy",
  description:
    "See your Study Buddy plan, recent activity, learning progress, and recommended next steps in one place.",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const headers = { Cookie: cookieHeader };

  const [meRes, statsRes] = await Promise.all([
    fetch(`${baseUrl}/api/v1/me`, { headers, cache: "no-store" }),
    fetch(`${baseUrl}/api/v1/dashboard/stats`, { headers, cache: "no-store" }),
  ]);

  const me: MeResponse | null = meRes.ok ? await meRes.json() : null;
  const stats: DashboardStats | null = statsRes.ok ? await statsRes.json() : null;

  return <DashboardClient me={me} stats={stats} />;
}
