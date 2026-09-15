// app/exams/MockExamsClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
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
  title,
  description,
}: {
  templates: MockExamTemplate[];
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

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
      <Link
        href="/exams"
        prefetch={false}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700"
      >
        <StudyBuddyIcon
          name="chevron"
          size={16}
          className="rotate-180"
        />
        All mock exam options
      </Link>
      <Heading1 gutter="sm">{title}</Heading1>
      <Paragraph variant="superMuted" className="max-w-3xl">
        {description}
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
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              starting={startingTemplateId === template.id}
              onStart={handleStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
