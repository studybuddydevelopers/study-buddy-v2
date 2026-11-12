import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProgressFullReport, ProgressRange } from "@/app/dashboard/dashboard.types";
import ProgressClient from "./ProgressClient";

function emptyReport(range: ProgressRange = "7d"): ProgressFullReport {
  const days = Number.parseInt(range, 10);
  const trend = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10, 1 + index)).toISOString().slice(0, 10);
    return { startDate: date, endDate: date, label: date, questionsAttempted: 0, correctAnswers: 0, accuracyPct: null, mockExamsCompleted: 0, averageMockScorePct: null };
  });
  return {
    filters: { range, rangeLabel: `Last ${days} days`, rangeStart: trend[0].startDate, rangeEnd: trend[days - 1].endDate, subjectId: null, topicId: null, subjects: [], topics: [] },
    subjects: [],
    studyMaterials: { topicsTotal: 10, topicsWithPractice: 0, topicsCoveragePercent: 0, questionsInBank: 100, distinctQuestionsPracticed: 0, bankCoveragePercent: 0, lastActivityAt: null },
    pastQuestions: { totalAttempts: 0, correctAttempts: 0, accuracyRate: 0, perSubject: [] },
    mockExams: { count: 0, allTimeCount: 0, inProgressCount: 0, totalScore: 0, averageScore: 0, averageScorePercent: 0, averageDurationMinutes: null, exams: [], pagination: { page: 1, pageSize: 5, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false } },
    trend,
    topicInsights: { focusTopics: [], recommendedTopic: null, minimumEvidenceQuestions: 5 },
    aiActivity: { totalQuestionsAsked: 0, threadsStarted: 0 },
  };
}

function reportWithResults(): ProgressFullReport {
  const report = emptyReport();
  report.subjects = [
    { subjectId: "maths", subjectName: "Mathematics", progressPercentage: 60, updatedAt: "2026-11-02T12:00:00Z" },
    { subjectId: "english", subjectName: "English", progressPercentage: 70, updatedAt: "2026-11-02T12:00:00Z" },
  ];
  report.pastQuestions = { totalAttempts: 3, correctAttempts: 2, accuracyRate: 2 / 3, perSubject: [] };
  report.trend[1] = { ...report.trend[1], questionsAttempted: 3, correctAnswers: 2, accuracyPct: 67, mockExamsCompleted: 1, averageMockScorePct: 60 };
  report.mockExams = {
    ...report.mockExams, count: 1, allTimeCount: 1, totalScore: 30, averageScore: 30, averageScorePercent: 60, averageDurationMinutes: 75,
    exams: [{ instanceId: "synthetic-exam", subjectId: "maths", templateTitle: "Mathematics practice paper", score: 30, questionCount: 50, scorePercent: 60, graded: true, startedAt: "2026-11-02T10:45:00Z", submittedAt: "2026-11-02T12:00:00Z", durationMinutes: 75 }],
    pagination: { ...report.mockExams.pagination, total: 1 },
  };
  return report;
}

// Real component markup with synthetic data. These checks do not simulate
// swiping, hover/focus, screen readers or the chart's browser layout.
describe("Progress accessible presentation", () => {
  it("distinguishes an unavailable report from an empty report", () => {
    const html = renderToStaticMarkup(<ProgressClient progress={null} />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("load your stats");
    expect(html).not.toContain("0 question attempts");
    expect(html).not.toContain("No activity in this period");
    expect(html).not.toContain("<main");
  });

  it("uses one primary heading and a second-level filter heading without adding a main", () => {
    const html = renderToStaticMarkup(<ProgressClient progress={emptyReport()} />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toMatch(/<h2\b[^>]*id="progress-filters-heading"[^>]*>Choose what to review<\/h2>/);
    expect(html).not.toContain("<main");
  });

  it("connects the help control to its explanatory tooltip", () => {
    const html = renderToStaticMarkup(<ProgressClient progress={emptyReport()} />);
    const help = html.match(/<button\b[^>]*aria-label="About progress measures"[^>]*>/)?.[0];
    expect(help).toContain('type="button"');
    expect(help).toContain('aria-describedby="progress-help"');
    expect(html).toMatch(/<div\b[^>]*id="progress-help"[^>]*role="tooltip"/);
    expect(html).toContain("none of them alone proves mastery");
  });

  it.each(["7d", "30d", "90d"] as const)("preserves every daily record in the %s data alternative", (range) => {
    const report = emptyReport(range);
    const html = renderToStaticMarkup(<ProgressClient progress={report} />);
    const disclosure = html.match(/<details\b[^>]*>[\s\S]*?<\/details>/)?.[0] ?? "";
    expect(disclosure).toContain("View daily activity data</summary>");
    expect(disclosure).toContain('role="region" aria-label="Daily activity data" tabindex="0"');
    expect(disclosure).not.toContain("sr-only");
    expect(disclosure.match(/<li\b/g)).toHaveLength(Number.parseInt(range, 10));
    expect(disclosure).toContain("0 questions attempted, 0 correct, 0 mock exams completed.");
    expect(html).toContain("No activity in this period");
    expect(html).toContain("0 question attempts across 0 active days.");
    expect(html).not.toContain("active time groups");
  });

  it("renders actual daily counts and navy marker copy when activity exists", () => {
    const html = renderToStaticMarkup(<ProgressClient progress={reportWithResults()} />);
    expect(html).toContain('aria-label="Daily practice activity for last 7 days"');
    expect(html).toContain("2 Nov: 3 questions attempted, 2 correct, 1 mock exams completed.");
    expect(html).toContain("3 question attempts across 1 active day.");
    expect(html).toContain("Navy markers show days");
    expect(html).not.toContain("Gold markers");
    expect(html).not.toContain("No activity in this period");
  });

  it("gives all three carousel scrollers distinct names and keyboard stops", () => {
    const html = renderToStaticMarkup(<ProgressClient progress={reportWithResults()} />);
    for (const label of ["Honest overview statistics", "Recommended next action cards", "Subject goal cards"]) {
      const scroller = html.match(new RegExp(`<div\\b[^>]*aria-label="${label}"[^>]*>`))?.[0];
      expect(scroller).toContain('role="region"');
      expect(scroller).toContain('tabindex="0"');
    }
    const names = [
      ...[...html.matchAll(/<section\b[^>]*aria-label="([^"]+)"/g)].map((match) => match[1]),
      ...[...html.matchAll(/<section\b[^>]*aria-labelledby="([^"]+)"/g)].map((match) => {
        return html.match(new RegExp(`<h[1-6][^>]*id="${match[1]}"[^>]*>([^<]+)</h[1-6]>`))?.[1];
      }),
      ...[...html.matchAll(/<div\b[^>]*aria-label="([^"]+)"[^>]*role="region"/g)].map((match) => match[1]),
    ];
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("names carousel dots, exposes the initial selection and announces the position", () => {
    const html = renderToStaticMarkup(<ProgressClient progress={reportWithResults()} />);
    for (const [label, count] of [["overview card", 4], ["recommendation", 2], ["subject goal", 2]] as const) {
      const dots = html.match(new RegExp(`<button\\b[^>]*aria-label="Show ${label} [^"]+"[^>]*>`, "g")) ?? [];
      expect(dots).toHaveLength(count);
      dots.forEach((dot) => expect(dot).toContain('type="button"'));
      expect(dots.filter((dot) => dot.includes('aria-current="true"'))).toHaveLength(1);
      expect(dots[0]).toContain('aria-current="true"');
      expect(html).toContain(`aria-live="polite">Showing ${label} 1 of ${count}`);
    }
  });

  it("does not create redundant subject-goal dots for a single goal", () => {
    const report = reportWithResults();
    report.subjects = report.subjects.slice(0, 1);
    const html = renderToStaticMarkup(<ProgressClient progress={report} />);
    expect(html).toContain('aria-label="Subject goal cards"');
    expect(html).not.toContain('aria-label="Show subject goal');
  });

  it("names date links and retains subject/topic context when changing the range", () => {
    const report = emptyReport("30d");
    report.filters.subjectId = "maths";
    report.filters.topicId = "sets";
    const html = renderToStaticMarkup(<ProgressClient progress={report} />);
    const dateLinks = html.match(/<a\b[^>]*aria-label="Last (?:7|30|90) days"[^>]*>/g) ?? [];
    expect(dateLinks).toHaveLength(3);
    for (const [index, range] of ["7d", "30d", "90d"].entries()) {
      expect(dateLinks[index]).toContain(`href="/progress?range=${range}&amp;subject=maths&amp;topic=sets"`);
      expect(dateLinks[index].includes('aria-current="page"')).toBe(range === "30d");
    }
    expect(html).toContain('aria-label="Date range"');
  });

  it("provides a named mock-results list and a captioned table with scoped columns", () => {
    const html = renderToStaticMarkup(<ProgressClient progress={reportWithResults()} />);
    expect(html).toMatch(/<ol\b[^>]*aria-label="Mock exam results"/);
    expect(html).toContain('<caption class="sr-only">WAEC mock exam results</caption>');
    const headers = html.match(/<th\b[^>]*>[^<]*<\/th>/g) ?? [];
    expect(headers).toHaveLength(4);
    headers.forEach((header) => expect(header).toContain('scope="col"'));
    expect(html).toContain('href="/exams/synthetic-exam"');
  });
});
