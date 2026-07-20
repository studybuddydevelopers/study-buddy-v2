"use client";

import { useRouter } from "next/navigation";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";

export interface MaterialsTopicRow {
  id: string;
  title: string;
  sortOrder: number;
  questionCount: number;
  questionsAttempted: number;
  progressPercentage: number;
}

export interface MaterialsSubjectSection {
  id: string;
  name: string;
  examCode: string | null;
  displayName: string;
  topics: MaterialsTopicRow[];
}

export default function MaterialsClient({
  subjects,
}: {
  subjects: MaterialsSubjectSection[];
}) {
  const router = useRouter();
  return (
    <div className="w-[90vw] max-w-5xl mx-auto py-10 space-y-12">
      <div>
        <Heading1 gutter="sm">Study materials</Heading1>
        <Paragraph variant="superMuted" className="max-w-3xl">
          WAEC Mathematics — ten topics covering the full Paper 1 syllabus.
          Open a topic to work through its question bank; progress reflects how
          many distinct questions you have tried. English Language coming soon.
        </Paragraph>
      </div>

      {subjects.length === 0 ? (
        <Paragraph variant="muted">
          No subjects are configured yet. Run{" "}
          <code className="text-sm bg-accent-50 px-1 rounded">npx prisma db seed</code>{" "}
          after migrating so topics appear here.
        </Paragraph>
      ) : (
        subjects.map((subject) => (
          <section key={subject.id} className="space-y-4">
            <Heading2 gutter="sm" className="border-b border-accent-200 pb-2">
              {subject.displayName}
            </Heading2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {subject.topics.map((topic) => (
                <li
                  key={topic.id}
                  className="border border-accent-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900 leading-snug">
                      {topic.title}
                    </p>
                    <span className="text-sm font-semibold tabular-nums text-primary-600 shrink-0">
                      {topic.progressPercentage}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-accent-100 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={topic.progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${topic.title}: ${topic.progressPercentage}% covered`}
                  >
                    <div
                      className="h-full rounded-full bg-primary-500 transition-[width] duration-300"
                      style={{ width: `${topic.progressPercentage}%` }}
                    />
                  </div>
                  <Paragraph variant="muted" gutter="none" className="text-xs">
                    {topic.questionCount === 0 ? (
                      <>No practice questions in the bank for this topic yet.</>
                    ) : (
                      <>
                        {topic.questionsAttempted} of {topic.questionCount}{" "}
                        practice questions touched
                      </>
                    )}
                  </Paragraph>
                  <Button
                    variant="primary"
                    size="sm"
                    className="self-start mt-1"
                    disabled={topic.questionCount === 0}
                    onClick={() =>
                      router.push(`/materials/practice/${topic.id}`)
                    }
                  >
                    Practice this topic
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
