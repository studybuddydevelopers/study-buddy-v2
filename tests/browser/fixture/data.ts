import type { ProgressFullReport } from "@/app/dashboard/dashboard.types";

export const chat = {
  id: "synthetic-chat", title: "Synthetic study chat", subjectId: null, topicId: null,
  createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-01T12:00:00Z", deletedAt: null, isStarted: false,
};

export function progressReport(range: string | null): ProgressFullReport {
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
  const trend = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10, 1 + index)).toISOString().slice(0, 10);
    return { startDate: date, endDate: date, label: date, questionsAttempted: index === 1 ? 3 : 0, correctAnswers: index === 1 ? 2 : 0, accuracyPct: index === 1 ? 67 : null, mockExamsCompleted: index === 1 ? 1 : 0, averageMockScorePct: index === 1 ? 60 : null };
  });
  return {
    filters: { range: days === 90 ? "90d" : days === 30 ? "30d" : "7d", rangeLabel: `Last ${days} days`, rangeStart: trend[0].startDate, rangeEnd: trend[days - 1].endDate, subjectId: null, topicId: null, subjects: [], topics: [] },
    subjects: [
      { subjectId: "maths", subjectName: "Mathematics", progressPercentage: 60, updatedAt: "2026-11-02T12:00:00Z" },
      { subjectId: "english", subjectName: "English", progressPercentage: 70, updatedAt: "2026-11-02T12:00:00Z" },
    ],
    studyMaterials: { topicsTotal: 10, topicsWithPractice: 1, topicsCoveragePercent: 10, questionsInBank: 100, distinctQuestionsPracticed: 3, bankCoveragePercent: 3, lastActivityAt: "2026-11-02T12:00:00Z" },
    pastQuestions: { totalAttempts: 3, correctAttempts: 2, accuracyRate: 2 / 3, perSubject: [] },
    mockExams: {
      count: 1, allTimeCount: 1, inProgressCount: 0, totalScore: 30, averageScore: 30, averageScorePercent: 60, averageDurationMinutes: 75,
      exams: [{ instanceId: "synthetic-exam", subjectId: "maths", templateTitle: "Mathematics practice paper", score: 30, questionCount: 50, scorePercent: 60, graded: true, startedAt: "2026-11-02T10:45:00Z", submittedAt: "2026-11-02T12:00:00Z", durationMinutes: 75 }],
      pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    trend,
    topicInsights: { focusTopics: [], recommendedTopic: null, minimumEvidenceQuestions: 5 },
    aiActivity: { totalQuestionsAsked: 0, threadsStarted: 0 },
  };
}
