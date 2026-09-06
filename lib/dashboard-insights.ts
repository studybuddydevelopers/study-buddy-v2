export const MIN_FOCUS_ATTEMPTS = 5;
export const FOCUS_ACCURACY_CEILING = 70;

export type RecommendationReason = "focus" | "continue" | "explore";
export type TopicLevel = "Starting" | "Building" | "Improving" | "Strong";

export interface DashboardTopicInput {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  accuracyPct: number;
  lastAttemptAt: string | null;
}

export interface RecommendedDashboardTopic extends DashboardTopicInput {
  reason: RecommendationReason;
}

export function getTopicLevel(
  topic: Pick<DashboardTopicInput, "attempted" | "accuracyPct">
): TopicLevel {
  if (topic.attempted < MIN_FOCUS_ATTEMPTS) return "Starting";
  if (topic.accuracyPct < 50) return "Building";
  if (topic.accuracyPct < FOCUS_ACCURACY_CEILING) return "Improving";
  return "Strong";
}

function compareFocusTopics(a: DashboardTopicInput, b: DashboardTopicInput) {
  return a.accuracyPct - b.accuracyPct || b.attempted - a.attempted;
}

function compareRecentTopics(a: DashboardTopicInput, b: DashboardTopicInput) {
  const aTime = a.lastAttemptAt ? Date.parse(a.lastAttemptAt) : 0;
  const bTime = b.lastAttemptAt ? Date.parse(b.lastAttemptAt) : 0;
  return bTime - aTime || b.attempted - a.attempted;
}

export function deriveTopicInsights(topics: DashboardTopicInput[]): {
  focusTopics: DashboardTopicInput[];
  recommendedTopic: RecommendedDashboardTopic | null;
} {
  const availableTopics = topics.filter((topic) => topic.totalQuestions > 0);
  const focusTopics = availableTopics
    .filter(
      (topic) =>
        topic.attempted >= MIN_FOCUS_ATTEMPTS &&
        topic.accuracyPct < FOCUS_ACCURACY_CEILING
    )
    .sort(compareFocusTopics)
    .slice(0, 3);

  if (focusTopics.length > 0) {
    return {
      focusTopics,
      recommendedTopic: { ...focusTopics[0], reason: "focus" },
    };
  }

  const recentTopic = availableTopics
    .filter((topic) => topic.attempted > 0)
    .sort(compareRecentTopics)[0];

  if (recentTopic) {
    return {
      focusTopics,
      recommendedTopic: { ...recentTopic, reason: "continue" },
    };
  }

  const firstTopic = availableTopics[0];
  return {
    focusTopics,
    recommendedTopic: firstTopic
      ? { ...firstTopic, reason: "explore" }
      : null,
  };
}
