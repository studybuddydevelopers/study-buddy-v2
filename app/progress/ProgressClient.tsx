"use client";

import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
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

function StatCard({
  title,
  value,
  detail,
  scope,
}: {
  title: string;
  value: string;
  detail: string;
  scope: string;
}) {
  return (
    <article className="flex min-h-44 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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

interface NextAction {
  id: string;
  icon: StudyBuddyIconName;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  linkLabel: string;
}

function TrendChart({ progress }: { progress: ProgressFullReport }) {
  const maxAttempts = Math.max(
    1,
    ...progress.trend.map((point) => point.questionsAttempted)
  );
  const activeBuckets = progress.trend.filter(
    (point) => point.questionsAttempted > 0 || point.mockExamsCompleted > 0
  ).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-950">Practice activity</h3>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {progress.pastQuestions.totalAttempts} question attempts across{" "}
            {activeBuckets} active time group{activeBuckets === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>
            <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-primary-600" />
            Questions
          </span>
          <span>
            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-secondary-500" />
            Mock completed
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <ul
          className="grid min-w-[640px] items-end gap-2"
          style={{
            gridTemplateColumns: `repeat(${progress.trend.length}, minmax(34px, 1fr))`,
          }}
          aria-label={`Practice activity for ${progress.filters.rangeLabel.toLowerCase()}`}
        >
          {progress.trend.map((point) => {
            const height =
              point.questionsAttempted > 0
                ? Math.max(10, (point.questionsAttempted / maxAttempts) * 100)
                : 2;
            const dateDescription =
              point.startDate === point.endDate
                ? point.startDate
                : `${point.startDate} to ${point.endDate}`;
            return (
              <li
                key={point.startDate}
                className="flex min-w-0 flex-col items-center"
                aria-label={`${dateDescription}: ${point.questionsAttempted} practice question attempts, ${point.correctAnswers} correct, ${point.mockExamsCompleted} mock exams completed`}
              >
                <span className="mb-1 text-xs font-semibold text-gray-700 tabular-nums">
                  {point.questionsAttempted}
                </span>
                <div className="relative flex h-36 w-full items-end justify-center rounded-lg bg-gray-50 px-1">
                  <span
                    className={`w-full max-w-8 rounded-t-md ${
                      point.questionsAttempted > 0
                        ? "bg-primary-600"
                        : "bg-gray-200"
                    }`}
                    style={{ height: `${height}%` }}
                    aria-hidden="true"
                  />
                  {point.mockExamsCompleted > 0 && (
                    <span
                      className="absolute right-0.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-secondary-500"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span className="mt-2 text-center text-xs leading-4 text-gray-600">
                  {point.label}
                </span>
                <span className="mt-1 text-center text-xs font-semibold leading-4 text-gray-800">
                  {point.accuracyPct == null
                    ? "No answers"
                    : `${point.accuracyPct}% correct`}
                </span>
                {point.mockExamsCompleted > 0 && (
                  <span className="mt-1 text-center text-xs leading-4 text-secondary-700">
                    {point.mockExamsCompleted} mock
                    {point.mockExamsCompleted === 1 ? "" : "s"}
                    {point.averageMockScorePct == null
                      ? ""
                      : ` · ${point.averageMockScorePct}%`}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">
        Longer ranges group nearby days to keep the trend readable. Mock scores
        remain separate from question volume.
      </p>
    </div>
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
    <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <div className="flex items-center gap-2">
          <Heading1 gutter="none">Your progress</Heading1>
          <div className="group/help relative inline-flex">
            <span
              role="img"
              aria-label={PROGRESS_HELP_TEXT}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-primary-700 shadow-sm transition group-hover/help:border-primary-300 group-hover/help:bg-primary-50"
            >
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </span>
            <div
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-medium leading-relaxed text-gray-700 shadow-lg group-hover/help:block"
            >
              {PROGRESS_HELP_TEXT}
            </div>
          </div>
        </div>
        <Paragraph variant="muted" className="mt-3 max-w-3xl">
          See what you have covered, how accurately you practise, and how you
          perform in mock conditions—without treating activity as mastery.
        </Paragraph>
      </header>

      <section aria-labelledby="progress-filters-heading">
        <div className="rounded-2xl border border-gray-200 bg-accent-50 p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2
                id="progress-filters-heading"
                className="text-lg font-bold text-gray-950"
              >
                Choose what to review
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Date and topic filters change activity and accuracy. Subject
                also filters mock results. Lifetime coverage stays unchanged.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Date range">
              {PROGRESS_RANGE_OPTIONS.map((option) => {
                const active = option.value === filters.range;
                return (
                  <Link
                    key={option.value}
                    href={progressHref(filters, { range: option.value })}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 ${
                      active
                        ? "border-primary-700 bg-primary-700 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <form action="/progress" method="get" className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <input type="hidden" name="range" value={filters.range} />
            <label className="grid gap-1.5 text-sm font-semibold text-gray-800">
              Subject
              <select
                name="subject"
                defaultValue={filters.subjectId ?? ""}
                className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base font-normal text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="">All subjects</option>
                {filters.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-gray-800">
              Practice topic
              <select
                name="topic"
                defaultValue={filters.topicId ?? ""}
                className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base font-normal text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
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
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
            >
              Apply filters
            </button>
            <Link
              href={`/progress?range=${filters.range}`}
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-primary-300 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
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
        <Heading2 id="progress-overview-heading" gutter="none">
          Honest overview
        </Heading2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Question-bank coverage"
            value={
              materials.questionsInBank > 0
                ? `${materials.bankCoveragePercent}%`
                : "—"
            }
            detail={
              materials.questionsInBank > 0
                ? `${materials.distinctQuestionsPracticed} of ${materials.questionsInBank} different questions tried`
                : "No question bank is configured yet"
            }
            scope="All time"
          />
          <StatCard
            title="Practice accuracy"
            value={practiceAccuracyPct == null ? "—" : `${practiceAccuracyPct}%`}
            detail={
              practice.totalAttempts > 0
                ? `${practice.correctAttempts} correct from ${practice.totalAttempts} submitted answers`
                : "No practice answers in this view"
            }
            scope={filters.rangeLabel}
          />
          <StatCard
            title="Mock performance"
            value={mocks.count > 0 ? `${mocks.averageScorePercent}%` : "—"}
            detail={
              mocks.count > 0
                ? `Average across ${mocks.count} completed mock${mocks.count === 1 ? "" : "s"}`
                : "No graded mock exams in this view"
            }
            scope={filters.rangeLabel}
          />
          <StatCard
            title="Practice volume"
            value={String(practice.totalAttempts)}
            detail={`Question attempt${practice.totalAttempts === 1 ? "" : "s"}; shown separately from accuracy`}
            scope={filters.rangeLabel}
          />
        </div>
        {materials.lastActivityAt && (
          <p className="text-sm text-gray-600">
            Last study-materials practice: {" "}
            <LocalDateTime value={materials.lastActivityAt} />
          </p>
        )}
      </section>

      <section aria-labelledby="next-actions-heading" className="space-y-4">
        <div>
          <Heading2 id="next-actions-heading" gutter="none">
            Recommended next actions
          </Heading2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Knowledge gaps only appear after at least{" "}
            {progress.topicInsights.minimumEvidenceQuestions} different questions
            in a topic. Recommendations use lifetime evidence and do not change
            when you adjust the report filters.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {nextActions.map((action) => (
            <article
              key={action.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:gap-5"
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
      </section>

      <section aria-labelledby="trend-heading" className="space-y-4">
        <div>
          <Heading2 id="trend-heading" gutter="none">
            Performance over time
          </Heading2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Activity for {filterSummary}. Bar height shows question volume, not
            how well you performed.
          </p>
        </div>
        <TrendChart progress={progress} />
      </section>

      {goals.length > 0 && (
        <section aria-labelledby="subject-goals-heading" className="space-y-4">
          <div>
            <Heading2 id="subject-goals-heading" gutter="none">
              Subject goals
            </Heading2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Each card shows your latest saved mock score for that subject—not
              mastery. Use the direct action to add a new exam-condition result.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => (
              <article
                key={goal.subjectId}
                className="rounded-2xl border-2 border-primary-100 bg-primary-50 p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
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
                  <StudyBuddyIcon name="progress" size={72} />
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
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Coverage and accuracy details">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <Heading2 gutter="none">Lifetime coverage</Heading2>
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
          <Heading2 gutter="none">Accuracy by subject</Heading2>
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
            <Heading2 id="mock-results-heading" gutter="none">
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
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-accent-50 p-4 text-sm text-gray-700">
              <span>
                <strong className="text-gray-950">Average score:</strong>{" "}
                {mocks.averageScorePercent}%
              </span>
              <span>
                <strong className="text-gray-950">Average time:</strong>{" "}
                {formatDurationMinutes(mocks.averageDurationMinutes)}
              </span>
              <span>
                <strong className="text-gray-950">Completed:</strong>{" "}
                {mocks.count}
              </span>
            </div>

            <ul className="space-y-3 md:hidden" aria-label="Mock exam results">
              {mocks.exams.map((exam) => (
                <li
                  key={exam.instanceId}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-bold text-gray-950">
                    {exam.templateTitle}
                  </h3>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">Score</dt>
                      <dd className="mt-1 font-semibold text-gray-900 tabular-nums">
                        {exam.score} / {exam.questionCount}
                        {exam.scorePercent == null ? "" : ` (${exam.scorePercent}%)`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Time</dt>
                      <dd className="mt-1 font-semibold text-gray-900 tabular-nums">
                        {formatDurationMinutes(exam.durationMinutes)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-gray-500">Submitted</dt>
                      <dd className="mt-1 font-semibold text-gray-900">
                        {exam.submittedAt ? (
                          <LocalDateTime value={exam.submittedAt} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 md:block">
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
                <div className="flex gap-2">
                  {mockPagination.hasPreviousPage ? (
                    <Link
                      href={progressHref(filters, {
                        mockPage: mockPagination.page - 1,
                      })}
                      prefetch={false}
                      className="inline-flex min-h-11 items-center rounded-xl border-2 border-primary-600 px-4 font-semibold text-primary-700 transition hover:bg-primary-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center rounded-xl border-2 border-gray-200 px-4 font-semibold text-gray-400">
                      Previous
                    </span>
                  )}
                  {mockPagination.hasNextPage ? (
                    <Link
                      href={progressHref(filters, {
                        mockPage: mockPagination.page + 1,
                      })}
                      prefetch={false}
                      className="inline-flex min-h-11 items-center rounded-xl border-2 border-primary-600 px-4 font-semibold text-primary-700 transition hover:bg-primary-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center rounded-xl border-2 border-gray-200 px-4 font-semibold text-gray-400">
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
          <Heading2 id="milestones-heading" gutter="none">
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
