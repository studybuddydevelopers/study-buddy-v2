// app/exams/MockExamsClient.tsx
"use client";

import { useState } from "react";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

export interface MockExamTemplate {
  id: string;
  subjectId: string;
  title: string;
  description?: string | null;
  questionCount: number;
  format: "OBJECTIVE" | "WRITTEN";
  durationMinutes?: number | null;
  totalMarks?: number | null;
  requiredQuestionCount?: number | null;
  subject?: {
    id: string;
    name: string;
  } | null;
}

function isFullMock(template: MockExamTemplate) {
  return (
    template.title.includes("Paper 1") || template.title.includes("Paper 2")
  );
}

function displayTitle(template: MockExamTemplate) {
  return template.title.split(" – ").at(-1) ?? template.title;
}

function TemplateCard({
  template,
  starting,
  onStart,
}: {
  template: MockExamTemplate;
  starting: boolean;
  onStart: (template: MockExamTemplate) => void;
}) {
  const fullMock = isFullMock(template);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-accent-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-primary-500">
            {template.subject?.name ?? "Subject"}
          </p>
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            {fullMock ? "Full mock" : "Practice"}
          </span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">
          {displayTitle(template)}
        </h3>
        <Paragraph variant="superMuted" gutter="none" clamp={3}>
          {template.description || "Practice exam generated for you."}
        </Paragraph>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-sm text-gray-600">
          <span>
            {template.format === "WRITTEN" &&
            template.requiredQuestionCount
              ? `${template.questionCount} provided · answer ${template.requiredQuestionCount}`
              : `${template.questionCount} questions`}
          </span>
          {template.durationMinutes ? (
            <span>{template.durationMinutes} minutes</span>
          ) : null}
          <span>
            {template.format === "WRITTEN"
              ? "Written paper"
              : "Multiple choice"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Paragraph variant="muted" gutter="none" className="text-sm">
          {template.format === "WRITTEN"
            ? "Structured WAEC-style paper"
            : "Fresh questions each start"}
        </Paragraph>
        <Button
          variant="primary"
          size="sm"
          loading={starting}
          disabled={starting}
          onClick={() => onStart(template)}
        >
          {fullMock ? "Start mock" : "Start practice"}
        </Button>
      </div>
    </div>
  );
}

export default function MockExamsClient({
  templates,
}: {
  templates: MockExamTemplate[];
}) {
  const router = useRouter();
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const fullMocks = templates
    .filter(isFullMock)
    .sort((a, b) => a.title.localeCompare(b.title));
  const practiceSessions = templates
    .filter((template) => !isFullMock(template))
    .sort((a, b) => a.questionCount - b.questionCount);

  const handleStart = async (template: MockExamTemplate) => {
    setError(null);
    setStartingTemplateId(template.id);
    try {
      const res = await fetch("/api/v1/mock-exams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Failed to start mock exam.");
        return;
      }

      const data = await res.json();
      router.push(`/exams/${data.instance.id}`);
    } catch (err) {
      console.error(err);
      setError("Unable to start the mock exam right now.");
    } finally {
      setStartingTemplateId(null);
    }
  };

  return (
    <div className="w-[90vw] max-w-5xl mx-auto py-10">
      <Heading1 gutter="sm">Mock Exams</Heading1>
      <Paragraph variant="superMuted" className="max-w-3xl">
        Choose a full WAEC-format mock when you want exam conditions, or a
        shorter practice session when you want focused revision.
      </Paragraph>

      {error && (
        <Paragraph variant="error" className="mt-3">
          {error}
        </Paragraph>
      )}

      {templates.length === 0 ? (
        <Paragraph variant="error" className="mt-8">
          No mock exam templates available yet.
        </Paragraph>
      ) : (
        <div className="mt-10 space-y-10">
          {fullMocks.length > 0 ? (
            <section aria-labelledby="full-mock-heading">
              <Heading2 id="full-mock-heading" gutter="sm">
                Full WAEC mock exams
              </Heading2>
              <Paragraph variant="superMuted" className="max-w-3xl">
                Use these when you are ready to practise the official Paper 1
                or Paper 2 structure and timing.
              </Paragraph>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {fullMocks.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    starting={startingTemplateId === template.id}
                    onStart={handleStart}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {practiceSessions.length > 0 ? (
            <section aria-labelledby="practice-heading">
              <Heading2 id="practice-heading" gutter="sm">
                Practice sessions
              </Heading2>
              <Paragraph variant="superMuted" className="max-w-3xl">
                Start small or build up gradually. These are revision sessions,
                not separate WAEC paper formats.
              </Paragraph>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {practiceSessions.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    starting={startingTemplateId === template.id}
                    onStart={handleStart}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
