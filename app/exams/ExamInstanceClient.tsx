// app/exams/ExamInstanceClient.tsx
"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import LowDataImage from "@/components/LowDataImage";
import LocalDateTime from "@/components/LocalDateTime";
import { formatLocalTime } from "@/lib/date-format";
import MarkingReviewPanel, {
  type LearnerMarkingReview,
} from "./MarkingReviewPanel";

interface TemplateMeta {
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

interface McqChoice {
  letter: string;
  text: string;
}

interface MockExamQuestion {
  id: string;
  questionText: string;
  questionImageUrl?: string | null;
  year?: number | null;
  questionNumber?: string | null;
  difficulty?: number | null;
  choices?: McqChoice[];
}

interface MockExamAnswerRow {
  id: string;
  pastQuestionId: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  aiExplanation?: string | null;
  correctAnswer?: string | null;
  markingGuide?: string | null;
  section: "OBJECTIVE" | "PART_I" | "PART_II";
  displayOrder?: number | null;
  maxScore: number;
  markingReview: LearnerMarkingReview | null;
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
    aiExplanation?: string | null;
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
  const [aiMarking, setAiMarking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [lowDataModeEnabled, setLowDataModeEnabled] = useState(false);
  const [submitted, setSubmitted] = useState(
    Boolean(data.instance.submittedAt || data.instance.graded)
  );
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestAnswersRef = useRef<Record<string, string>>(answers);
  const savingRef = useRef(false);
  const submittedRef = useRef(submitted);
  const isWritten = data.template.format === "WRITTEN";
  const isGraded = data.instance.graded || gradeResult?.graded === true;

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

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setSettingsLoaded(false);
      try {
        const res = await fetch("/api/v1/settings", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          settings?: { lowDataModeEnabled?: boolean };
        } | null;

        if (!active) return;
        setLowDataModeEnabled(Boolean(data?.settings?.lowDataModeEnabled));
      } catch {
        if (active) setLowDataModeEnabled(false);
      } finally {
        if (active) setSettingsLoaded(true);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

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

  const requestAiMarking = useCallback(async () => {
    setAiMarking(true);
    setError(null);
    setStatus("Study Buddy AI is marking your written paper...");

    try {
      const res = await fetch("/api/v1/mock-exams/ai-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: data.instance.id }),
      });
      const body = (await res.json().catch(() => null)) as
        | (GradeResponse & {
            totalMarks?: number;
            message?: string;
            error?: string;
          })
        | null;

      if (res.status === 409) {
        window.location.reload();
        return true;
      }

      if (!res.ok || !body?.graded) {
        setStatus(null);
        setError(
          body?.message ||
            body?.error ||
            "AI marking is unavailable. Try again or contact Study Buddy."
        );
        return false;
      }

      setGradeResult(body);
      setSubmitted(true);
      setStatus(
        body.message ||
          `Study Buddy AI marked this paper ${body.totalScore} / ${body.totalMarks ?? data.template.totalMarks ?? 100}.`
      );

      if (data.template.subjectId) {
        const totalMarks =
          body.totalMarks ?? data.template.totalMarks ?? data.questions.length;
        const progressPercentage = Math.max(
          0,
          Math.min(100, Math.round((body.totalScore / totalMarks) * 100))
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

      return true;
    } catch (err) {
      console.error(err);
      setStatus(null);
      setError("AI marking is unavailable. Try again or contact Study Buddy.");
      return false;
    } finally {
      setAiMarking(false);
    }
  }, [
    data.instance.id,
    data.questions.length,
    data.template.subjectId,
    data.template.totalMarks,
  ]);

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

      if (isWritten) {
        if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
        setSubmitted(true);
        await requestAiMarking();
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
              (gradeData.totalScore /
                (data.template.totalMarks ?? data.questions.length)) *
                100
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
  const shouldDeferQuestionImages =
    !settingsLoaded || lowDataModeEnabled;
  const answeredCount = data.answers.filter(
    (a) => (answers[a.id] ?? "").trim() !== ""
  ).length;
  const optionalAnsweredCount = data.answers.filter(
    (answer) =>
      answer.section === "PART_II" &&
      (answers[answer.id] ?? "").trim() !== ""
  ).length;

  const answerByQuestionId = useMemo(
    () =>
      new Map(
        data.answers.map((answer) => [answer.pastQuestionId, answer] as const)
      ),
    [data.answers]
  );

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

  const markingGuideByQuestionId = useMemo(() => {
    const map = new Map<string, string | null>();
    data.answers.forEach((answer) =>
      map.set(answer.pastQuestionId, answer.markingGuide ?? null)
    );
    return map;
  }, [data.answers]);

  const aiExplanationByAnswerId = useMemo(() => {
    const map = new Map<string, string | null>();
    if (gradeResult?.answers) {
      gradeResult.answers.forEach((answer) =>
        map.set(answer.id, answer.aiExplanation ?? null)
      );
    } else {
      data.answers.forEach((answer) =>
        map.set(answer.id, answer.aiExplanation ?? null)
      );
    }
    return map;
  }, [data.answers, gradeResult]);

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
            {isWritten ? "questions provided" : "questions"}
            {data.template.durationMinutes
              ? ` · ${data.template.durationMinutes} minutes`
              : ""}{" "}
            · Started{" "}
            <LocalDateTime value={data.instance.startedAt} />
          </Paragraph>
        </div>
        <div className="text-sm text-gray-700">
          {isWritten
            ? `${answeredCount}/${data.template.requiredQuestionCount ?? 10} answered · Part II ${optionalAnsweredCount}/5`
            : `${answeredCount}/${totalQuestions} answered`}
          {isWritten && isGraded ? (
            <Link
              href="/marking-reviews"
              className="mt-2 block min-h-11 py-2 font-semibold text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            >
              View marking reviews
            </Link>
          ) : null}
        </div>
      </div>

      {isWritten ? (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-gray-800">
          <p className="font-semibold text-primary-700">Paper instructions</p>
          <p className="mt-1">
            Answer all five questions in Part I, then answer exactly five of the
            eight questions in Part II. Show your working. After submission,
            Study Buddy AI will mark each attempted answer against the marking
            guide and award a total out of {data.template.totalMarks ?? 100}.
          </p>
        </div>
      ) : null}

      {isWritten && submitted && !isGraded ? (
        <div className="rounded-xl border border-accent-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
          <p className="font-semibold text-gray-900">
            {aiMarking ? "Marking your paper" : "Marking is not complete"}
          </p>
          <p className="mt-1">
            {aiMarking
              ? "Study Buddy AI is checking each response against its marking guide."
              : "Try AI marking again below. If the problem continues, contact Study Buddy support."}
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {data.questions.map((q, idx) => {
          const answerId = answerIdByQuestionId.get(q.id);
          const answerRow = answerByQuestionId.get(q.id);
          const gradeInfo = answerId ? gradedByAnswerId.get(answerId) : null;
          const value = answerId ? answers[answerId] ?? "" : "";
          const correctAnswer = correctAnswerByQuestionId.get(q.id);
          const markingGuide = markingGuideByQuestionId.get(q.id);
          const aiExplanation = answerRow
            ? aiExplanationByAnswerId.get(answerRow.id)
            : null;
          const userLetter = value ? letterForSelection(q, value) : null;
          const correctLetter =
            correctAnswer && letterForSelection(q, correctAnswer);
          const sectionStart =
            isWritten &&
            (idx === 0 ||
              data.answers[idx - 1]?.section !== answerRow?.section);
          const sectionQuestionNumber =
            answerRow?.section === "PART_II" ? idx - 4 : idx + 1;
          return (
            <Fragment key={q.id}>
              {sectionStart ? (
                <div className="pt-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {answerRow?.section === "PART_I" ? "Part I" : "Part II"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {answerRow?.section === "PART_I"
                      ? "Compulsory — answer all five questions."
                      : "Choose and answer exactly five of the eight questions."}
                  </p>
                </div>
              ) : null}
              <div className="border border-accent-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-primary-600">
                  Question {sectionQuestionNumber}
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {isWritten && answerRow
                    ? `${answerRow.maxScore} marks`
                    : null}
                  {q.year ? `Year ${q.year}` : ""}
                  {q.difficulty ? ` · ${q.difficulty}` : ""}
                </div>
              </div>
              <p className="text-gray-900 whitespace-pre-line">
                {q.questionText}
              </p>
              {q.questionImageUrl && (
                <LowDataImage
                  src={q.questionImageUrl}
                  alt={`Question ${idx + 1}`}
                  className="rounded-lg max-h-64 object-contain"
                  lowDataModeEnabled={shouldDeferQuestionImages}
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
                  <p className="text-sm text-gray-800 whitespace-pre-line">
                    <span className="font-semibold">
                      {isWritten ? "Model answer:" : "Correct answer:"}
                    </span>{" "}
                    {correctAnswer ?? "Not available"}
                    {correctLetter ? (
                      <span className="tabular-nums font-medium text-primary-700">
                        {" "}
                        ({correctLetter})
                      </span>
                    ) : null}
                  </p>
                  {isWritten && markingGuide ? (
                    <p className="border-t border-accent-200 pt-2 text-sm text-gray-800 whitespace-pre-line">
                      <span className="font-semibold">{markingGuide}</span>
                    </p>
                  ) : null}
                  {isWritten &&
                  value &&
                  answerRow &&
                  isGraded &&
                  gradeInfo?.score != null ? (
                    <div className="space-y-2 border-t border-accent-200 pt-3 text-sm text-gray-800">
                      <p className="font-semibold text-primary-700">
                        Awarded {gradeInfo.score} / {answerRow.maxScore}
                      </p>
                      {aiExplanation ? (
                        <p>
                          <span className="font-semibold">
                            AI marking rationale:
                          </span>{" "}
                          {aiExplanation}
                        </p>
                      ) : null}
                      <MarkingReviewPanel
                        answerId={answerRow.id}
                        existingReview={answerRow.markingReview}
                      />
                    </div>
                  ) : null}
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
                    placeholder={
                      isWritten
                        ? "Show each step of your working and state your final answer"
                        : "Type your answer here"
                    }
                    value={value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [answerId]: e.target.value,
                      }))
                    }
                    rows={isWritten ? 7 : 3}
                  />
                )
              ) : (
                <Paragraph variant="error" gutter="none">
                  Unable to capture answer for this question.
                </Paragraph>
              )}

              {!isWritten && gradeInfo?.isCorrect !== null &&
                gradeInfo?.isCorrect !== undefined && (
                <div className="text-sm font-medium">
                  {gradeInfo.isCorrect ? (
                    <span className="text-green-600">Correct</span>
                  ) : (
                    <span className="text-red-600">Incorrect</span>
                  )}
                </div>
              )}
              </div>
            </Fragment>
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
            {isGraded
              ? `Final score: ${gradeResult?.totalScore ?? data.instance.totalScore ?? 0} / ${data.template.totalMarks ?? totalQuestions}`
              : submitted
                ? aiMarking
                  ? "Submitted · AI marking in progress"
                  : "Submitted · AI marking incomplete"
                : saving
                  ? "Saving..."
                  : lastSaved
                    ? `Saved at ${lastSaved}`
                    : "Autosave every 15s"}
          </Paragraph>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!submitted ? (
            <Button
              variant="outline"
              onClick={saveProgress}
              loading={saving}
              disabled={saving}
            >
              Save now
            </Button>
          ) : null}
          {!submitted ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmitAndGrade}
              loading={submitting}
              disabled={submitting}
            >
              {isWritten ? "Submit for AI marking" : "Submit & Grade"}
            </Button>
          ) : isWritten && !isGraded ? (
            <Button
              variant="primary"
              size="lg"
              onClick={requestAiMarking}
              loading={aiMarking}
              disabled={aiMarking || submitting}
              className="w-full sm:w-auto"
            >
              Retry AI marking
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
