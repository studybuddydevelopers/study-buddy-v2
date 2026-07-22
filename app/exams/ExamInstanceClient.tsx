// app/exams/ExamInstanceClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Image from "@/components/Image";
import LocalDateTime from "@/components/LocalDateTime";
import { formatLocalTime } from "@/lib/date-format";

interface TemplateMeta {
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

interface McqChoice {
  letter: string;
  text: string;
}

interface MockExamQuestion {
  id: string;
  questionText: string;
  questionImageUrl?: string | null;
  year?: number | null;
  questionNumber?: number | null;
  difficulty?: string | null;
  choices?: McqChoice[];
}

interface MockExamAnswerRow {
  id: string;
  pastQuestionId: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  correctAnswer?: string | null;
}

interface ExamInstanceData {
  instance: {
    id: string;
    startedAt: string;
    submittedAt: string | null;
    graded: boolean;
    totalScore: number | null;
  };
  template: TemplateMeta;
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

export default function ExamInstanceClient({
  data,
}: {
  data: ExamInstanceData;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    data.answers.reduce<Record<string, string>>((acc, a) => {
      acc[a.id] = a.userAnswer ?? "";
      return acc;
    }, {})
  );
  const [gradeResult, setGradeResult] = useState<GradeResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(
    Boolean(data.instance.submittedAt || data.instance.graded)
  );
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestAnswersRef = useRef<Record<string, string>>(answers);
  const savingRef = useRef(false);
  const submittedRef = useRef(submitted);

  const answerIdByQuestionId = useMemo(() => {
    const map = new Map<string, string>();
    data.answers.forEach((a) => map.set(a.pastQuestionId, a.id));
    return map;
  }, [data.answers]);

  useEffect(() => {
    latestAnswersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  const saveProgress = useCallback(
    async (snapshot: Record<string, string> = latestAnswersRef.current) => {
      if (savingRef.current || submittedRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setError(null);
      try {
        const payloadAnswers = data.answers.map((a) => ({
          answerId: a.id,
          userAnswer: snapshot[a.id]?.trim() ?? "",
        }));

        const res = await fetch("/api/v1/mock-exams/save-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceId: data.instance.id,
            answers: payloadAnswers,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error || "Failed to save progress.");
          return;
        }

        setLastSaved(formatLocalTime(new Date()));
      } catch (err) {
        console.error(err);
        setError("Unable to save progress right now.");
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [data.answers, data.instance.id]
  );

  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      void saveProgress(latestAnswersRef.current);
    }, 15000);
    saveIntervalRef.current = interval;
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [saveProgress, submitted]);

  const handleSubmitAndGrade = async () => {
    setSubmitting(true);
    setError(null);
    setStatus(null);
    try {
      const payloadAnswers = data.answers.map((a) => ({
        answerId: a.id,
        userAnswer: answers[a.id]?.trim() ?? "",
      }));

      const submitRes = await fetch("/api/v1/mock-exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: data.instance.id,
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
        body: JSON.stringify({ instanceId: data.instance.id }),
      });

      if (!gradeRes.ok) {
        const body = await gradeRes.json().catch(() => null);
        setError(body?.error || "Failed to grade exam.");
        return;
      }

      const gradeData: GradeResponse = await gradeRes.json();
      setGradeResult(gradeData);
      setStatus(
        `Scored ${gradeData.totalScore} / ${data.questions.length}`
      );

      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      setSubmitted(true);

      if (data.template.subjectId) {
        const progressPercentage = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (gradeData.totalScore / data.questions.length) * 100
            )
          )
        );
        void fetch("/api/v1/progress/subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: data.template.subjectId,
            progressPercentage,
          }),
        }).catch((err) => console.error("Progress update failed", err));
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while submitting your answers.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalQuestions = data.questions.length;
  const answeredCount = data.answers.filter(
    (a) => (answers[a.id] ?? "").trim() !== ""
  ).length;

  const gradedByAnswerId = useMemo(() => {
    const map = new Map<string, { isCorrect: boolean | null; score: number | null }>();
    if (gradeResult?.answers) {
      gradeResult.answers.forEach((a) =>
        map.set(a.id, { isCorrect: a.isCorrect, score: a.score })
      );
    } else {
      data.answers.forEach((a) =>
        map.set(a.id, { isCorrect: a.isCorrect, score: a.score })
      );
    }
    return map;
  }, [gradeResult, data.answers]);

  const correctAnswerByQuestionId = useMemo(() => {
    const map = new Map<string, string | null>();
    data.answers.forEach((a) =>
      map.set(a.pastQuestionId, a.correctAnswer ?? null)
    );
    return map;
  }, [data.answers]);

  const letterForSelection = (q: MockExamQuestion, selectedText: string) => {
    const choice = q.choices?.find((c) => c.text === selectedText);
    return choice?.letter ?? null;
  };

  return (
    <div className="w-[90vw] max-w-5xl mx-auto py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Heading1 gutter="sm">{data.template.title}</Heading1>
          <Paragraph variant="superMuted" gutter="none">
            {data.template.subject?.name ?? "Mock exam"} · {totalQuestions}{" "}
            questions · Started{" "}
            <LocalDateTime value={data.instance.startedAt} />
          </Paragraph>
        </div>
        <div className="text-sm text-gray-700">
          {answeredCount}/{totalQuestions} answered
        </div>
      </div>

      <div className="space-y-4">
        {data.questions.map((q, idx) => {
          const answerId = answerIdByQuestionId.get(q.id);
          const gradeInfo = answerId ? gradedByAnswerId.get(answerId) : null;
          const value = answerId ? answers[answerId] ?? "" : "";
          const correctAnswer = correctAnswerByQuestionId.get(q.id);
          const userLetter = value ? letterForSelection(q, value) : null;
          const correctLetter =
            correctAnswer && letterForSelection(q, correctAnswer);

          return (
            <div
              key={q.id}
              className="border border-accent-200 rounded-xl p-4 space-y-3 bg-white shadow-sm"
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

              {submitted ? (
                <div className="border border-accent-200 rounded-lg p-3 bg-accent-50 space-y-2">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">Your answer:</span>{" "}
                    {value ? (
                      <>
                        {userLetter ? (
                          <span className="tabular-nums font-medium text-primary-700">
                            ({userLetter}){" "}
                          </span>
                        ) : null}
                        {value}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">Correct answer:</span>{" "}
                    {correctAnswer ?? "Not available"}
                    {correctLetter ? (
                      <span className="tabular-nums font-medium text-primary-700">
                        {" "}
                        ({correctLetter})
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : answerId ? (
                q.choices && q.choices.length === 4 ? (
                  <div
                    className="space-y-2"
                    role="radiogroup"
                    aria-label={`Question ${idx + 1}`}
                  >
                    {q.choices.map((c) => {
                      const inputId = `q-${answerId}-${c.letter}`;
                      return (
                        <label
                          key={c.letter}
                          htmlFor={inputId}
                          className={`flex gap-3 items-start cursor-pointer rounded-lg border p-3 transition-colors ${
                            value === c.text
                              ? "border-primary-400 bg-primary-50"
                              : "border-accent-200 bg-white hover:border-primary-200"
                          }`}
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name={`question-${answerId}`}
                            className="mt-1 h-4 w-4 text-primary-600 border-accent-300 focus:ring-primary-400"
                            checked={value === c.text}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [answerId]: c.text,
                              }))
                            }
                          />
                          <span className="font-semibold text-primary-600 tabular-nums w-6 shrink-0">
                            {c.letter}.
                          </span>
                          <span className="text-gray-900 whitespace-pre-line flex-1">
                            {c.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    className="w-full border border-accent-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900"
                    placeholder="Type your answer here"
                    value={value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [answerId]: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                )
              ) : (
                <Paragraph variant="error" gutter="none">
                  Unable to capture answer for this question.
                </Paragraph>
              )}

              {gradeInfo && gradeInfo.isCorrect !== null && (
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
          <Paragraph variant="muted" gutter="none" className="text-sm">
            {saving ? "Saving..." : lastSaved ? `Saved at ${lastSaved}` : "Autosave every 15s"}
          </Paragraph>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={saveProgress}
            loading={saving}
            disabled={saving || submitted}
          >
            Save now
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmitAndGrade}
            loading={submitting}
            disabled={submitting || submitted}
          >
            Submit & Grade
          </Button>
        </div>
      </div>
    </div>
  );
}
