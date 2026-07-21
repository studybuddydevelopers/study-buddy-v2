"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
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

interface UserSettings {
  cloudPracticeDraftsEnabled: boolean;
  lowDataModeEnabled: boolean;
}

interface CloudDraft {
  questionId: string;
  answerText: string;
  updatedAt?: string;
}

type AnswersByQuestionId = Record<string, string>;
type DraftSyncStatus = "idle" | "local" | "cloud" | "disabled" | "paused" | "error";
type ConfettiStyle = CSSProperties & {
  "--confetti-drift": string;
  "--confetti-start-rotation": string;
  "--confetti-end-rotation": string;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
    downlink?: number;
  };
};

const CONFETTI_COLORS = [
  "#6C3483",
  "#2E86AB",
  "#F4D35E",
  "#EE964B",
  "#4CAF50",
  "#E84855",
];

const CONFETTI_PIECES = Array.from({ length: 34 }, (_, index) => index);

function getDraftStorageKey(topicId: string) {
  return `study-buddy:practice-drafts:${topicId}`;
}

function readLocalDrafts(topicId: string): AnswersByQuestionId {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(topicId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as { answers?: unknown } | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const answers = parsed.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return {};
    }

    return Object.entries(answers as Record<string, unknown>).reduce<AnswersByQuestionId>(
      (drafts, [questionId, answerText]) => {
        if (typeof answerText === "string" && answerText.length > 0) {
          drafts[questionId] = answerText;
        }
        return drafts;
      },
      {}
    );
  } catch {
    return {};
  }
}

function writeLocalDrafts(topicId: string, drafts: AnswersByQuestionId) {
  if (typeof window === "undefined") return;

  const answers = Object.entries(drafts).reduce<AnswersByQuestionId>(
    (cleaned, [questionId, answerText]) => {
      if (questionId.length > 0 && answerText.length > 0) {
        cleaned[questionId] = answerText;
      }
      return cleaned;
    },
    {}
  );

  if (Object.keys(answers).length === 0) {
    window.localStorage.removeItem(getDraftStorageKey(topicId));
    return;
  }

  window.localStorage.setItem(
    getDraftStorageKey(topicId),
    JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      answers,
    })
  );
}

function hasEnoughBandwidth(settings: UserSettings) {
  if (!settings.cloudPracticeDraftsEnabled || settings.lowDataModeEnabled) {
    return false;
  }

  if (typeof navigator === "undefined") return false;

  const connection = (navigator as NavigatorWithConnection).connection;
  if (!connection) return true;
  if (connection.saveData) return false;

  const effectiveType = connection.effectiveType?.toLowerCase();
  if (effectiveType === "slow-2g" || effectiveType === "2g") return false;
  if (
    typeof connection.downlink === "number" &&
    connection.downlink > 0 &&
    connection.downlink < 0.5
  ) {
    return false;
  }

  return true;
}

function getDraftStatusText(
  answer: string,
  settings: UserSettings | null,
  status: DraftSyncStatus
) {
  if (!answer) return null;
  if (!settings?.cloudPracticeDraftsEnabled) {
    return "Draft saved locally. Cloud draft sync is off in Settings.";
  }
  if (!hasEnoughBandwidth(settings)) {
    return "Draft saved locally. Cloud sync is paused for low-data mode or a constrained connection.";
  }
  if (status === "cloud") return "Draft saved locally and to cloud.";
  if (status === "error") {
    return "Draft saved locally. Cloud sync will retry on the next edit.";
  }
  return "Draft saved locally.";
}

function EndQuizScreen({
  questionCount,
  answeredCount,
  correctCount,
  submittedCount,
  onReview,
  onBackToMaterials,
}: {
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  submittedCount: number;
  onReview: () => void;
  onBackToMaterials: () => void;
}) {
  const accuracy =
    submittedCount > 0 ? Math.round((correctCount / submittedCount) * 100) : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-accent-200 bg-white p-6 shadow-sm">
      <ConfettiBurst />
      <div className="relative z-10 space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase text-primary-600">
            Quiz complete
          </p>
          <Heading1 gutter="sm">Congratulations!</Heading1>
          <Paragraph variant="muted" gutter="none" className="text-sm">
            You finished this practice quiz. Your answers are still saved, so
            you can review them or keep studying another topic.
          </Paragraph>
        </div>

        <div className="grid grid-cols-2 gap-y-3 border-y border-accent-200 py-4 sm:grid-cols-4 sm:divide-x sm:divide-accent-200">
          <QuizStat label="Questions" value={questionCount} />
          <QuizStat label="Answered" value={answeredCount} />
          <QuizStat label="Submitted" value={submittedCount} />
          <QuizStat label="Accuracy" value={accuracy == null ? "--" : `${accuracy}%`} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={onReview}>
            Review answers
          </Button>
          <Button variant="outline" onClick={onBackToMaterials}>
            Study materials
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuizStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="px-2 sm:px-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
    </div>
  );
}

function ConfettiBurst() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <style>{`
        @keyframes practice-confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -32px, 0) rotate(var(--confetti-start-rotation));
          }
          12% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--confetti-drift), 300px, 0) rotate(var(--confetti-end-rotation));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .practice-confetti-piece {
            animation: none !important;
            opacity: 0.35;
          }
        }
      `}</style>
      {CONFETTI_PIECES.map((piece) => {
        const drift = ((piece % 7) - 3) * 18;
        const style: ConfettiStyle = {
          left: `${6 + ((piece * 11) % 88)}%`,
          backgroundColor: CONFETTI_COLORS[piece % CONFETTI_COLORS.length],
          animationDelay: `${(piece % 9) * 80}ms`,
          animationDuration: `${1400 + (piece % 6) * 140}ms`,
          "--confetti-drift": `${drift}px`,
          "--confetti-start-rotation": `${piece * 19}deg`,
          "--confetti-end-rotation": `${piece * 47 + 180}deg`,
        };

        return (
          <span
            key={piece}
            className="practice-confetti-piece absolute top-0 h-3 w-2 rounded-sm"
            style={style}
          />
        );
      })}
    </div>
  );
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
  const [answersByQuestionId, setAnswersByQuestionId] =
    useState<AnswersByQuestionId>(() => readLocalDrafts(topicId));
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftSyncStatus>("idle");
  const [quizFinished, setQuizFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
  } | null>(null);
  const [reveal, setReveal] = useState<{
    answerText: string;
    explanation: string | null;
  } | null>(null);
  const [session, setSession] = useState({ correct: 0, attempted: 0 });

  const latestAnswersRef = useRef<AnswersByQuestionId>({});
  const pendingCloudDraftsRef = useRef<Map<string, string>>(new Map());
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSaveInFlightRef = useRef(false);
  const queuedInitialCloudDraftsRef = useRef(false);
  const flushCloudDraftsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    latestAnswersRef.current = answersByQuestionId;
  }, [answersByQuestionId]);

  useEffect(() => {
    let active = true;

    async function loadQuestions() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/v1/past-questions/by-topic?topicId=${encodeURIComponent(topicId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (!active) return;
          setLoadError(body?.error || "Could not load questions.");
          setQuestions([]);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setQuestions(data.questions ?? []);
      } catch {
        if (!active) return;
        setLoadError("Could not load questions.");
        setQuestions([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadQuestions();
    return () => {
      active = false;
    };
  }, [topicId]);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const res = await fetch("/api/v1/settings", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          settings?: UserSettings;
        } | null;

        if (!active || !res.ok || !data?.settings) return;
        setSettings({
          cloudPracticeDraftsEnabled: Boolean(
            data.settings.cloudPracticeDraftsEnabled
          ),
          lowDataModeEnabled: Boolean(data.settings.lowDataModeEnabled),
        });
      } catch {
        if (active) setSettings(null);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  async function flushCloudDrafts() {
    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }

    if (!settings) return;

    if (!hasEnoughBandwidth(settings)) {
      pendingCloudDraftsRef.current.clear();
      setDraftStatus(
        settings.cloudPracticeDraftsEnabled ? "paused" : "disabled"
      );
      return;
    }

    if (
      cloudSaveInFlightRef.current ||
      pendingCloudDraftsRef.current.size === 0
    ) {
      return;
    }

    const batch = Array.from(pendingCloudDraftsRef.current.entries())
      .slice(0, 25)
      .map(([questionId, answerText]) => ({ questionId, answerText }));

    for (const draft of batch) {
      pendingCloudDraftsRef.current.delete(draft.questionId);
    }

    cloudSaveInFlightRef.current = true;

    try {
      const res = await fetch("/api/v1/past-questions/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: batch }),
      });
      const data = (await res.json().catch(() => null)) as {
        saved?: boolean;
        reason?: string;
      } | null;

      if (res.ok && data?.saved) {
        setDraftStatus("cloud");
      } else if (res.ok && data?.reason === "cloud_sync_disabled") {
        setDraftStatus("disabled");
      } else {
        for (const draft of batch) {
          if (!pendingCloudDraftsRef.current.has(draft.questionId)) {
            pendingCloudDraftsRef.current.set(draft.questionId, draft.answerText);
          }
        }
        setDraftStatus("error");
      }
    } catch {
      for (const draft of batch) {
        if (!pendingCloudDraftsRef.current.has(draft.questionId)) {
          pendingCloudDraftsRef.current.set(draft.questionId, draft.answerText);
        }
      }
      setDraftStatus("error");
    } finally {
      cloudSaveInFlightRef.current = false;

      if (pendingCloudDraftsRef.current.size > 0) {
        cloudSaveTimerRef.current = setTimeout(() => {
          cloudSaveTimerRef.current = null;
          void flushCloudDraftsRef.current?.();
        }, 500);
      }
    }
  }

  useEffect(() => {
    flushCloudDraftsRef.current = flushCloudDrafts;
  });

  function queueCloudDraft(
    questionId: string,
    answerText: string,
    delayMs = 900
  ) {
    pendingCloudDraftsRef.current.set(questionId, answerText);

    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
    }

    cloudSaveTimerRef.current = setTimeout(() => {
      cloudSaveTimerRef.current = null;
      void flushCloudDraftsRef.current?.();
    }, delayMs);
  }

  function updateLocalDraft(questionId: string, nextAnswer: string) {
    setAnswersByQuestionId((current) => {
      const next = { ...current };

      if (nextAnswer.length > 0) {
        next[questionId] = nextAnswer;
      } else {
        delete next[questionId];
      }

      latestAnswersRef.current = next;
      writeLocalDrafts(topicId, next);
      return next;
    });
    setDraftStatus("local");
  }

  useEffect(() => {
    if (!settings || pendingCloudDraftsRef.current.size === 0) return;

    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
    }

    cloudSaveTimerRef.current = setTimeout(() => {
      cloudSaveTimerRef.current = null;
      void flushCloudDraftsRef.current?.();
    }, 250);
  }, [settings]);

  useEffect(() => {
    if (
      queuedInitialCloudDraftsRef.current ||
      !settings ||
      !hasEnoughBandwidth(settings)
    ) {
      return;
    }

    const entries = Object.entries(latestAnswersRef.current);
    if (entries.length === 0) return;

    queuedInitialCloudDraftsRef.current = true;
    for (const [questionId, answerText] of entries) {
      pendingCloudDraftsRef.current.set(questionId, answerText);
    }

    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
    }

    cloudSaveTimerRef.current = setTimeout(() => {
      cloudSaveTimerRef.current = null;
      void flushCloudDraftsRef.current?.();
    }, 1200);
  }, [answersByQuestionId, settings]);

  useEffect(() => {
    if (
      questions.length === 0 ||
      !settings ||
      !hasEnoughBandwidth(settings)
    ) {
      return;
    }

    let active = true;

    async function loadCloudDrafts() {
      try {
        const res = await fetch(
          `/api/v1/past-questions/drafts?topicId=${encodeURIComponent(topicId)}`,
          { cache: "no-store" }
        );
        const data = (await res.json().catch(() => null)) as {
          drafts?: CloudDraft[];
        } | null;

        if (!active || !res.ok || !Array.isArray(data?.drafts)) return;

        let changed = false;
        setAnswersByQuestionId((current) => {
          const next = { ...current };

          for (const draft of data.drafts ?? []) {
            if (
              typeof draft.questionId === "string" &&
              typeof draft.answerText === "string" &&
              draft.answerText.length > 0 &&
              !next[draft.questionId]
            ) {
              next[draft.questionId] = draft.answerText;
              changed = true;
            }
          }

          if (!changed) return current;

          latestAnswersRef.current = next;
          writeLocalDrafts(topicId, next);
          return next;
        });

        if (changed) setDraftStatus("cloud");
      } catch {
        /* Local drafts remain available. */
      }
    }

    void loadCloudDrafts();
    return () => {
      active = false;
    };
  }, [questions.length, settings, topicId]);

  useEffect(() => {
    return () => {
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, []);

  const q = questions[index];
  const n = questions.length;
  const answer = q ? answersByQuestionId[q.id] ?? "" : "";
  const draftStatusText = getDraftStatusText(answer, settings, draftStatus);
  const answeredCount = questions.reduce((count, question) => {
    return answersByQuestionId[question.id]?.trim() ? count + 1 : count;
  }, 0);

  const persistCurrentDraft = () => {
    if (!q) return;
    updateLocalDraft(q.id, answer);
    pendingCloudDraftsRef.current.set(q.id, answer);
    void flushCloudDrafts();
  };

  const resetQuestionFeedback = () => {
    setLastResult(null);
    setReveal(null);
  };

  const goNext = () => {
    if (index < n - 1) {
      persistCurrentDraft();
      setIndex((i) => i + 1);
      resetQuestionFeedback();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      persistCurrentDraft();
      setIndex((i) => i - 1);
      resetQuestionFeedback();
    }
  };

  const finishQuiz = () => {
    persistCurrentDraft();
    resetQuestionFeedback();
    setQuizFinished(true);
  };

  const reviewQuiz = () => {
    setQuizFinished(false);
    setIndex(0);
    resetQuestionFeedback();
  };

  const handleAnswerChange = (nextAnswer: string) => {
    if (!q) return;
    updateLocalDraft(q.id, nextAnswer);
    queueCloudDraft(q.id, nextAnswer);
  };

  const handleSubmit = async () => {
    if (!q || submitting) return;
    persistCurrentDraft();
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

      {!loading && !loadError && quizFinished && n > 0 && (
        <EndQuizScreen
          questionCount={n}
          answeredCount={answeredCount}
          correctCount={session.correct}
          submittedCount={session.attempted}
          onReview={reviewQuiz}
          onBackToMaterials={() => router.push("/materials")}
        />
      )}

      {!loading && !quizFinished && q && (
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

          <div className="space-y-2">
            <textarea
              className="w-full border border-accent-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900 min-h-[100px]"
              placeholder="Type your answer"
              value={answer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={Boolean(lastResult)}
            />
            {draftStatusText && (
              <p className="text-xs text-gray-500">{draftStatusText}</p>
            )}
          </div>

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
            {index < n - 1 ? (
              <Button
                variant="outline"
                onClick={goNext}
              >
                Next
              </Button>
            ) : (
              <Button variant="success" onClick={finishQuiz}>
                Finish quiz
              </Button>
            )}
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
