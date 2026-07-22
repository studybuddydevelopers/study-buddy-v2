"use client";

import Link from "next/link";
import type { DashboardClientProps } from "./dashboard.types";

const PURPLE = "#6247AA";

// ── Small reusable pieces ────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-800 mb-3">{children}</h2>
  );
}

function OutlineButton({
  href,
  onClick,
  children,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors
    border-[#6247AA] text-[#6247AA] hover:bg-[#EDE9F8] active:scale-95 ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

// ── Topic progress bar ───────────────────────────────────────────────────────

function TopicBar({
  title,
  correct,
  attempted,
  accuracyPct,
}: {
  title: string;
  correct: number;
  attempted: number;
  accuracyPct: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-700 font-medium truncate max-w-[70%]">{title}</span>
        <span className="text-gray-500 tabular-nums shrink-0">
          {correct}/{attempted} correct
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${accuracyPct}%`,
            backgroundColor: accuracyPct >= 70 ? "#22c55e" : accuracyPct >= 40 ? PURPLE : "#f97316",
          }}
        />
      </div>
    </div>
  );
}

// ── Weekly bar chart ─────────────────────────────────────────────────────────

function WeeklyChart({
  data,
}: {
  data: { day: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const axisMax = max + 1;
  const midTick = Math.floor(axisMax / 2);
  const ticks = [axisMax, midTick, 0];

  return (
    <div
      className="grid h-[120px] grid-cols-[28px_1fr] grid-rows-[1fr_20px] gap-x-2"
      role="img"
      aria-label="Weekly activity bar chart"
    >
      <div className="relative row-start-1 text-[10px] leading-none text-gray-400">
        {ticks.map((tick, index) => (
          <span
            key={`${tick}-${index}`}
            className="absolute right-1 -translate-y-1/2 tabular-nums"
            style={{ top: `${index * 50}%` }}
          >
            {tick}
          </span>
        ))}
      </div>
      <div className="row-start-1 grid min-h-0 grid-cols-7 items-end gap-2">
        {data.map((entry) => {
          const heightPct =
            entry.count > 0 ? Math.max((entry.count / axisMax) * 100, 8) : 3;

          return (
            <div
              key={entry.day}
              className="group relative flex h-full min-w-0 items-end justify-center rounded-lg px-2 py-0 transition-colors hover:bg-[rgba(98,71,170,0.16)] focus-within:bg-[rgba(98,71,170,0.16)]"
              aria-label={`${entry.day}: ${entry.count} questions attempted`}
              title={`${entry.count} questions`}
            >
              <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden -translate-x-12  -translate-y-2/3 whitespace-nowrap rounded-lg border border-primary-100 bg-white px-2 py-4 text-xs font-medium text-gray-700 shadow-sm group-hover:block group-focus-within:block">
                <span>{entry.day} </span>
                <p className="py-1"></p>
                <span>Questions: {entry.count}</span>
              </span>
              <div
                className="w-5/6 h-10 rounded-t transition-colors"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: entry.count > 0 ? PURPLE : "#e5e7eb",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="col-start-2 row-start-2 grid grid-cols-7 gap-2 pt-1">
        {data.map((entry) => (
          <span
            key={entry.day}
            className="truncate text-center text-[11px] leading-4 text-gray-400"
          >
            {entry.day}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient({ me, stats }: DashboardClientProps) {
  const firstName = me?.profile?.firstName ?? "Student";
  const topicBreakdown = stats?.topicBreakdown ?? [];
  const weeklyActivity = stats?.weeklyActivity ?? [];
  const streakDays = stats?.streakDays ?? 0;
  const weakestTopic = stats?.weakestTopic ?? null;
  const lastMock = stats?.lastInProgressMock ?? null;
  const hasAnyData = topicBreakdown.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}!
        </h1>
        {streakDays > 0 && (
          <p className="mt-1 text-sm text-gray-500">
            🔥 {streakDays} day{streakDays !== 1 ? "s" : ""} streak — keep it up!
          </p>
        )}
      </div>

      {/* WHAT TO DO NEXT */}
      <div
        className="rounded-2xl p-5 border-2 border-[#6247AA] bg-[#EDE9F8]"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6247AA] mb-2">
          What to do next
        </p>
        {weakestTopic ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-gray-900 font-medium">
              You&apos;re struggling with{" "}
              <span className="font-bold">{weakestTopic.topicTitle}</span>.{" "}
              <span className="text-gray-600 text-sm">
                ({weakestTopic.correct}/{weakestTopic.attempted} correct)
              </span>
            </p>
            <Link
              href={`/materials/practice/${weakestTopic.topicId}`}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-[#6247AA] text-white text-sm font-semibold hover:bg-[#513D8F] active:scale-95 transition-all shrink-0"
            >
              Practice now →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-gray-700">Start practising to unlock your personalised study plan.</p>
            <Link
              href="/materials"
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-[#6247AA] text-white text-sm font-semibold hover:bg-[#513D8F] active:scale-95 transition-all shrink-0"
            >
              Start your first session →
            </Link>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <SectionHeading>Quick Actions</SectionHeading>
        <div className="flex flex-wrap gap-3">
          <OutlineButton href="/materials">Practice Questions</OutlineButton>
          <OutlineButton href="/exams">Mock Exam</OutlineButton>
          {lastMock ? (
            <OutlineButton href={`/exams/${lastMock.instanceId}`}>
              Continue Last Mock Exam Session
            </OutlineButton>
          ) : (
            <OutlineButton
              className="opacity-40 cursor-not-allowed pointer-events-none"
            >
              Continue Last Mock Exam Session
            </OutlineButton>
          )}
        </div>
      </div>

      {/* PROGRESS BY TOPIC */}
      <div>
        <SectionHeading>Progress by Topic</SectionHeading>
        {hasAnyData ? (
          <div className="space-y-4">
            {topicBreakdown.map((t) => (
              <TopicBar
                key={t.topicId}
                title={t.topicTitle}
                correct={t.correct}
                attempted={t.attempted}
                accuracyPct={t.accuracyPct}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-8 text-center">
            <p className="text-gray-500 text-sm">
              No practice sessions yet. Complete some questions to see your topic breakdown.
            </p>
          </div>
        )}
      </div>

      {/* WEEKLY ACTIVITY */}
      <div>
        <SectionHeading>Weekly Activity</SectionHeading>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-2 shadow-sm">
          {weeklyActivity.every((d) => d.count === 0) ? (
            <div className="py-6 text-center">
              <p className="text-gray-400 text-sm">No activity this week yet.</p>
            </div>
          ) : (
            <WeeklyChart data={weeklyActivity} />
          )}
          <p className="text-xs text-gray-400 text-right mt-1 pr-1">questions attempted per day</p>
        </div>
      </div>

    </div>
  );
}
