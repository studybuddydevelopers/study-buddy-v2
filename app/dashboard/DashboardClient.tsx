"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";
import { getTopicLevel } from "@/lib/dashboard-insights";
import type {
  DashboardClientProps,
  InProgressMock,
  PracticeDraftSummary,
  RecommendedTopic,
  TopicBreakdown,
  WeeklyActivityDay,
} from "./dashboard.types";

const DAILY_QUESTION_GOAL = 5;

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#6C3483] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#57296A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#6C3483] bg-white px-5 py-2.5 text-sm font-semibold text-[#6C3483] transition hover:bg-[#F7F0FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
    >
      {children}
    </Link>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-gray-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function IconTile({
  name,
  title,
  size = 58,
}: {
  name: StudyBuddyIconName;
  title: string;
  size?: number;
}) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#F7F0FA]">
      <StudyBuddyIcon name={name} size={size} title={title} />
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-[#E9E6ED]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(boundedValue)}
    >
      <div
        className="h-full rounded-full bg-[#6C3483] transition-[width] duration-500"
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  );
}

function PlanTask({
  number,
  icon,
  title,
  detail,
  href,
  done,
}: {
  number: number;
  icon: StudyBuddyIconName;
  title: string;
  detail: string;
  href: string;
  done: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-[#C7A6D5] hover:bg-[#FCF9FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
    >
      <IconTile name={done ? "success" : icon} title="" size={50} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">
            {number}. {title}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
              done
                ? "bg-green-50 text-green-700"
                : "bg-[#F7F0FA] text-[#6C3483]"
            }`}
          >
            {done ? "Done" : "Next"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
      </div>
    </Link>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold tabular-nums text-gray-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}

function WeeklyChart({ data }: { data: WeeklyActivityDay[] }) {
  const maxCount = Math.max(...data.map((day) => day.count), 1);

  return (
    <div>
      <div
        className="grid h-36 grid-cols-7 items-end gap-2 sm:gap-4"
        role="img"
        aria-label="Questions answered during the last seven days"
      >
        {data.map((day) => {
          const height = day.count === 0 ? 5 : Math.max((day.count / maxCount) * 100, 14);
          return (
            <div key={day.date} className="flex h-full min-w-0 flex-col justify-end gap-2">
              <span className="text-center text-[11px] font-semibold tabular-nums text-gray-500">
                {day.count || ""}
              </span>
              <div className="flex h-24 items-end rounded-md bg-gray-50 px-1.5">
                <div
                  className={`w-full rounded-t-md ${
                    day.count > 0 ? "bg-[#6C3483]" : "bg-gray-200"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${day.day}: ${day.count} questions, ${day.correct} correct`}
                />
              </div>
              <span className="truncate text-center text-[11px] text-gray-500">
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="sr-only">
        {data.map((day) => (
          <li key={day.date}>
            {day.day}: {day.count} questions answered, {day.correct} correct
          </li>
        ))}
      </ul>
    </div>
  );
}

function readNewestLocalDraft(
  topics: { topicId: string; topicTitle: string; subjectName: string }[]
): PracticeDraftSummary | null {
  let newest: PracticeDraftSummary | null = null;

  for (const topic of topics) {
    try {
      const raw = window.localStorage.getItem(
        `study-buddy:practice-drafts:${topic.topicId}`
      );
      if (!raw) continue;
      const parsed = JSON.parse(raw) as {
        updatedAt?: unknown;
        answers?: unknown;
      };
      if (
        typeof parsed.updatedAt !== "string" ||
        !parsed.answers ||
        typeof parsed.answers !== "object" ||
        Array.isArray(parsed.answers)
      ) {
        continue;
      }
      const savedAnswerCount = Object.values(parsed.answers).filter(
        (answer) => typeof answer === "string" && answer.trim().length > 0
      ).length;
      if (savedAnswerCount === 0 || Number.isNaN(Date.parse(parsed.updatedAt))) {
        continue;
      }
      const candidate: PracticeDraftSummary = {
        ...topic,
        savedAnswerCount,
        updatedAt: parsed.updatedAt,
      };
      if (!newest || Date.parse(candidate.updatedAt) > Date.parse(newest.updatedAt)) {
        newest = candidate;
      }
    } catch {
      // A damaged local draft is ignored; the practice page follows the same rule.
    }
  }

  return newest;
}

function newestPracticeDraft(
  cloudDraft: PracticeDraftSummary | null,
  localDraft: PracticeDraftSummary | null
) {
  if (!cloudDraft) return localDraft;
  if (!localDraft) return cloudDraft;
  return Date.parse(localDraft.updatedAt) > Date.parse(cloudDraft.updatedAt)
    ? localDraft
    : cloudDraft;
}

type ContinueItem =
  | { kind: "mock"; data: InProgressMock }
  | { kind: "practice"; data: PracticeDraftSummary }
  | { kind: "recommendation"; data: RecommendedTopic }
  | null;

function chooseContinueItem(
  mock: InProgressMock | null,
  practice: PracticeDraftSummary | null,
  recommendation: RecommendedTopic | null
): ContinueItem {
  if (mock && practice) {
    return Date.parse(practice.updatedAt) > Date.parse(mock.startedAt)
      ? { kind: "practice", data: practice }
      : { kind: "mock", data: mock };
  }
  if (mock) return { kind: "mock", data: mock };
  if (practice) return { kind: "practice", data: practice };
  if (recommendation) return { kind: "recommendation", data: recommendation };
  return null;
}

function ContinueCard({ item }: { item: ContinueItem }) {
  if (!item) {
    return (
      <section className="rounded-lg bg-[#3B2A56] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E2CFEA]">
          Continue learning
        </p>
        <h2 className="mt-3 max-w-xl text-2xl font-bold sm:text-3xl">
          Your first Study Buddy session starts here.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#F1E8F5]">
          Choose a subject, answer a few real questions, and your dashboard will begin adapting to you.
        </p>
        <div className="mt-6">
          <PrimaryLink href="/materials">Choose a subject</PrimaryLink>
        </div>
      </section>
    );
  }

  if (item.kind === "mock") {
    const progress =
      item.data.questionCount > 0
        ? Math.round((item.data.answeredCount / item.data.questionCount) * 100)
        : 0;
    return (
      <section className="rounded-lg bg-[#3B2A56] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E2CFEA]">
          Continue learning
        </p>
        <p className="mt-5 text-sm font-medium text-[#E2CFEA]">{item.data.subjectName}</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{item.data.title}</h2>
        <p className="mt-3 text-sm text-[#F1E8F5]">
          {item.data.answeredCount} of {item.data.questionCount} questions answered
        </p>
        <div className="mt-3 max-w-xl">
          <ProgressBar value={progress} />
        </div>
        <div className="mt-6">
          <PrimaryLink href={`/exams/${item.data.instanceId}`}>
            Resume mock exam
          </PrimaryLink>
        </div>
      </section>
    );
  }

  if (item.kind === "practice") {
    return (
      <section className="rounded-lg bg-[#3B2A56] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E2CFEA]">
          Continue learning
        </p>
        <p className="mt-5 text-sm font-medium text-[#E2CFEA]">{item.data.subjectName}</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{item.data.topicTitle}</h2>
        <p className="mt-3 text-sm text-[#F1E8F5]">
          {item.data.savedAnswerCount} saved answer{item.data.savedAnswerCount === 1 ? "" : "s"} waiting for you
        </p>
        <div className="mt-6">
          <PrimaryLink href={`/materials/practice/${item.data.topicId}`}>
            Resume practice
          </PrimaryLink>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-[#3B2A56] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E2CFEA]">
        Start learning
      </p>
      <p className="mt-5 text-sm font-medium text-[#E2CFEA]">{item.data.subjectName}</p>
      <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{item.data.topicTitle}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#F1E8F5]">
        Start with a short practice session so Study Buddy can build recommendations from your own work.
      </p>
      <div className="mt-6">
        <PrimaryLink href={`/materials/practice/${item.data.topicId}`}>
          Start practice
        </PrimaryLink>
      </div>
    </section>
  );
}

function recommendationCopy(topic: RecommendedTopic) {
  switch (topic.reason) {
    case "focus":
      return `Based on ${topic.attempted} different questions, a focused session here could strengthen your score.`;
    case "continue":
      return topic.attempted < 5
        ? `You have started this topic. Answer ${5 - topic.attempted} more different question${5 - topic.attempted === 1 ? "" : "s"} to unlock a reliable topic insight.`
        : "Keep this topic fresh with another short practice session.";
    case "explore":
      return "This is a good place to begin building your personalised learning picture.";
  }
}

function FocusTopicCard({ topic }: { topic: TopicBreakdown }) {
  return (
    <Link
      href={`/materials/practice/${topic.topicId}`}
      prefetch={false}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[#C7A6D5] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#6C3483]">{topic.subjectName}</p>
          <h3 className="mt-1 font-bold text-gray-950">{topic.topicTitle}</h3>
        </div>
        <span className="rounded-full bg-[#F7F0FA] px-2.5 py-1 text-xs font-semibold text-[#6C3483]">
          {getTopicLevel(topic)}
        </span>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>{topic.correct} correct</span>
          <span>{topic.accuracyPct}%</span>
        </div>
        <ProgressBar value={topic.accuracyPct} />
      </div>
    </Link>
  );
}

export default function DashboardClient({ me, stats }: DashboardClientProps) {
  const [localDraft, setLocalDraft] = useState<PracticeDraftSummary | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLocalDraft(readNewestLocalDraft(stats?.availableTopics ?? []));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stats?.availableTopics]);

  const firstName = me?.profile?.firstName?.trim() || "Student";
  const lastMock = stats?.lastInProgressMock ?? null;
  const practiceDraft = newestPracticeDraft(stats?.resumePractice ?? null, localDraft);
  const recommendation = stats?.recommendedTopic ?? null;
  const continueItem = chooseContinueItem(lastMock, practiceDraft, recommendation);
  const weekly = stats?.weeklySummary ?? {
    questionsAttempted: 0,
    correctAnswers: 0,
    accuracyPct: null,
    activeDays: 0,
  };
  const today = stats?.todaySummary ?? {
    questionsAttempted: 0,
    mockExamsCompleted: 0,
    aiQuestionsAsked: 0,
  };
  const weeklyActivity = stats?.weeklyActivity ?? [];
  const focusTopics = stats?.focusTopics ?? [];
  const completedPlanTasks =
    Number(today.questionsAttempted >= DAILY_QUESTION_GOAL) +
    Number(today.mockExamsCompleted > 0) +
    Number(today.aiQuestionsAsked > 0);
  const practiceHref = recommendation
    ? `/materials/practice/${recommendation.topicId}`
    : "/materials";
  const mockHref = lastMock ? `/exams/${lastMock.instanceId}` : "/exams";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-0 py-4 pb-24 sm:py-8 lg:pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6C3483]">Your dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Pick up where you stopped and make today&apos;s progress count.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {me?.profile?.gradeLevel ? (
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
              {me.profile.gradeLevel}
            </span>
          ) : null}
          {me?.profile?.examYear ? (
            <span className="rounded-full bg-[#F7F0FA] px-3 py-1.5 text-xs font-semibold text-[#6C3483]">
              WAEC {me.profile.examYear}
            </span>
          ) : null}
          {stats?.streakDays ? (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              {stats.streakDays} day streak
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <ContinueCard item={continueItem} />

        <section className="rounded-lg border border-gray-200 bg-[#FCFCFC] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6C3483]">
                Today&apos;s plan
              </p>
              <h2 className="mt-2 text-xl font-bold text-gray-950">Three small wins</h2>
            </div>
            <span className="rounded-full bg-[#F7F0FA] px-3 py-1.5 text-xs font-bold text-[#6C3483]">
              {completedPlanTasks}/3 done
            </span>
          </div>
          <div className="mt-5 space-y-3">
            <PlanTask
              number={1}
              icon="practice"
              title="Answer 5 questions"
              detail={`${Math.min(today.questionsAttempted, DAILY_QUESTION_GOAL)}/${DAILY_QUESTION_GOAL} answered today`}
              href={practiceHref}
              done={today.questionsAttempted >= DAILY_QUESTION_GOAL}
            />
            <PlanTask
              number={2}
              icon="exams"
              title={lastMock ? "Finish your mock exam" : "Take a timed mock"}
              detail={
                today.mockExamsCompleted > 0
                  ? `${today.mockExamsCompleted} completed today`
                  : lastMock
                    ? `${lastMock.answeredCount}/${lastMock.questionCount} questions answered`
                    : "Practise under exam conditions"
              }
              href={mockHref}
              done={today.mockExamsCompleted > 0}
            />
            <PlanTask
              number={3}
              icon="chat"
              title="Ask Study Buddy"
              detail={
                today.aiQuestionsAsked > 0
                  ? `${today.aiQuestionsAsked} question${today.aiQuestionsAsked === 1 ? "" : "s"} asked today`
                  : "Get help with one difficult question"
              }
              href="/chat"
              done={today.aiQuestionsAsked > 0}
            />
          </div>
        </section>
      </div>

      <section>
        <SectionHeading
          title="This week"
          description="A simple view of the work you have actually completed in the last seven days."
          action={
            <Link
              href="/progress"
              prefetch={false}
              className="shrink-0 text-sm font-semibold text-[#6C3483] hover:underline"
            >
              Full progress
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="grid grid-cols-3 gap-3">
            <Metric value={weekly.questionsAttempted} label="Questions" />
            <Metric
              value={weekly.accuracyPct === null ? "—" : `${weekly.accuracyPct}%`}
              label="Accuracy"
            />
            <Metric value={`${weekly.activeDays}/7`} label="Active days" />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            {weeklyActivity.length === 7 ? (
              <WeeklyChart data={weeklyActivity} />
            ) : (
              <p className="py-12 text-center text-sm text-gray-500">
                Weekly activity is unavailable right now.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <IconTile name="plan" title="Personalised recommendation" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6C3483]">
                Recommended for you
              </p>
              {recommendation ? (
                <>
                  <p className="mt-3 text-sm font-semibold text-gray-500">
                    {recommendation.subjectName}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    {recommendation.topicTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {recommendationCopy(recommendation)}
                  </p>
                  <div className="mt-5">
                    <SecondaryLink href={`/materials/practice/${recommendation.topicId}`}>
                      Practise this topic
                    </SecondaryLink>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-3 text-xl font-bold text-gray-950">
                    Choose your first subject
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Recommendations will appear when practice questions are available.
                  </p>
                  <div className="mt-5">
                    <SecondaryLink href="/materials">Browse materials</SecondaryLink>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Topics to review"
            description="Only shown when there is enough practice evidence."
            action={
              <Link
                href="/progress"
                prefetch={false}
                className="shrink-0 text-sm font-semibold text-[#6C3483] hover:underline"
              >
                View all
              </Link>
            }
          />
          {focusTopics.length > 0 ? (
            <div className="space-y-3">
              {focusTopics.map((topic) => (
                <FocusTopicCard key={topic.topicId} topic={topic} />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 rounded-lg bg-[#F7F0FA] p-4">
              <IconTile name="analytics" title="Learning insights" size={52} />
              <div>
                <h3 className="font-bold text-gray-950">Building your learning picture</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Answer at least five different questions in a topic before Study Buddy marks it for review.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-5 rounded-lg border border-[#D7BFE2] bg-[#F7F0FA] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <IconTile name="chat" title="Study Buddy AI support" />
          <div>
            <h2 className="text-xl font-bold text-gray-950">Stuck on a question?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Ask Study Buddy for a clear explanation, then use practice questions to check what you understand.
            </p>
          </div>
        </div>
        <PrimaryLink href="/chat">Ask Study Buddy</PrimaryLink>
      </section>
    </div>
  );
}
