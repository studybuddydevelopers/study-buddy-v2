// app/dashboard/page.tsx

import DashboardClient from "./DashboardClient";
import { cookies } from "next/headers";
import {
  MeResponse,
  ProgressFullReport,
  AIRecommendation
} from "./dashboard.types";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  // Fetch /me
  const meRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/me`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  const me: MeResponse | null = meRes.ok ? await meRes.json() : null;

  // Fetch progress report
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

  // Fetch AI recommendations (auto-generates if stale)
  const recRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/ai/recommendations`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  let aiRecommendations: AIRecommendation[] = [];
  if (recRes.ok) {
    const data = await recRes.json();
    aiRecommendations = data?.recommendations ?? [];
  }
  if (aiRecommendations.length === 0) {
    aiRecommendations = [
      {
        title: "AI Recommendation",
        body: "No recommendations available yet. Keep practicing to receive personalized guidance.",
      },
    ];
  }

  return (
    <DashboardClient
      me={me}
      progress={progress}
      aiRecommendations={aiRecommendations}
    />
  );
}
