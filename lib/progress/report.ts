export const PROGRESS_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days", days: 7, bucketDays: 1 },
  { value: "30d", label: "Last 30 days", days: 30, bucketDays: 1 },
  { value: "90d", label: "Last 90 days", days: 90, bucketDays: 1 },
] as const;

export type ProgressRange = (typeof PROGRESS_RANGE_OPTIONS)[number]["value"];

export interface ProgressPeriod {
  range: ProgressRange;
  label: string;
  start: Date;
  endExclusive: Date;
}

export interface DailyPracticeActivity {
  date: string;
  attempted: number;
  correct: number;
}

export interface DailyMockActivity {
  date: string;
  completed: number;
  scorePercentTotal: number;
}

export interface ProgressTrendPoint {
  startDate: string;
  endDate: string;
  label: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracyPct: number | null;
  mockExamsCompleted: number;
  averageMockScorePct: number | null;
}

export interface ProgressMilestone {
  id: "questions" | "topics" | "mocks";
  title: string;
  detail: string;
}

function atUtcStartOfDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shortDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function parseProgressRange(value: string | null | undefined): ProgressRange {
  return PROGRESS_RANGE_OPTIONS.some((option) => option.value === value)
    ? (value as ProgressRange)
    : "30d";
}

export function getProgressPeriod(
  range: ProgressRange,
  now = new Date()
): ProgressPeriod {
  const option = PROGRESS_RANGE_OPTIONS.find((item) => item.value === range)!;
  const end = atUtcStartOfDay(now);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (option.days - 1));
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return {
    range,
    label: option.label,
    start,
    endExclusive,
  };
}

export function buildProgressTrend(
  range: ProgressRange,
  now: Date,
  practiceRows: DailyPracticeActivity[],
  mockRows: DailyMockActivity[]
): ProgressTrendPoint[] {
  const option = PROGRESS_RANGE_OPTIONS.find((item) => item.value === range)!;
  const period = getProgressPeriod(range, now);
  const practiceByDate = new Map(practiceRows.map((row) => [row.date, row]));
  const mocksByDate = new Map(mockRows.map((row) => [row.date, row]));
  const points: ProgressTrendPoint[] = [];

  for (let dayOffset = 0; dayOffset < option.days; dayOffset += option.bucketDays) {
    const bucketStart = new Date(period.start);
    bucketStart.setUTCDate(bucketStart.getUTCDate() + dayOffset);
    const bucketLength = Math.min(option.bucketDays, option.days - dayOffset);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setUTCDate(bucketEnd.getUTCDate() + bucketLength - 1);

    let questionsAttempted = 0;
    let correctAnswers = 0;
    let mockExamsCompleted = 0;
    let mockScorePercentTotal = 0;

    for (let innerOffset = 0; innerOffset < bucketLength; innerOffset += 1) {
      const day = new Date(bucketStart);
      day.setUTCDate(day.getUTCDate() + innerOffset);
      const key = dateKey(day);
      const practice = practiceByDate.get(key);
      const mocks = mocksByDate.get(key);
      questionsAttempted += practice?.attempted ?? 0;
      correctAnswers += practice?.correct ?? 0;
      mockExamsCompleted += mocks?.completed ?? 0;
      mockScorePercentTotal += mocks?.scorePercentTotal ?? 0;
    }

    points.push({
      startDate: dateKey(bucketStart),
      endDate: dateKey(bucketEnd),
      label:
        bucketLength === 1
          ? range === "7d"
            ? bucketStart.toLocaleDateString("en-GB", {
                weekday: "short",
                timeZone: "UTC",
              })
            : shortDate(bucketStart)
          : `${shortDate(bucketStart)}–${shortDate(bucketEnd)}`,
      questionsAttempted,
      correctAnswers,
      accuracyPct:
        questionsAttempted > 0
          ? Math.round((correctAnswers / questionsAttempted) * 100)
          : null,
      mockExamsCompleted,
      averageMockScorePct:
        mockExamsCompleted > 0
          ? Math.round(mockScorePercentTotal / mockExamsCompleted)
          : null,
    });
  }

  return points;
}

function highestReached(value: number, thresholds: readonly number[]) {
  return [...thresholds].reverse().find((threshold) => value >= threshold);
}

export function buildProgressMilestones(input: {
  distinctQuestionsPracticed: number;
  topicsWithPractice: number;
  mockExamsCompleted: number;
}): ProgressMilestone[] {
  const milestones: ProgressMilestone[] = [];
  const questions = highestReached(input.distinctQuestionsPracticed, [1, 10, 25, 50, 100]);
  const topics = highestReached(input.topicsWithPractice, [1, 3, 5, 10]);
  const mocks = highestReached(input.mockExamsCompleted, [1, 3, 5, 10]);

  if (questions) {
    milestones.push({
      id: "questions",
      title: `${questions} different question${questions === 1 ? "" : "s"} explored`,
      detail: "You are steadily widening your practice coverage.",
    });
  }
  if (topics) {
    milestones.push({
      id: "topics",
      title: `${topics} topic${topics === 1 ? "" : "s"} started`,
      detail: "Every topic touched gives your next revision step more context.",
    });
  }
  if (mocks) {
    milestones.push({
      id: "mocks",
      title: `${mocks} mock exam${mocks === 1 ? "" : "s"} completed`,
      detail: "That is useful exam-condition evidence, not just activity.",
    });
  }

  return milestones;
}
