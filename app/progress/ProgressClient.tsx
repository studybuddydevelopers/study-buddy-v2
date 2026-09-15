"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import ProgressBar from "@/components/ProgressBar";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";
import type {
  ProgressFullReport,
  ProgressRange,
} from "@/app/dashboard/dashboard.types";
import LocalDateTime from "@/components/LocalDateTime";
import {
  buildProgressMilestones,
  PROGRESS_RANGE_OPTIONS,
} from "@/lib/progress/report";
import Heading3 from "@/components/Heading3";

const PROGRESS_HELP_TEXT =
  "Coverage is the part of the question bank you have tried at least once. Accuracy uses submitted practice answers. Mock performance uses graded mock exams. These measures are kept separate because none of them alone proves mastery.";

function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

function pct(rate: number): number {
  return Math.round(Math.max(0, Math.min(1, rate)) * 100);
}

function progressHref(
  filters: ProgressFullReport["filters"],
  updates: {
    range?: ProgressRange;
    mockPage?: number;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("range", updates.range ?? filters.range);
  if (filters.subjectId) params.set("subject", filters.subjectId);
  if (filters.topicId) params.set("topic", filters.topicId);
  if (updates.mockPage && updates.mockPage > 1) {
    params.set("mockPage", String(updates.mockPage));
  }
  return `/progress?${params.toString()}`;
}

interface StatCardProps {
  title: string;
  value: string;
  detail: string;
  scope: string;
}

function StatCard({ title, value, detail, scope }: StatCardProps) {
  return (
    <article className="flex min-h-0 w-full shrink-0 snap-start flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:min-h-44 sm:p-5 min-[769px]:snap-none">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
          {scope}
        </span>
      </div>
      <p className="mt-5 text-4xl font-bold tracking-tight text-gray-950 tabular-nums">
        {value}
      </p>
      <p className="mt-auto pt-3 text-sm leading-6 text-gray-600">{detail}</p>
    </article>
  );
}

function useCardCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function updateActiveItem() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(scroller.children) as HTMLElement[];
    const nearestIndex = cards.reduce(
      (nearest, card, index) => {
        const cardPosition = card.offsetLeft - scroller.offsetLeft;
        const nearestCard = cards[nearest];
        const nearestPosition = nearestCard.offsetLeft - scroller.offsetLeft;
        return Math.abs(cardPosition - scroller.scrollLeft) <
          Math.abs(nearestPosition - scroller.scrollLeft)
          ? index
          : nearest;
      },
      0
    );

    setActiveIndex(nearestIndex);
  }

  function showItem(index: number) {
    const scroller = scrollerRef.current;
    const card = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !card) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    scroller.scrollTo({
      left: card.offsetLeft - scroller.offsetLeft,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    setActiveIndex(index);
  }

  return { activeIndex, scrollerRef, showItem, updateActiveItem };
}

function CarouselDots({
  activeIndex,
  items,
  itemName,
  onSelect,
}: {
  activeIndex: number;
  items: Array<{ id: string; label: string }>;
  itemName: string;
  onSelect: (index: number) => void;
}) {
  if (items.length <= 1) return null;

  return (
    <div
      className="mt-2 flex min-h-11 items-center justify-center min-[769px]:hidden"
      role="group"
      aria-label={`${itemName} ${activeIndex + 1} of ${items.length}`}
    >
      <span className="sr-only" aria-live="polite">
        Showing {itemName.toLowerCase()} {activeIndex + 1} of {items.length}
      </span>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(index)}
          className="group inline-flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
          aria-label={`Show ${itemName.toLowerCase()} ${index + 1}: ${item.label}`}
          aria-current={activeIndex === index ? "true" : undefined}
        >
          <span
            className={`block rounded-full transition-all ${
              activeIndex === index
                ? "h-2.5 w-2.5 bg-primary-700"
                : "h-2 w-2 bg-gray-300 group-hover:bg-primary-300"
            }`}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}

interface OverviewStat extends StatCardProps {
  id: string;
}

function OverviewCarousel({ stats }: { stats: OverviewStat[] }) {
  const { activeIndex, scrollerRef, showItem, updateActiveItem } =
    useCardCarousel();

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={updateActiveItem}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[769px]:grid min-[769px]:grid-cols-2 min-[769px]:snap-none min-[769px]:overflow-visible xl:grid-cols-4"
        aria-label="Honest overview statistics"
      >
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>
      <CarouselDots
        activeIndex={activeIndex}
        items={stats.map((stat) => ({ id: stat.id, label: stat.title }))}
        itemName="Overview card"
        onSelect={showItem}
      />
    </div>
  );
}

function SubjectGoalsCarousel({
  goals,
}: {
  goals: ProgressFullReport["subjects"];
}) {
  const { activeIndex, scrollerRef, showItem, updateActiveItem } =
    useCardCarousel();

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={updateActiveItem}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[769px]:grid min-[769px]:grid-cols-2 min-[769px]:snap-none min-[769px]:overflow-visible"
        aria-label="Subject goals"
      >
        {goals.map((goal, index) => (
          <article
            key={goal.subjectId}
            className="w-full shrink-0 snap-start rounded-2xl border-2 border-primary-100 bg-primary-50 p-5 sm:p-6 min-[769px]:snap-none"
            aria-label={`Subject goal ${index + 1} of ${goals.length}: ${goal.subjectName}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-800">
                  {goal.subjectName}
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-950 tabular-nums">
                  {goal.progressPercentage}%
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Latest saved mock score · updated{" "}
                  <LocalDateTime value={goal.updatedAt} />
                </p>
              </div>
              <StudyBuddyIcon
                name="progress"
                size={72}
                className="shrink-0"
              />
            </div>
            <div className="mt-5">
              <ProgressBar
                label={`${goal.subjectName} score progress`}
                percentage={goal.progressPercentage}
                showPercentage={false}
                color="warning"
              />
            </div>
            <Link
              href="/exams"
              prefetch={false}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
            >
              Take another mock
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
      <CarouselDots
        activeIndex={activeIndex}
        items={goals.map((goal) => ({
          id: goal.subjectId,
          label: goal.subjectName,
        }))}
        itemName="Subject goal"
        onSelect={showItem}
      />
    </div>
  );
}

interface NextAction {
  id: string;
  icon: StudyBuddyIconName;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  linkLabel: string;
}

function NextActionsCarousel({ actions }: { actions: NextAction[] }) {
  const { activeIndex, scrollerRef, showItem, updateActiveItem } =
    useCardCarousel();

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={updateActiveItem}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[769px]:grid min-[769px]:grid-cols-1 min-[769px]:snap-none min-[769px]:overflow-visible lg:grid-cols-2"
        aria-label="Recommended next actions"
      >
        {actions.map((action, index) => (
          <article
            key={action.id}
            className="flex w-full shrink-0 snap-start flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:gap-5 min-[769px]:snap-none"
            aria-label={`Recommendation ${index + 1} of ${actions.length}: ${action.title}`}
          >
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-50">
              <StudyBuddyIcon name={action.icon} size={64} />
            </div>
            <div className="mt-4 flex min-w-0 flex-1 flex-col sm:mt-0">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-700">
                {action.eyebrow}
              </p>
              <h3 className="mt-1 text-lg font-bold text-gray-950">
                {action.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {action.detail}
              </p>
              <Link
                href={action.href}
                prefetch={false}
                className="mt-4 inline-flex min-h-11 items-center gap-2 self-start rounded-xl font-semibold text-primary-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
              >
                {action.linkLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <CarouselDots
        activeIndex={activeIndex}
        items={actions.map((action) => ({
          id: action.id,
          label: action.title,
        }))}
        itemName="Recommendation"
        onSelect={showItem}
      />
    </div>
  );
}

function TrendChart({ progress }: { progress: ProgressFullReport }) {
  const maxAttempts = Math.max(
    1,
    ...progress.trend.map((point) => point.questionsAttempted)
  );
  const activeDays = progress.trend.filter(
    (point) => point.questionsAttempted > 0 || point.mockExamsCompleted > 0
  ).length;
  const hasActivity = activeDays > 0;
  const chartData = progress.trend.map((point) => ({
    ...point,
    dateLabel: new Date(`${point.startDate}T00:00:00Z`).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }
    ),
  }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-950">Practice activity</h3>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {progress.pastQuestions.totalAttempts} question attempts across{" "}
            {activeDays} active day{activeDays === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>
            <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-primary-600" />
            Question attempts
          </span>
          <span>
            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-secondary-500" />
            Mock completed
          </span>
        </div>
      </div>

      {hasActivity ? (
        <>
          <div
            className="mt-6 h-56 min-w-0 sm:h-64"
            role="img"
            aria-label={`Daily practice activity for ${progress.filters.rangeLabel.toLowerCase()}`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={chartData}
                margin={{ top: 12, right: 8, bottom: 0, left: -16 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id="practiceActivityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-600)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--primary-600)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#E5E7EB"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="dateLabel"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  interval="preserveStartEnd"
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  domain={[0, maxAttempts]}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: "#D1D5DB", strokeDasharray: "4 4" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const point = payload[0].payload as (typeof chartData)[number];
                    return (
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
                        <p className="font-semibold text-gray-950">{point.dateLabel}</p>
                        <p className="mt-1 text-gray-700">
                          {point.questionsAttempted} question attempt
                          {point.questionsAttempted === 1 ? "" : "s"}
                        </p>
                        <p className="text-gray-700">
                          {point.accuracyPct == null
                            ? "No answers graded"
                            : `${point.accuracyPct}% correct`}
                        </p>
                        {point.mockExamsCompleted > 0 && (
                          <p className="text-secondary-700">
                            {point.mockExamsCompleted} mock completed
                            {point.averageMockScorePct == null
                              ? ""
                              : ` · ${point.averageMockScorePct}% average`}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="linear"
                  dataKey="questionsAttempted"
                  name="Question attempts"
                  stroke="var(--primary-600)"
                  strokeWidth={3}
                  fill="url(#practiceActivityFill)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "var(--primary-600)",
                    stroke: "#FFFFFF",
                    strokeWidth: 3,
                  }}
                  isAnimationActive={false}
                />
                {chartData
                  .filter((point) => point.mockExamsCompleted > 0)
                  .map((point) => (
                    <ReferenceDot
                      key={point.startDate}
                      x={point.dateLabel}
                      y={Math.max(point.questionsAttempted, maxAttempts * 0.08)}
                      r={5}
                      fill="var(--secondary-500)"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">
            The purple trend shows daily question volume. Gold markers show days
            when you completed a mock. Tap or hover for daily details.
          </p>
        </>
      ) : (
        <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 text-center">
          <StudyBuddyIcon name="progress" size={64} />
          <p className="mt-3 font-semibold text-gray-900">
            No activity in this period
          </p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-gray-600">
            Practice questions or complete a mock exam to start your daily trend.
          </p>
        </div>
      )}

      <div className="sr-only">
        <p>
          Daily practice activity for {progress.filters.rangeLabel.toLowerCase()}
        </p>
        <ul>
          {chartData.map((point) => (
            <li key={point.startDate}>
              {point.dateLabel}: {point.questionsAttempted} questions attempted,{
              " "}
              {point.correctAnswers} correct, {point.mockExamsCompleted} mock
              exams completed.
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MockResultsSummary({
  mocks,
}: {
  mocks: ProgressFullReport["mockExams"];
}) {
  const items = [
    { label: "Average score", value: `${mocks.averageScorePercent}%` },
    {
      label: "Average time",
      value: formatDurationMinutes(mocks.averageDurationMinutes),
    },
    { label: "Completed", value: String(mocks.count) },
  ];

  return (
    <dl className="grid grid-cols-3 divide-x divide-primary-100 overflow-hidden rounded-2xl border border-primary-100 bg-accent-50">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-2 py-3 text-center sm:p-4">
          <dt className="text-xs font-medium leading-4 text-gray-600">
            {item.label}
          </dt>
          <dd className="mt-1 truncate text-lg font-bold text-gray-950 tabular-nums sm:text-xl">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MobileMockResults({
  exams,
}: {
  exams: ProgressFullReport["mockExams"]["exams"];
}) {
  return (
    <ol
      className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm min-[769px]:hidden"
      aria-label="Mock exam results"
    >
      {exams.map((exam) => (
        <li key={exam.instanceId} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 pt-1 font-bold leading-6 text-gray-950 [overflow-wrap:anywhere]">
              {exam.templateTitle}
            </h3>
            <span className="shrink-0 rounded-full bg-primary-50 px-3 py-1 text-lg font-bold text-primary-800 tabular-nums">
              {exam.scorePercent == null ? "—" : `${exam.scorePercent}%`}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">Score</dt>
              <dd className="mt-0.5 font-semibold text-gray-900 tabular-nums">
                {exam.score} / {exam.questionCount}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">Time</dt>
              <dd className="mt-0.5 font-semibold text-gray-900 tabular-nums">
                {formatDurationMinutes(exam.durationMinutes)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs leading-5 text-gray-500">
            Submitted{" "}
            {exam.submittedAt ? (
              <LocalDateTime value={exam.submittedAt} />
            ) : (
              "—"
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function ProgressClient({
  progress,
}: {
  progress: ProgressFullReport | null;
}) {
  if (!progress) {
    return (
      <div className="mx-auto w-[90vw] max-w-4xl py-10">
        <Heading1 gutter="sm">Progress</Heading1>
        <Paragraph variant="muted">
          We couldn&apos;t load your stats. Refresh the page or sign in again.
        </Paragraph>
      </div>
    );
  }

  const { filters } = progress;
  const materials = progress.studyMaterials;
  const practice = progress.pastQuestions;
  const mocks = progress.mockExams;
  const goals = progress.subjects;
  const mockPagination = mocks.pagination;
  const practiceAccuracyPct =
    practice.totalAttempts > 0 ? pct(practice.accuracyRate) : null;
  const overviewStats: OverviewStat[] = [
    {
      id: "coverage",
      title: "Question-bank coverage",
      value:
        materials.questionsInBank > 0
          ? `${materials.bankCoveragePercent}%`
          : "—",
      detail:
        materials.questionsInBank > 0
          ? `${materials.distinctQuestionsPracticed} of ${materials.questionsInBank} different questions tried`
          : "No question bank is configured yet",
      scope: "All time",
    },
    {
      id: "accuracy",
      title: "Practice accuracy",
      value: practiceAccuracyPct == null ? "—" : `${practiceAccuracyPct}%`,
      detail:
        practice.totalAttempts > 0
          ? `${practice.correctAttempts} correct from ${practice.totalAttempts} submitted answers`
          : "No practice answers in this view",
      scope: filters.rangeLabel,
    },
    {
      id: "mock-performance",
      title: "Mock performance",
      value: mocks.count > 0 ? `${mocks.averageScorePercent}%` : "—",
      detail:
        mocks.count > 0
          ? `Average across ${mocks.count} completed mock${mocks.count === 1 ? "" : "s"}`
          : "No graded mock exams in this view",
      scope: filters.rangeLabel,
    },
    {
      id: "practice-volume",
      title: "Practice volume",
      value: String(practice.totalAttempts),
      detail: `Question attempt${practice.totalAttempts === 1 ? "" : "s"}; shown separately from accuracy`,
      scope: filters.rangeLabel,
    },
  ];
  const selectedSubject = filters.subjects.find(
    (subject) => subject.id === filters.subjectId
  );
  const selectedTopic = filters.topics.find(
    (topic) => topic.id === filters.topicId
  );
  const filterSummary = [
    filters.rangeLabel,
    selectedSubject?.name,
    selectedTopic?.title,
  ]
    .filter(Boolean)
    .join(" · ");
  const mockPageStart =
    mockPagination.total === 0
      ? 0
      : (mockPagination.page - 1) * mockPagination.pageSize + 1;
  const mockPageEnd = Math.min(
    mockPagination.page * mockPagination.pageSize,
    mockPagination.total
  );
  const milestones = buildProgressMilestones({
    distinctQuestionsPracticed: materials.distinctQuestionsPracticed,
    topicsWithPractice: materials.topicsWithPractice,
    mockExamsCompleted: mocks.allTimeCount,
  });

  const nextActions: NextAction[] = [];
  if (progress.topicInsights.focusTopics.length > 0) {
    for (const topic of progress.topicInsights.focusTopics.slice(0, 2)) {
      nextActions.push({
        id: `topic-${topic.topicId}`,
        icon: "practice",
        eyebrow: "Evidence-qualified gap",
        title: `Strengthen ${topic.topicTitle}`,
        detail: `${topic.accuracyPct}% across ${topic.attempted} different questions in ${topic.subjectName}.`,
        href: `/materials/practice/${topic.topicId}`,
        linkLabel: "Practise this topic",
      });
    }
  } else if (progress.topicInsights.recommendedTopic) {
    const topic = progress.topicInsights.recommendedTopic;
    nextActions.push({
      id: `topic-${topic.topicId}`,
      icon: "practice",
      eyebrow: topic.reason === "explore" ? "Start here" : "Keep building",
      title:
        topic.reason === "explore"
          ? `Explore ${topic.topicTitle}`
          : `Continue ${topic.topicTitle}`,
      detail:
        topic.reason === "explore"
          ? `${topic.subjectName} has questions ready when you are.`
          : `${topic.attempted} different questions attempted so far in ${topic.subjectName}.`,
      href: `/materials/practice/${topic.topicId}`,
      linkLabel: "Open this topic",
    });
  }

  nextActions.push({
    id: "mock",
    icon: "exams",
    eyebrow: mocks.inProgressCount > 0 ? "Ready to continue" : "Exam practice",
    title:
      mocks.inProgressCount > 0
        ? "Return to your mock exams"
        : "Add a WAEC-style mock result",
    detail:
      mocks.inProgressCount > 0
        ? `${mocks.inProgressCount} mock exam${mocks.inProgressCount === 1 ? " is" : "s are"} still in progress.`
        : "A completed mock adds a separate exam-condition signal to this report.",
    href: "/exams",
    linkLabel: "Open mock exams",
  });

  nextActions.push({
    id: "coverage",
    icon: "materials",
    eyebrow: "Broaden coverage",
    title:
      materials.topicsTotal > materials.topicsWithPractice
        ? "Try an untouched topic"
        : "Revisit the question bank",
    detail: `${materials.topicsWithPractice} of ${materials.topicsTotal} available topics have been started.`,
    href: "/materials/past-questions",
    linkLabel: "Browse practice topics",
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-8 py-6 sm:space-y-12 sm:px-6 sm:py-10">
      <header>
        <div className="flex items-center gap-2">
          <Heading1 size="lg" gutter="none">
            Your progress
          </Heading1>
          <div className="group/help relative inline-flex">
            <span
              role="img"
              aria-label={PROGRESS_HELP_TEXT}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-primary-700 shadow-sm transition group-hover/help:border-primary-300 group-hover/help:bg-primary-50"
            >
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </span>
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-60 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-medium leading-relaxed text-gray-700 shadow-lg group-hover/help:block sm:left-1/2 sm:right-auto sm:w-72 sm:-translate-x-1/2"
            >
              {PROGRESS_HELP_TEXT}
            </div>
          </div>
        </div>
        <Paragraph variant="muted" className="mt-3">
          See what you have covered, how accurately you practise, and how you
          perform in mock conditions.
        </Paragraph>
      </header>

      <section aria-labelledby="progress-filters-heading">
        <div className="rounded-2xl border border-gray-200 bg-accent-50 p-2 min-[376px]:p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <Heading3
                id="progress-filters-heading"
                className="font-bold text-gray-950"
              >
                Choose what to review
              </Heading3>
            </div>
            <div
              className="mb-2 flex min-w-0 items-center justify-center gap-2 sm:justify-start"
              aria-label="Date range"
            >
              <span
                aria-hidden="true"
                className="text-sm font-semibold text-gray-700 sm:hidden"
              >
                Last
              </span>
              {PROGRESS_RANGE_OPTIONS.map((option) => {
                const active = option.value === filters.range;
                return (
                  <Link
                    key={option.value}
                    href={progressHref(filters, { range: option.value })}
                    prefetch={false}
                    aria-label={option.label}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border px-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 sm:min-w-0 sm:whitespace-nowrap sm:px-4 ${
                      active
                        ? "border-primary-700 bg-primary-700 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700"
                    }`}
                  >
                    <span aria-hidden="true" className="sm:hidden">
                      {option.value.replace("d", "")}
                    </span>
                    <span className="hidden sm:inline">{option.label}</span>
                  </Link>
                );
              })}
              <span
                aria-hidden="true"
                className="text-sm font-semibold text-gray-700 sm:hidden"
              >
                days
              </span>
            </div>
          </div>

          <form action="/progress" method="get" className="mt-5 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
            <input type="hidden" name="range" value={filters.range} />
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-gray-800">
              Subject
              <select
                name="subject"
                defaultValue={filters.subjectId ?? ""}
                className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-gray-300 bg-white px-3 text-base font-normal text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="">All subjects</option>
                {filters.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-gray-800">
              Practice topic
              <select
                name="topic"
                defaultValue={filters.topicId ?? ""}
                className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-gray-300 bg-white px-3 text-base font-normal text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="">All topics</option>
                {filters.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.subjectName} — {topic.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 md:w-auto"
            >
              Apply filters
            </button>
            <Link
              href={`/progress?range=${filters.range}`}
              prefetch={false}
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-primary-300 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 md:w-auto"
            >
              Clear
            </Link>
          </form>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-600">
          Showing: {filterSummary}
        </p>
      </section>

      <section aria-labelledby="progress-overview-heading" className="space-y-4">
        <Heading2 id="progress-overview-heading" size="md" gutter="none">
          Honest overview
        </Heading2>
        <OverviewCarousel stats={overviewStats} />
        {materials.lastActivityAt && (
          <p className="text-sm text-gray-600">
            Last study-materials practice: {" "}
            <LocalDateTime value={materials.lastActivityAt} />
          </p>
        )}
      </section>

      <section aria-labelledby="next-actions-heading" className="space-y-4">
        <div>
          <Heading2 id="next-actions-heading" size="md" gutter="none">
            Recommended next actions
          </Heading2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Knowledge gaps only appear after at least{" "}
            {progress.topicInsights.minimumEvidenceQuestions} different questions
            in a topic. Recommendations use lifetime evidence and do not change
            when you adjust the report filters.
          </p>
        </div>
        <NextActionsCarousel actions={nextActions} />
      </section>

      <section aria-labelledby="trend-heading" className="space-y-4">
        <div>
          <Heading2 id="trend-heading" size="md" gutter="none">
            Performance over time
          </Heading2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Daily activity for {filterSummary}. The trend shows question volume,
            while accuracy and mock scores remain separate measures.
          </p>
        </div>
        <TrendChart progress={progress} />
      </section>

      {goals.length > 0 && (
        <section aria-labelledby="subject-goals-heading" className="space-y-4">
          <div>
            <Heading2 id="subject-goals-heading" size="md" gutter="none">
              Subject goals
            </Heading2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Each card shows your latest saved mock score for that subject—not
              mastery. Use the direct action to add a new exam-condition result.
            </p>
          </div>
          <SubjectGoalsCarousel goals={goals} />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Coverage and accuracy details">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <Heading2 size="md" gutter="none">
            Lifetime coverage
          </Heading2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            How much of the available WAEC question bank you have tried at
            least once. Filters do not change these figures.
          </p>
          <div className="mt-6 space-y-5">
            <ProgressBar
              label="Topics started"
              percentage={materials.topicsCoveragePercent}
              helperText={`${materials.topicsWithPractice} / ${materials.topicsTotal}`}
              color="primary"
            />
            <ProgressBar
              label="Different questions tried"
              percentage={materials.bankCoveragePercent}
              helperText={`${materials.distinctQuestionsPracticed} / ${materials.questionsInBank}`}
              color="success"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <Heading2 size="md" gutter="none">
            Accuracy by subject
          </Heading2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Submitted practice answers in the current filtered view.
          </p>
          {practice.perSubject.length === 0 ? (
            <p className="mt-6 text-sm text-gray-600">
              No practice answers match these filters.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {practice.perSubject.map((subject) => (
                <ProgressBar
                  key={subject.subjectId}
                  label={subject.subjectName}
                  percentage={pct(subject.accuracyRate)}
                  helperText={`${subject.correct} / ${subject.attempts} correct`}
                  color="secondary"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="mock-results-heading" className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <Heading2 id="mock-results-heading" size="md" gutter="none">
              WAEC mock results
            </Heading2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Graded mock exams for {filterSummary}.
            </p>
          </div>
          <Link
            href="/exams"
            prefetch={false}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl font-semibold text-primary-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
          >
            Open mock exams
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {mocks.exams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
            <p className="text-sm leading-6 text-gray-600">
              No graded mock results match this view. Try a wider date range or
              complete a new mock.
            </p>
          </div>
        ) : (
          <>
            <MockResultsSummary mocks={mocks} />

            <MobileMockResults exams={mocks.exams} />

            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 min-[769px]:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-accent-50 text-gray-700">
                  <tr>
                    <th className="p-4 font-semibold">Exam</th>
                    <th className="p-4 font-semibold">Score</th>
                    <th className="p-4 font-semibold">Time</th>
                    <th className="p-4 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {mocks.exams.map((exam) => (
                    <tr
                      key={exam.instanceId}
                      className="border-t border-gray-200 bg-white"
                    >
                      <td className="p-4 font-medium text-gray-950">
                        {exam.templateTitle}
                      </td>
                      <td className="p-4 text-gray-800 tabular-nums">
                        {exam.score} / {exam.questionCount}
                        {exam.scorePercent == null ? "" : ` (${exam.scorePercent}%)`}
                      </td>
                      <td className="p-4 text-gray-800 tabular-nums">
                        {formatDurationMinutes(exam.durationMinutes)}
                      </td>
                      <td className="whitespace-nowrap p-4 text-gray-600">
                        {exam.submittedAt ? (
                          <LocalDateTime value={exam.submittedAt} />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mockPagination.totalPages > 1 && (
              <nav
                aria-label="Mock exam result pages"
                className="flex flex-col gap-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="tabular-nums">
                  Showing {mockPageStart}–{mockPageEnd} of {mockPagination.total}
                </span>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  {mockPagination.hasPreviousPage ? (
                    <Link
                      href={progressHref(filters, {
                        mockPage: mockPagination.page - 1,
                      })}
                      prefetch={false}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-primary-600 px-4 font-semibold text-primary-700 transition hover:bg-primary-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-gray-200 px-4 font-semibold text-gray-400">
                      Previous
                    </span>
                  )}
                  {mockPagination.hasNextPage ? (
                    <Link
                      href={progressHref(filters, {
                        mockPage: mockPagination.page + 1,
                      })}
                      prefetch={false}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-primary-600 px-4 font-semibold text-primary-700 transition hover:bg-primary-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-gray-200 px-4 font-semibold text-gray-400">
                      Next
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="milestones-heading" className="space-y-4">
        <div>
          <Heading2 id="milestones-heading" size="md" gutter="none">
            Small wins
          </Heading2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Calm markers of work completed—no streak pressure and no claim that
            a milestone means mastery.
          </p>
        </div>
        {milestones.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-3">
            {milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="flex gap-4 rounded-2xl border border-primary-100 bg-primary-50 p-5"
              >
                <StudyBuddyIcon
                  name="success"
                  size={64}
                  className="shrink-0"
                />
                <div>
                  <p className="font-bold text-gray-950">{milestone.title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {milestone.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
            <p className="text-sm leading-6 text-gray-600">
              Your first milestone appears after you try a question, start a
              topic, or complete a mock exam.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-secondary-500 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">AI study support</h2>
          <p className="mt-1 text-sm leading-6 text-white/80">
            {progress.aiActivity.threadsStarted ??
              progress.aiActivity.totalQuestionsAsked}{" "}
            study-support thread
            {(progress.aiActivity.threadsStarted ??
              progress.aiActivity.totalQuestionsAsked) === 1
              ? ""
              : "s"}{" "}
            started so far.
          </p>
        </div>
        <Link
          href="/chat"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 text-sm font-semibold text-secondary-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-secondary-500"
        >
          Open AI chat
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
