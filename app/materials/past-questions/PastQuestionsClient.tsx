"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import Paragraph from "@/components/Paragraph";
import type { MaterialsSubjectSection } from "../materials.types";

export default function PastQuestionsClient({
  subjects,
}: {
  subjects: MaterialsSubjectSection[];
}) {
  return (
    <div className="w-[90vw] max-w-6xl mx-auto py-10 space-y-10">
      <div className="space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/materials"
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              Back to materials
            </Link>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-gray-900">
              Past Questions by Topic
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Pick a subject, then open a topic to start a practice session.
            </p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <p className="rounded-lg border border-accent-200 bg-white p-4 text-sm text-gray-600">
            No subjects are configured yet.
          </p>
        ) : (
          <div className="space-y-10">
            {subjects.map((subject) => (
              <section key={subject.id} className="space-y-4">
                <h2 className="text-2xl font-bold tracking-normal text-gray-900">
                  {subject.displayName}
                </h2>
                <ul className="grid gap-4 md:grid-cols-2">
                  {subject.topics.map((topic) => (
                    <li key={topic.id}>
                      <Link
                        href={`/materials/practice/${topic.id}`}
                        className="block rounded-lg border border-accent-200 bg-white p-4 text-gray-900 shadow-sm transition hover:border-primary-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                              <BookOpen
                                size={28}
                                className="text-primary-500"
                                aria-hidden="true"
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold leading-snug text-gray-900">
                                {topic.title}
                              </h3>
                              <Paragraph
                                variant="muted"
                                gutter="none"
                                className="mt-1 text-xs text-gray-600"
                              >
                                {topic.questionCount === 0
                                  ? "No questions in the bank yet."
                                  : `${topic.questionsAttempted} of ${topic.questionCount} questions touched`}
                              </Paragraph>
                            </div>
                          </div>
                          <ChevronRight
                            size={18}
                            className="mt-1 shrink-0 text-primary-500"
                          />
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-100">
                            <div
                              className="h-full rounded-full bg-primary-500"
                              style={{ width: `${topic.progressPercentage}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-600">
                            {topic.progressPercentage}%
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
