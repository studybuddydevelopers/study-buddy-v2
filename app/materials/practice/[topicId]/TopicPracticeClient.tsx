"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import LowDataImage from "@/components/LowDataImage";

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

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

type AnswersByQuestionId = Record<string, string>;
type ResultsByQuestionId = Record<string, boolean>;
type TimestampsByQuestionId = Record<string, string>;
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
const PRACTICE_QUESTIONS_PAGE_SIZE = 10;

function getDraftStorageKey(topicId: string) {
  return `study-buddy:practice-drafts:${topicId}`;
}

function buildPracticeQuestionsUrl(topicId: string, page: number) {
  const params = new URLSearchParams({
    topicId,
    page: String(page),
    pageSize: String(PRACTICE_QUESTIONS_PAGE_SIZE),
  });

  return `/api/v1/past-questions/by-topic?${params.toString()}`;
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

function clearLocalDrafts(topicId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getDraftStorageKey(topicId));
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

function ReviewAnswersScreen({
  questions,
  answersByQuestionId,
  resultsByQuestionId,
  lowDataModeEnabled,
  onBackToResults,
  onBackToMaterials,
}: {
  questions: QuestionStub[];
  answersByQuestionId: AnswersByQuestionId;
  resultsByQuestionId: ResultsByQuestionId;
  lowDataModeEnabled: boolean;
  onBackToResults: () => void;
  onBackToMaterials: () => void;
}) {
  const correctCount = questions.filter(
    (question) => resultsByQuestionId[question.id] === true
  ).length;
  const wrongQuestionIds = questions
    .filter((question) => resultsByQuestionId[question.id] === false)
    .map((question) => question.id);
  const wrongCount = wrongQuestionIds.length;
  const ungradedCount = questions.length - correctCount - wrongCount;
  const [nextWrongIndex, setNextWrongIndex] = useState(0);

  const scrollToNextWrongAnswer = () => {
    if (wrongQuestionIds.length === 0) return;

    const targetQuestionId =
      wrongQuestionIds[nextWrongIndex % wrongQuestionIds.length];
    document
      .getElementById(getReviewQuestionElementId(targetQuestionId))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setNextWrongIndex((current) => (current + 1) % wrongQuestionIds.length);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-accent-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase text-primary-600">
              Review answers
            </p>
            <Heading1 gutter="sm">Your quiz review</Heading1>
            <Paragraph variant="muted" gutter="none" className="text-sm">
              Answers are shown read-only so you can scan your work without
              accidentally changing a saved response.
            </Paragraph>
          </div>
          <div className="flex flex-wrap gap-2">
            {wrongCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={scrollToNextWrongAnswer}
              >
                Next wrong answer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onBackToResults}>
              Back to results
            </Button>
            <Button variant="ghost" size="sm" onClick={onBackToMaterials}>
              Study materials
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-accent-200 border-y border-accent-200 py-4">
          <QuizStat label="Correct" value={correctCount} />
          <QuizStat label="Wrong" value={wrongCount} />
          <QuizStat label="Ungraded" value={ungradedCount} />
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, questionIndex) => {
          const result = resultsByQuestionId[question.id];
          const answerText = answersByQuestionId[question.id]?.trim() ?? "";
          const isWrong = result === false;

          return (
            <section
              key={question.id}
              id={getReviewQuestionElementId(question.id)}
              className={`scroll-mt-6 rounded-lg border bg-white p-4 shadow-sm ${
                isWrong ? "border-red-300" : "border-accent-200"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary-600">
                  Question {questionIndex + 1} of {questions.length}
                </p>
                <ReviewResultBadge result={result} />
              </div>

              <div className="space-y-3">
                <p className="whitespace-pre-line text-gray-900">
                  {question.questionText}
                </p>
                {question.questionImageUrl && (
                  <LowDataImage
                    src={question.questionImageUrl}
                    alt=""
                    className="max-h-64 object-contain"
                    lowDataModeEnabled={lowDataModeEnabled}
                  />
                )}
                <div className="rounded-lg border border-accent-200 bg-accent-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                    Your answer
                  </p>
                  <p className="min-h-10 whitespace-pre-wrap text-sm text-gray-900">
                    {answerText || "No answer saved."}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ReviewResultBadge({ result }: { result: boolean | undefined }) {
  if (result === true) {
    return (
      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        Correct
      </span>
    );
  }

  if (result === false) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Wrong
      </span>
    );
  }

  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
      Not submitted
    </span>
  );
}

function getReviewQuestionElementId(questionId: string) {
  return `practice-review-${questionId}`;
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
  const [questionPagination, setQuestionPagination] =
    useState<PaginationMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [index, setIndex] = useState(0);
  const [answersByQuestionId, setAnswersByQuestionId] =
    useState<AnswersByQuestionId>(() => readLocalDrafts(topicId));
  const [finishedAnswersByQuestionId, setFinishedAnswersByQuestionId] =
    useState<AnswersByQuestionId>({});
  const [answeredAtByQuestionId, setAnsweredAtByQuestionId] =
    useState<TimestampsByQuestionId>({});
  const [submittedAtByQuestionId, setSubmittedAtByQuestionId] =
    useState<TimestampsByQuestionId>({});
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftSyncStatus>("idle");
  const [quizFinished, setQuizFinished] = useState(false);
  const [reviewingAnswers, setReviewingAnswers] = useState(false);
  const [resultsByQuestionId, setResultsByQuestionId] =
    useState<ResultsByQuestionId>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingQuizSession, setSavingQuizSession] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
  } | null>(null);
  const [reveal, setReveal] = useState<{
    answerText: string;
    explanation: string | null;
  } | null>(null);

  const latestAnswersRef = useRef<AnswersByQuestionId>({});
  const quizStartedAtRef = useRef(new Date().toISOString());
  const pendingCloudDraftsRef = useRef<Map<string, string>>(new Map());
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSaveInFlightRef = useRef(false);
  const queuedInitialCloudDraftsRef = useRef(false);
  const loadedCloudDraftQuestionIdsRef = useRef<Set<string>>(new Set());
  const flushCloudDraftsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    latestAnswersRef.current = answersByQuestionId;
  }, [answersByQuestionId]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadQuestions() {
      setLoading(true);
      setLoadError(null);
      setQuestionPagination(null);
      loadedCloudDraftQuestionIdsRef.current = new Set();
      try {
        const res = await fetch(buildPracticeQuestionsUrl(topicId, 1), {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as {
          questions?: QuestionStub[];
          pagination?: PaginationMeta;
          error?: string;
        } | null;

        if (!res.ok) {
          if (!active) return;
          setLoadError(data?.error || "Could not load questions.");
          setQuestions([]);
          return;
        }
        if (!active) return;
        setQuestions(data?.questions ?? []);
        setQuestionPagination(data?.pagination ?? null);
        setIndex(0);
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
      controller.abort();
    };
  }, [topicId]);

  const loadMoreQuestions = useCallback(async () => {
    if (!questionPagination?.hasNextPage || loadingMore) return;

    setLoadingMore(true);
    setLoadError(null);

    try {
      const nextPage = questionPagination.page + 1;
      const res = await fetch(buildPracticeQuestionsUrl(topicId, nextPage), {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        questions?: QuestionStub[];
        pagination?: PaginationMeta;
        error?: string;
      } | null;

      if (!res.ok) {
        setLoadError(data?.error || "Could not load more questions.");
        return;
      }

      const nextQuestions = data?.questions ?? [];
      setQuestions((current) => {
        const existingIds = new Set(current.map((question) => question.id));
        return [
          ...current,
          ...nextQuestions.filter((question) => !existingIds.has(question.id)),
        ];
      });
      setQuestionPagination(data?.pagination ?? null);
    } catch {
      setLoadError("Could not load more questions.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, questionPagination, topicId]);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setSettingsLoaded(false);
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
      } finally {
        if (active) setSettingsLoaded(true);
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

    const questionIdsToLoad = questions
      .map((question) => question.id)
      .filter((questionId) => !loadedCloudDraftQuestionIdsRef.current.has(questionId))
      .slice(0, 25);

    if (questionIdsToLoad.length === 0) return;

    let active = true;

    async function loadCloudDrafts() {
      try {
        const params = new URLSearchParams({ topicId });
        for (const questionId of questionIdsToLoad) {
          params.append("questionId", questionId);
        }

        const res = await fetch(`/api/v1/past-questions/drafts?${params}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          drafts?: CloudDraft[];
        } | null;

        if (!active || !res.ok || !Array.isArray(data?.drafts)) return;
        for (const questionId of questionIdsToLoad) {
          loadedCloudDraftQuestionIdsRef.current.add(questionId);
        }

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
  }, [questions, settings, topicId]);

  useEffect(() => {
    return () => {
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, []);

  const q = questions[index];
  const n = questions.length;
  const totalQuestionCount = questionPagination?.total ?? n;
  const hasMoreQuestions = Boolean(questionPagination?.hasNextPage);
  const lowDataModeEnabled =
    !settingsLoaded || Boolean(settings?.lowDataModeEnabled);
  const answer = q ? answersByQuestionId[q.id] ?? "" : "";
  const draftStatusText = getDraftStatusText(answer, settings, draftStatus);
  const summaryAnswersByQuestionId =
    quizFinished || reviewingAnswers
      ? finishedAnswersByQuestionId
      : answersByQuestionId;
  const answeredCount = questions.reduce((count, question) => {
    return summaryAnswersByQuestionId[question.id]?.trim() ? count + 1 : count;
  }, 0);
  const correctQuestionCount = questions.filter(
    (question) => resultsByQuestionId[question.id] === true
  ).length;
  const wrongQuestionCount = questions.filter(
    (question) => resultsByQuestionId[question.id] === false
  ).length;
  const gradedQuestionCount = correctQuestionCount + wrongQuestionCount;

  const getCurrentAnswerSnapshot = () => {
    const snapshot = { ...latestAnswersRef.current, ...answersByQuestionId };

    if (q) {
      if (answer.length > 0) {
        snapshot[q.id] = answer;
      } else {
        delete snapshot[q.id];
      }
    }

    return snapshot;
  };

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

  const finishQuiz = async () => {
    if (savingQuizSession) return;

    const answerSnapshot = getCurrentAnswerSnapshot();
    const finishedAt = new Date().toISOString();

    persistCurrentDraft();
    setLoadError(null);
    setSavingQuizSession(true);

    try {
      await flushCloudDrafts();

      const res = await fetch("/api/v1/past-questions/quiz-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          startedAt: quizStartedAtRef.current,
          finishedAt,
          answers: questions.map((question) => {
            const answerText = answerSnapshot[question.id] ?? "";
            const hasAnswer = answerText.trim().length > 0;

            return {
              questionId: question.id,
              answerText,
              submitted: resultsByQuestionId[question.id] !== undefined,
              isCorrect: resultsByQuestionId[question.id] ?? null,
              answeredAt: hasAnswer
                ? answeredAtByQuestionId[question.id] ?? finishedAt
                : null,
              submittedAt: submittedAtByQuestionId[question.id] ?? null,
            };
          }),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setLoadError(data?.error || "Could not save finished quiz.");
        return;
      }

      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
        cloudSaveTimerRef.current = null;
      }
      pendingCloudDraftsRef.current.clear();
      clearLocalDrafts(topicId);
      latestAnswersRef.current = {};
      setAnswersByQuestionId({});
      setFinishedAnswersByQuestionId(answerSnapshot);
      setDraftStatus("idle");
      resetQuestionFeedback();
      setReviewingAnswers(false);
      setQuizFinished(true);
    } catch {
      setLoadError("Could not save finished quiz.");
    } finally {
      setSavingQuizSession(false);
    }
  };

  const reviewQuiz = () => {
    setReviewingAnswers(true);
    setQuizFinished(false);
    resetQuestionFeedback();
  };

  const backToResults = () => {
    setReviewingAnswers(false);
    setQuizFinished(true);
    resetQuestionFeedback();
  };

  const handleAnswerChange = (nextAnswer: string) => {
    if (!q) return;
    if (nextAnswer.trim().length > 0) {
      setAnsweredAtByQuestionId((current) =>
        current[q.id] ? current : { ...current, [q.id]: new Date().toISOString() }
      );
    }
    setResultsByQuestionId((current) => {
      if (current[q.id] === undefined) return current;

      const next = { ...current };
      delete next[q.id];
      return next;
    });
    setSubmittedAtByQuestionId((current) => {
      if (!current[q.id]) return current;

      const next = { ...current };
      delete next[q.id];
      return next;
    });
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
      const answerStartedAt =
        answeredAtByQuestionId[q.id] ?? quizStartedAtRef.current;
      const timeTakenSeconds = Math.max(
        0,
        Math.round(
          (Date.now() - new Date(answerStartedAt).getTime()) / 1000
        )
      );
      const res = await fetch("/api/v1/past-questions/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          userAnswer: answer.trim(),
          timeTakenSeconds,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLastResult(null);
        setLoadError(data?.error || "Submit failed.");
        return;
      }
      const isCorrect = Boolean(data.isCorrect);
      const submittedAt =
        typeof data.attemptedAt === "string"
          ? data.attemptedAt
          : new Date().toISOString();
      setLastResult({ isCorrect });
      setResultsByQuestionId((current) => ({
        ...current,
        [q.id]: isCorrect,
      }));
      setAnsweredAtByQuestionId((current) =>
        current[q.id] ? current : { ...current, [q.id]: submittedAt }
      );
      setSubmittedAtByQuestionId((current) => ({
        ...current,
        [q.id]: submittedAt,
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
          This session: {correctQuestionCount}/{gradedQuestionCount} correct
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

      {!loading && !loadError && reviewingAnswers && n > 0 && (
        <ReviewAnswersScreen
          questions={questions}
          answersByQuestionId={finishedAnswersByQuestionId}
          resultsByQuestionId={resultsByQuestionId}
          lowDataModeEnabled={lowDataModeEnabled}
          onBackToResults={backToResults}
          onBackToMaterials={() => router.push("/materials")}
        />
      )}

      {!loading && !loadError && quizFinished && !reviewingAnswers && n > 0 && (
        <EndQuizScreen
          questionCount={n}
          answeredCount={answeredCount}
          correctCount={correctQuestionCount}
          submittedCount={gradedQuestionCount}
          onReview={reviewQuiz}
          onBackToMaterials={() => router.push("/materials")}
        />
      )}

      {!loading && !quizFinished && !reviewingAnswers && q && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-primary-600">
            <span>
              Question {index + 1} of {n} loaded
            </span>
            {totalQuestionCount > n && (
              <span className="text-gray-500">
                {totalQuestionCount} total in this topic
              </span>
            )}
          </div>

          <div className="border border-accent-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
            <p className="text-gray-900 whitespace-pre-line">{q.questionText}</p>
            {q.questionImageUrl && (
              <LowDataImage
                src={q.questionImageUrl}
                alt=""
                className="max-h-64 object-contain"
                lowDataModeEnabled={lowDataModeEnabled}
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
            ) : hasMoreQuestions ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    void loadMoreQuestions();
                  }}
                  loading={loadingMore}
                  disabled={loadingMore}
                >
                  Load next {PRACTICE_QUESTIONS_PAGE_SIZE}
                </Button>
                <Button
                  variant="success"
                  onClick={finishQuiz}
                  loading={savingQuizSession}
                  disabled={savingQuizSession || loadingMore}
                >
                  Finish loaded quiz
                </Button>
              </>
            ) : (
              <Button
                variant="success"
                onClick={finishQuiz}
                loading={savingQuizSession}
                disabled={savingQuizSession}
              >
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
