"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Image from "@/components/Image";

interface QuestionStub {
  id: string;
  questionText: string;
  questionImageUrl: string | null;
  year: number | null;
  difficulty: number | null;
}

export default function TopicPracticeClient({
  topicId,
  topicTitle,
  subjectDisplayName,
}: {
  topicId: string;
  topicTitle: string;
  subjectDisplayName: string;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionStub[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
  } | null>(null);
  const [reveal, setReveal] = useState<{
    answerText: string;
    explanation: string | null;
  } | null>(null);
  const [session, setSession] = useState({ correct: 0, attempted: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/v1/past-questions/by-topic?topicId=${encodeURIComponent(topicId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setLoadError(body?.error || "Could not load questions.");
        setQuestions([]);
        return;
      }
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch {
      setLoadError("Could not load questions.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = questions[index];
  const n = questions.length;

  const resetQuestionState = () => {
    setAnswer("");
    setLastResult(null);
    setReveal(null);
  };

  const goNext = () => {
    if (index < n - 1) {
      setIndex((i) => i + 1);
      resetQuestionState();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      resetQuestionState();
    }
  };

  const handleSubmit = async () => {
    if (!q || submitting) return;
    setLoadError(null);
    setSubmitting(true);
    setReveal(null);
    try {
      const res = await fetch("/api/v1/past-questions/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          userAnswer: answer.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLastResult(null);
        setLoadError(data?.error || "Submit failed.");
        return;
      }
      setLastResult({ isCorrect: Boolean(data.isCorrect) });
      setSession((s) => ({
        attempted: s.attempted + 1,
        correct: s.correct + (data.isCorrect ? 1 : 0),
      }));
    } catch {
      setLoadError("Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReveal = async () => {
    if (!q) return;
    try {
      const res = await fetch("/api/v1/past-questions/explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      setReveal({
        answerText: data.answerText ?? "",
        explanation: data.explanation ?? null,
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-[90vw] max-w-3xl mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => router.push("/materials")}>
          ← Study materials
        </Button>
        <p className="text-sm text-gray-600 tabular-nums">
          This session: {session.correct}/{session.attempted} correct
        </p>
      </div>

      <div>
        <Paragraph variant="superMuted" gutter="sm">
          {subjectDisplayName}
        </Paragraph>
        <Heading1 gutter="sm">{topicTitle}</Heading1>
        <Paragraph variant="muted" gutter="none" className="text-sm">
          Answer in your own words; grading uses the same text check as short
          answers in the question bank. After you submit, use{" "}
          <strong>Show answer &amp; explanation</strong> to compare.
        </Paragraph>
      </div>

      {loading && (
        <Paragraph variant="muted">Loading practice questions…</Paragraph>
      )}

      {loadError && (
        <Paragraph variant="error" gutter="none">
          {loadError}
        </Paragraph>
      )}

      {!loading && !loadError && n === 0 && (
        <Paragraph variant="muted">
          There are no questions for this topic in the bank yet. Try another
          topic or ask your instructor to add items.
        </Paragraph>
      )}

      {!loading && q && (
        <>
          <div className="text-sm font-medium text-primary-600">
            Question {index + 1} of {n}
          </div>

          <div className="border border-accent-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
            <p className="text-gray-900 whitespace-pre-line">{q.questionText}</p>
            {q.questionImageUrl && (
              <Image
                src={q.questionImageUrl}
                alt=""
                className="max-h-64 object-contain"
              />
            )}
            {(q.year != null || q.difficulty != null) && (
              <p className="text-xs text-gray-500">
                {q.year != null ? `Year ${q.year}` : ""}
                {q.year != null && q.difficulty != null ? " · " : ""}
                {q.difficulty != null ? `Difficulty ${q.difficulty}` : ""}
              </p>
            )}
          </div>

          <textarea
            className="w-full border border-accent-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900 min-h-[100px]"
            placeholder="Type your answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={Boolean(lastResult)}
          />

          <div className="flex flex-wrap gap-3 items-center">
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={submitting || Boolean(lastResult) || !answer.trim()}
            >
              Submit answer
            </Button>
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={index === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={goNext}
              disabled={index >= n - 1}
            >
              Next
            </Button>
          </div>

          {lastResult && (
            <div className="space-y-3">
              <Paragraph
                variant={lastResult.isCorrect ? "success" : "error"}
                gutter="none"
              >
                {lastResult.isCorrect ? "Correct." : "Not quite—compare below or try again."}
              </Paragraph>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleReveal}>
                  Show answer &amp; explanation
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLastResult(null);
                    setReveal(null);
                  }}
                >
                  Edit answer and submit again
                </Button>
              </div>
              {reveal && (
                <div className="border border-accent-200 rounded-lg p-3 bg-accent-50 text-sm space-y-2">
                  <p>
                    <span className="font-semibold">Expected answer:</span>{" "}
                    {reveal.answerText}
                  </p>
                  {reveal.explanation ? (
                    <p>
                      <span className="font-semibold">Explanation:</span>{" "}
                      {reveal.explanation}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
