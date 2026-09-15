// app/exams/ExamInstanceClient.tsx
"use client";

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
  correctAnswer?: string | null;
  markingGuide?: string | null;
  section: "OBJECTIVE" | "PART_I" | "PART_II";
  displayOrder?: number | null;
  maxScore: number;
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

interface AiMarkSuggestion {
  answerId: string;
  suggestedScore: number;
  rationale: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
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
  const [selfScores, setSelfScores] = useState<Record<string, string>>(() =>
    data.answers.reduce<Record<string, string>>((acc, answer) => {
      acc[answer.id] = answer.score == null ? "" : String(answer.score);
      return acc;
    }, {})
  );
  const [aiSuggestions, setAiSuggestions] = useState<
    Record<string, AiMarkSuggestion>
  >({});
  const [reviewedAiSuggestions, setReviewedAiSuggestions] = useState<
    Record<string, boolean>
  >({});
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
        window.location.reload();
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

  const handleSelfGrade = async () => {
    const unreviewedAiSuggestions = Object.keys(aiSuggestions).filter(
      (answerId) => !reviewedAiSuggestions[answerId]
    );
    if (unreviewedAiSuggestions.length > 0) {
      setError("Review each AI suggestion before saving your final marks.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatus(null);
    try {
      const attemptedAnswers = data.answers.filter(
        (answer) => (answers[answer.id] ?? "").trim() !== ""
      );
      const scores = attemptedAnswers.map((answer) => ({
        answerId: answer.id,
        score: Number(selfScores[answer.id]),
      }));

      const res = await fetch("/api/v1/mock-exams/self-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: data.instance.id, scores }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Failed to save your self-assessment.");
        return;
      }

      const result = (await res.json()) as {
        totalScore: number;
        totalMarks: number;
      };
      setStatus(`Scored ${result.totalScore} / ${result.totalMarks}`);
      if (data.template.subjectId) {
        const progressPercentage = Math.round(
          (result.totalScore / result.totalMarks) * 100
        );
        await fetch("/api/v1/progress/subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: data.template.subjectId,
            progressPercentage,
          }),
        }).catch((err) => console.error("Progress update failed", err));
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("Unable to save your self-assessment right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiMarking = async () => {
    setAiMarking(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/v1/mock-exams/ai-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: data.instance.id }),
      });
      const body = (await res.json().catch(() => null)) as {
        suggestions?: AiMarkSuggestion[];
        message?: string;
        error?: string;
      } | null;

      if (!res.ok || !body?.suggestions) {
        setError(
          body?.message ||
            body?.error ||
            "AI-assisted marking is unavailable. You can still mark this paper manually."
        );
        return;
      }

      const nextSuggestions = body.suggestions.reduce<
        Record<string, AiMarkSuggestion>
      >((current, suggestion) => {
        current[suggestion.answerId] = suggestion;
        return current;
      }, {});

      setAiSuggestions(nextSuggestions);
      setReviewedAiSuggestions(
        body.suggestions.reduce<Record<string, boolean>>(
          (current, suggestion) => {
            current[suggestion.answerId] = false;
            return current;
          },
          {}
        )
      );
      setSelfScores((current) => {
        const nextScores = { ...current };
        body.suggestions!.forEach((suggestion) => {
          nextScores[suggestion.answerId] = String(suggestion.suggestedScore);
        });
        return nextScores;
      });
      setStatus(
        body.message ||
          "AI suggestions are ready. Review every mark before saving."
      );
    } catch (err) {
      console.error(err);
      setError(
        "AI-assisted marking is unavailable. You can still mark this paper manually."
      );
    } finally {
      setAiMarking(false);
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
  const hasAiSuggestions = Object.keys(aiSuggestions).length > 0;
  const allAiSuggestionsReviewed =
    !hasAiSuggestions ||
    Object.keys(aiSuggestions).every(
      (answerId) => reviewedAiSuggestions[answerId]
    );

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
        </div>
      </div>

      {isWritten ? (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-gray-800">
          <p className="font-semibold text-primary-700">Paper instructions</p>
          <p className="mt-1">
            Answer all five questions in Part I, then answer exactly five of the
            eight questions in Part II. Show your working. After submission,
            use the marking guide to review your marks out of{" "}
            {data.template.totalMarks ?? 100}.
          </p>
        </div>
      ) : null}

      {isWritten && submitted && !data.instance.graded ? (
        <div className="rounded-xl border border-accent-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
          <p className="font-semibold text-gray-900">Review before saving</p>
          <p className="mt-1">
            You can mark the paper yourself or ask AI for suggestions. AI marks
            are not final: check each rationale, change any score you disagree
            with, then save the result yourself.
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
          const aiSuggestion = answerRow
            ? aiSuggestions[answerRow.id]
            : undefined;
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
                  {isWritten && value && answerRow && !data.instance.graded ? (
                    <div className="space-y-3 border-t border-accent-200 pt-3">
                      {aiSuggestion ? (
                        <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-gray-800">
                          <p className="font-semibold text-primary-700">
                            AI suggestion: {aiSuggestion.suggestedScore} /{" "}
                            {answerRow.maxScore} ·{" "}
                            {aiSuggestion.confidence.toLowerCase()} confidence
                          </p>
                          <p className="mt-1">{aiSuggestion.rationale}</p>
                          <p className="mt-1 text-gray-600">
                            Check this against the marking guide and edit the
                            mark below if needed.
                          </p>
                          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-primary-200 bg-white px-3 py-2 font-medium text-gray-800">
                            <input
                              type="checkbox"
                              className="h-5 w-5 shrink-0 rounded border-accent-300 text-primary-600 focus:ring-primary-400"
                              checked={Boolean(
                                reviewedAiSuggestions[answerRow.id]
                              )}
                              onChange={(event) =>
                                setReviewedAiSuggestions((current) => ({
                                  ...current,
                                  [answerRow.id]: event.target.checked,
                                }))
                              }
                            />
                            I checked this suggestion against the marking guide
                          </label>
                        </div>
                      ) : null}
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        Your final mark
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={answerRow.maxScore}
                          step={1}
                          className="w-20 rounded-lg border border-accent-300 bg-white px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
                          value={selfScores[answerRow.id] ?? ""}
                          onChange={(event) =>
                            setSelfScores((current) => ({
                              ...current,
                              [answerRow.id]: event.target.value,
                            }))
                          }
                          aria-label={`Final mark for question ${sectionQuestionNumber} out of ${answerRow.maxScore}`}
                        />
                        <span className="font-normal text-gray-600">
                          / {answerRow.maxScore}
                        </span>
                      </label>
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

              {gradeInfo &&
                (isWritten ? gradeInfo.score !== null : gradeInfo.isCorrect !== null) && (
                <div className="text-sm font-medium">
                  {isWritten && answerRow ? (
                    <span className="text-primary-700">
                      Awarded {gradeInfo.score} / {answerRow.maxScore}
                    </span>
                  ) : gradeInfo.isCorrect ? (
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
            {data.instance.graded
              ? `Final score: ${data.instance.totalScore ?? 0} / ${data.template.totalMarks ?? totalQuestions}`
              : submitted
                ? "Submitted · review every mark before saving"
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
              {isWritten ? "Submit for self-marking" : "Submit & Grade"}
            </Button>
          ) : isWritten && !data.instance.graded ? (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={handleAiMarking}
                loading={aiMarking}
                disabled={aiMarking || submitting}
                className="w-full sm:w-auto"
              >
                Suggest marks with AI
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSelfGrade}
                loading={submitting}
                disabled={
                  submitting || aiMarking || !allAiSuggestionsReviewed
                }
                className="w-full sm:w-auto"
              >
                Save final marks
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
