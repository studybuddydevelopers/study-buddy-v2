// app/dashboard/DashboardClient.tsx

"use client";

import Heading2 from "@/components/Heading2";
import ProgressBar from "@/components/ProgressBar";
import Button from "@/components/Button";
import { DashboardClientProps } from "./dashboard.types";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Image from "@/components/Image";
import { useMemo } from "react";
import Link from "next/link";

export default function DashboardClient({
  me,
  progress,
  aiRecommendations,
}: DashboardClientProps) {
  const firstName = me?.profile?.firstName ?? "Student";
  const subjects = progress?.subjects ?? [];
  console.log("Me: ", me);
  console.log("Progress: ", progress);

  const randomRecommendationImages = useMemo(
    () =>
      aiRecommendations.map(
        (_, index) =>
          `https://picsum.photos/seed/${Math.random()
            .toString(36)
            .slice(2)}-${index}/500/500`
      ),
    [aiRecommendations]
  );

  return (
    <div className="px-6 py-10 w-[90vw] self-center">
      {/* WELCOME */}
      <>
        <Heading1 style={{marginBottom: "0.3em"}}>
            Welcome back, {firstName}!
        </Heading1>

        <Paragraph variant="superMuted" style={{marginLeft: "0.3em"}}>
            Your personalised study plan is ready.
        </Paragraph>
      </>

      {/* PROGRESS OVERVIEW */}
      <>
        <Heading2 gutter="lg">Progress Overview</Heading2>
        
        <div className="space-y-8 mt-4">
            {subjects.map((s) => (
            <ProgressBar
                key={s.subjectId}
                label={s.subjectName}
                percentage={s.progressPercentage}
                color="primary"
                showPercentage
            />
            ))}
        </div>
      </>

      {/* AI RECOMMENDATIONS */}
      <>
        <Heading2 gutter="lg" className="mt-14">
            AI Recommendations
        </Heading2>

        <div className="flex flex-col">
            {aiRecommendations.map((rec, index) => (
            <div
                key={index}
                className="min-w-[-webkit-fill-available] mb-4 flex flex-row p-4 pl-0 gap-5"
            >
                <div className="flex-1">
                <h3 className="font-semibold mb-2">{rec.title}</h3>
                <p className="text-gray-700 text-sm">{rec.body}</p>
                </div>

                {rec.image ? (
                    <Image
                        src={rec.image}
                        alt={rec.alt ?? "No Alt Available"}
                        className="max-w-[20em] max-h-[12em] object-cover rounded-lg"
                    />
                ) : (
                    <Image
                        src={randomRecommendationImages[index]}
                        alt="Random Image"
                        className="max-w-[20em] max-h-[12em] object-cover rounded-lg"
                    />
                )}

            </div>
            ))}
        </div>
      </>

      {/* QUICK ACTIONS */}
      <>
        <Heading2 gutter="lg" className="mt-14">
            Quick Actions
        </Heading2>

        <div className="flex justify-between">
            <Link href="/chat">
                <Button variant="primary" size="lg" className="rounded-xl">
                AI Q&A Panel
                </Button>
            </Link>
            
            <Link href="/exams">
                <Button variant="neutral" size="lg" className="rounded-xl">
                Mock Exams
                </Button>
            </Link>
        </div>
      </>

    </div>
  );
}
