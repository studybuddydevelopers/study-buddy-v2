"use client";

import Link from "next/link";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import ProgressBar from "@/components/ProgressBar";
import Button from "@/components/Button";
import type { ProgressFullReport } from "@/app/dashboard/dashboard.types";

function formatDurationMinutes(m: number | null | undefined): string {
  if (m == null || m <= 0) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min ? `${h}h ${min}m` : `${h}h`;
}

function pct(rate: number): number {
  return Math.round(Math.max(0, Math.min(1, rate)) * 100);
}

function StatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border border-accent-200 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
        {title}
      </p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm text-gray-600">{detail}</p>
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
      <div className="w-[90vw] max-w-4xl mx-auto py-10">
        <Heading1 gutter="sm">Progress</Heading1>
        <Paragraph variant="muted">
          We couldn&apos;t load your stats. Refresh the page or sign in again.
        </Paragraph>
      </div>
    );
  }

  const sm = progress.studyMaterials;
  const pq = progress.pastQuestions;
  const mocks = progress.mockExams;
  const goals = progress.subjects;

  const practiceAccuracyPct =
    pq.totalAttempts > 0 ? pct(pq.accuracyRate) : null;

  return (
    <div className="w-[90vw] max-w-4xl mx-auto py-10 space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Heading1 gutter="sm">Your progress</Heading1>
          <Paragraph variant="superMuted" className="max-w-2xl">
            Based on study materials practice, graded mock exams, and every
            past question you submit. Numbers update as you work.
          </Paragraph>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/materials">
            <Button variant="outline" size="sm">
              Study materials
            </Button>
          </Link>
          <Link href="/exams">
            <Button variant="primary" size="sm">
              Mock exams
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Study materials (bank)"
          value={
            sm.questionsInBank > 0
              ? `${sm.bankCoveragePercent}%`
              : sm.topicsTotal > 0
                ? `${sm.topicsCoveragePercent}% topics`
                : "—"
          }
          detail={
            sm.questionsInBank > 0
              ? `${sm.distinctQuestionsPracticed} of ${sm.questionsInBank} questions · ${sm.topicsWithPractice}/${sm.topicsTotal} topics`
              : sm.topicsTotal > 0
                ? `${sm.topicsWithPractice} of ${sm.topicsTotal} topics touched`
                : "No topic bank configured yet"
          }
        />
        <StatCard
          title="Mock exams (avg score)"
          value={
            mocks.count > 0 ? `${mocks.averageScorePercent}%` : "—"
          }
          detail={
            mocks.count > 0
              ? `${mocks.count} completed${
                  mocks.inProgressCount
                    ? ` · ${mocks.inProgressCount} in progress`
                    : ""
                }${
                  mocks.averageDurationMinutes != null
                    ? ` · ~${formatDurationMinutes(mocks.averageDurationMinutes)} each`
                    : ""
                }`
              : mocks.inProgressCount > 0
                ? `${mocks.inProgressCount} exam in progress`
                : "Finish a mock to see scores"
          }
        />
        <StatCard
          title="Practice accuracy"
          value={practiceAccuracyPct != null ? `${practiceAccuracyPct}%` : "—"}
          detail={
            pq.totalAttempts > 0
              ? `${pq.correctAttempts} correct of ${pq.totalAttempts} attempts`
              : "No past question attempts yet"
          }
        />
      </div>

      {sm.lastActivityAt && (
        <Paragraph variant="muted" className="text-sm -mt-6">
          Last study-materials practice:{" "}
          {new Date(sm.lastActivityAt).toLocaleString()}
        </Paragraph>
      )}

      <section className="space-y-4">
        <Heading2 gutter="sm">Study materials coverage</Heading2>
        <Paragraph variant="muted" className="text-sm max-w-2xl">
          Topics and questions are limited to Math, English Reading, and English
          Writing. Each percentage is how much of the bank you have tried at
          least once.
        </Paragraph>
        <div className="space-y-5 max-w-xl">
          <ProgressBar
            label="Topics with any practice"
            percentage={sm.topicsCoveragePercent}
            helperText={`${sm.topicsWithPractice} / ${sm.topicsTotal} topics`}
            color="primary"
          />
          <ProgressBar
            label="Question bank touched"
            percentage={sm.bankCoveragePercent}
            helperText={`${sm.distinctQuestionsPracticed} / ${sm.questionsInBank} questions`}
            color="success"
          />
        </div>
      </section>

      <section className="space-y-4">
        <Heading2 gutter="sm">Mock exams</Heading2>
        {mocks.exams.length === 0 ? (
          <Paragraph variant="muted">
            No graded mocks yet.{" "}
            <Link href="/exams" className="text-primary-600 underline">
              Start one
            </Link>{" "}
            — when you submit, we record score and time from start to submit.
          </Paragraph>
        ) : (
          <>
            <div className="flex flex-wrap gap-6 text-sm text-gray-700">
              <span>
                <strong className="text-gray-900">Average score:</strong>{" "}
                {mocks.averageScorePercent}%
              </span>
              <span>
                <strong className="text-gray-900">Typical time:</strong>{" "}
                {formatDurationMinutes(mocks.averageDurationMinutes)}
              </span>
            </div>
            <div className="overflow-x-auto border border-accent-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-accent-50 text-gray-700">
                  <tr>
                    <th className="p-3 font-semibold">Exam</th>
                    <th className="p-3 font-semibold">Score</th>
                    <th className="p-3 font-semibold">Time</th>
                    <th className="p-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {mocks.exams.map((e) => (
                    <tr
                      key={e.instanceId}
                      className="border-t border-accent-100 bg-white"
                    >
                      <td className="p-3 font-medium text-gray-900">
                        {e.templateTitle}
                      </td>
                      <td className="p-3 tabular-nums">
                        {e.score} / {e.questionCount}
                        {e.scorePercent != null ? (
                          <span className="text-gray-500 ml-1">
                            ({e.scorePercent}%)
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 tabular-nums">
                        {formatDurationMinutes(e.durationMinutes)}
                      </td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {e.submittedAt
                          ? new Date(e.submittedAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <Heading2 gutter="sm">Practice by subject</Heading2>
        <Paragraph variant="muted" className="text-sm max-w-2xl">
          All past question attempts (including outside study materials).
        </Paragraph>
        {pq.perSubject.length === 0 ? (
          <Paragraph variant="muted">No attempts yet.</Paragraph>
        ) : (
          <div className="space-y-4 max-w-xl">
            {pq.perSubject.map((s) => (
              <ProgressBar
                key={s.subjectId}
                label={s.subjectName}
                percentage={pct(s.accuracyRate)}
                helperText={`${s.correct} / ${s.attempts} correct`}
                color="secondary"
              />
            ))}
          </div>
        )}
      </section>

      {goals.length > 0 && (
        <section className="space-y-4">
          <Heading2 gutter="sm">Subject goals</Heading2>
          <Paragraph variant="muted" className="text-sm max-w-2xl">
            These bars sync when you complete a mock exam; you can treat them
            as high-level targets alongside the stats above.
          </Paragraph>
          <div className="space-y-4 max-w-xl">
            {goals.map((g) => (
              <ProgressBar
                key={g.subjectId}
                label={g.subjectName}
                percentage={g.progressPercentage}
                showPercentage
                color="warning"
              />
            ))}
          </div>
        </section>
      )}

      <section className="border border-accent-200 rounded-xl p-4 bg-accent-50">
        <Paragraph variant="muted" gutter="none" className="text-sm">
          <strong className="text-gray-800">AI Q&amp;A:</strong>{" "}
          {progress.aiActivity.totalQuestionsAsked} threads started.{" "}
          <Link href="/chat" className="text-primary-600 underline">
            Open chat
          </Link>
        </Paragraph>
      </section>
    </div>
  );
}
