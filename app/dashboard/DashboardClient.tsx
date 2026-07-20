"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DashboardClientProps } from "./dashboard.types";

const PURPLE = "#6247AA";
const PURPLE_LIGHT = "#EDE9F8";

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

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          domain={[0, max + 1]}
        />
        <Tooltip
          cursor={{ fill: PURPLE_LIGHT }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${PURPLE_LIGHT}` }}
          formatter={(v) => [v ?? 0, "Questions"]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.count > 0 ? PURPLE : "#e5e7eb"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
              Continue Last Session
            </OutlineButton>
          ) : (
            <OutlineButton
              className="opacity-40 cursor-not-allowed pointer-events-none"
            >
              Continue Last Session
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
