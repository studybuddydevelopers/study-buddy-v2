// app/dashboard/page.tsx

import DashboardClient from "./DashboardClient";
import { cookies } from "next/headers";
import {
  MeResponse,
  ProgressFullReport,
  AIRecommendation
} from "./dashboard.types";

export default async function DashboardPage() {
  const cookieStore = cookies();

  // Fetch /me
  const meRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/me`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });

  const me: MeResponse | null = meRes.ok ? await meRes.json() : null;

  // Fetch progress report
  const progressRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/progress/full-report`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );
  

  const progress: ProgressFullReport | null = progressRes.ok
    ? await progressRes.json()
    : null;


  // Temporary demo — will later use the real endpoint 
  // TODO: @chindju
  const aiRecommendations: AIRecommendation[] = [
    {
      title: "Focus on Algebra",
      body: "Based on your recent performance, we recommend focusing on Algebra to improve your score.",
      image: "https://picsum.photos/500/500",
      alt: "Random picture",
    },
    {
      title: "Review Grammar Rules",
      body: "Brush up on your grammar to enhance your writing skills.",
      image: "https://picsum.photos/700/700",
      alt: "Random picture",
    },
  ];

  return (
    <DashboardClient
      me={me}
      progress={progress}
      aiRecommendations={aiRecommendations}
    />
  );
}
