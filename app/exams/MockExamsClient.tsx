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
  subject?: {
    id: string;
    name: string;
  } | null;
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
        Pick a mock exam template to generate a fresh set of questions. You’ll
        be redirected to the exam workspace once it starts.
      </Paragraph>

      {error && (
        <Paragraph variant="error" className="mt-3">
          {error}
        </Paragraph>
      )}

      <Heading2 className="mt-8 mb-4">Available templates</Heading2>
      {templates.length === 0 ? (
        <Paragraph variant="error">
          No mock exam templates available yet.
        </Paragraph>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-accent-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-primary-500">
                  {template.subject?.name ?? "Subject"}
                </p>
                <h3 className="text-xl font-semibold text-gray-900">
                  {template.title}
                </h3>
                <Paragraph variant="superMuted" gutter="none" clamp={3}>
                  {template.description || "Practice exam generated for you."}
                </Paragraph>
                <p className="text-sm text-gray-600">
                  {template.questionCount} questions
                </p>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Paragraph variant="muted" gutter="none" className="text-sm">
                  Fresh questions each start
                </Paragraph>
                <Button
                  variant="primary"
                  size="sm"
                  loading={startingTemplateId === template.id}
                  disabled={startingTemplateId === template.id}
                  onClick={() => handleStart(template)}
                >
                  Start exam
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
