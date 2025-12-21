// app/exams/MockExamsClient.tsx
"use client";

import { useMemo, useState } from "react";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Image from "@/components/Image";

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

interface MockExamQuestion {
  id: string;
  questionText: string;
  questionImageUrl?: string | null;
  year?: number | null;
  questionNumber?: number | null;
  difficulty?: string | null;
}

interface MockExamAnswerRow {
  id: string;
  pastQuestionId: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  score: number | null;
}

interface StartResponse {
  instance: {
    id: string;
    startedAt: string;
    graded: boolean;
    totalScore: number | null;
  };
  questions: MockExamQuestion[];
  answers: MockExamAnswerRow[];
}

interface GradeResponse {
  instanceId: string;
  totalScore: number;
  graded: boolean;
  answers: {
    id: string;
    isCorrect: boolean;
    score: number;
  }[];
}

interface ActiveExam {
  instanceId: string;
  template: MockExamTemplate;
  questions: MockExamQuestion[];
  answers: MockExamAnswerRow[];
  startedAt: string;
}

export default function MockExamsClient({
  templates,
}: {
  templates: MockExamTemplate[];
}) {
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [gradeResult, setGradeResult] = useState<GradeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const answerIdByQuestionId = useMemo(() => {
    const map = new Map<string, string>();
    activeExam?.answers.forEach((a) => {
      map.set(a.pastQuestionId, a.id);
    });
    return map;
  }, [activeExam]);

  const gradedByAnswerId = useMemo(() => {
    const map = new Map<string, { isCorrect: boolean; score: number }>();
    gradeResult?.answers.forEach((a) => {
      map.set(a.id, { isCorrect: a.isCorrect, score: a.score });
    });
    return map;
  }, [gradeResult]);

  const handleStart = async (template: MockExamTemplate) => {
    setError(null);
    setStatus(null);
    setGradeResult(null);
    setActiveExam(null);
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

      const data: StartResponse = await res.json();
      const initialAnswers = data.answers.reduce<Record<string, string>>(
        (acc, a) => {
          acc[a.id] = a.userAnswer ?? "";
          return acc;
        },
        {}
      );

      setActiveExam({
        instanceId: data.instance.id,
        template,
        questions: data.questions,
        answers: data.answers,
        startedAt: data.instance.startedAt,
      });
      setAnswerText(initialAnswers);
      setStatus(`Exam started: ${template.title}`);
    } catch (err) {
      console.error(err);
      setError("Unable to start the mock exam right now.");
    } finally {
      setStartingTemplateId(null);
    }
  };

  const handleSubmitAndGrade = async () => {
    if (!activeExam) return;
    setSubmitting(true);
    setError(null);
    setStatus(null);

    const payloadAnswers = activeExam.answers.map((a) => ({
      answerId: a.id,
      userAnswer: answerText[a.id]?.trim() ?? "",
    }));

    try {
      const submitRes = await fetch("/api/v1/mock-exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: activeExam.instanceId,
          answers: payloadAnswers,
        }),
      });

      if (!submitRes.ok) {
        const body = await submitRes.json().catch(() => null);
        setError(body?.error || "Failed to submit answers.");
        return;
      }

      const gradeRes = await fetch("/api/v1/mock-exams/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: activeExam.instanceId }),
      });

      if (!gradeRes.ok) {
        const body = await gradeRes.json().catch(() => null);
        setError(body?.error || "Failed to grade exam.");
        return;
      }

      const gradeData: GradeResponse = await gradeRes.json();
      setGradeResult(gradeData);
      setStatus(
        `Scored ${gradeData.totalScore} / ${activeExam.questions.length}`
      );
    } catch (err) {
      console.error(err);
      setError("Something went wrong while submitting your answers.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalQuestions = activeExam?.questions.length ?? 0;
  const answeredCount = activeExam
    ? activeExam.answers.filter((a) => (answerText[a.id] ?? "").trim() !== "")
        .length
    : 0;

  return (
    <div className="w-[90vw] max-w-5xl mx-auto py-10">
      <Heading1 gutter="sm">Mock Exams</Heading1>
      <Paragraph variant="superMuted" className="max-w-3xl">
        Pick a mock exam template to generate a fresh set of questions. Answer
        them inline, submit, and get an instant grade.
      </Paragraph>

      <Heading2 className="mt-10 mb-4">Available templates</Heading2>
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

      {activeExam && (
        <div className="mt-12 bg-white border border-accent-200 rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <Heading2 gutter="none">{activeExam.template.title}</Heading2>
              <Paragraph variant="superMuted" gutter="none">
                {totalQuestions} questions ·{" "}
                {activeExam.template.subject?.name ?? "Mock exam"} · Started at{" "}
                {new Date(activeExam.startedAt).toLocaleTimeString()}
              </Paragraph>
            </div>
            <Paragraph variant="muted" gutter="none" className="text-sm">
              {answeredCount}/{totalQuestions} answered
            </Paragraph>
          </div>

          <div className="space-y-6">
            {activeExam.questions.map((q, idx) => {
              const answerId = answerIdByQuestionId.get(q.id);
              const value = answerId ? answerText[answerId] ?? "" : "";
              const gradeInfo = answerId
                ? gradedByAnswerId.get(answerId)
                : null;

              return (
                <div
                  key={q.id}
                  className="border border-accent-100 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-primary-600">
                      Question {idx + 1}
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {q.year ? `Year ${q.year}` : ""}
                      {q.difficulty ? ` · ${q.difficulty}` : ""}
                    </div>
                  </div>
                  <p className="text-gray-900 whitespace-pre-line">
                    {q.questionText}
                  </p>
                  {q.questionImageUrl && (
                    <Image
                      src={q.questionImageUrl}
                      alt={`Question ${idx + 1}`}
                      className="rounded-lg max-h-64 object-contain"
                    />
                  )}
                  {answerId ? (
                    <textarea
                      className="w-full border border-accent-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900"
                      placeholder="Type your answer here"
                      value={value}
                      onChange={(e) =>
                        setAnswerText((prev) => ({
                          ...prev,
                          [answerId]: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  ) : (
                    <Paragraph variant="error" gutter="none">
                      Unable to capture answer for this question.
                    </Paragraph>
                  )}

                  {gradeInfo && (
                    <div className="text-sm font-medium">
                      {gradeInfo.isCorrect ? (
                        <span className="text-green-600">Correct</span>
                      ) : (
                        <span className="text-red-600">Incorrect</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              {error && (
                <Paragraph variant="error" gutter="none">
                  {error}
                </Paragraph>
              )}
              {status && (
                <Paragraph variant="success" gutter="none">
                  {status}
                </Paragraph>
              )}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmitAndGrade}
              loading={submitting}
              disabled={submitting}
            >
              Submit & Grade
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
