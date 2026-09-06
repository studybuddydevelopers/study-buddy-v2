// app/dashboard/dashboard.types.ts

export interface UserProfile {
  id: string;
  firstName: string | null;
  middleNames?: string | null;
  lastNames: string | null;
  phoneNumber?: string | null;
  gradeLevel?: string | null;
  examYear?: number | null;
  preferredSubjects?: string[] | null;
  avatarUrl?: string | null;
}

export interface SubscriptionInfo {
  id: string;
  createdAt: string;
  plan?: string;
  status?: string;
}

export interface MeResponse {
  id: string;
  email: string;
  isAdmin: boolean;
  profile: UserProfile | null;
  subscription: SubscriptionInfo | null;
}

// ── Progress full-report (kept for /progress page) ──────────────────────────

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  progressPercentage: number;
  updatedAt: string;
}

export interface PastQuestionSubjectBreakdown {
  subjectId: string;
  subjectName: string;
  attempts: number;
  correct: number;
  accuracyRate: number;
}

export interface PastQuestionsReport {
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  perSubject: PastQuestionSubjectBreakdown[];
}

export interface MockExamEntry {
  instanceId: string;
  subjectId: string;
  templateTitle: string;
  score: number;
  questionCount: number;
  scorePercent: number | null;
  graded: boolean;
  startedAt: string;
  submittedAt: string | null;
  durationMinutes: number | null;
}

export interface MockExamReport {
  count: number;
  inProgressCount: number;
  totalScore: number;
  averageScore: number;
  averageScorePercent: number;
  averageDurationMinutes: number | null;
  exams: MockExamEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface StudyMaterialsProgress {
  topicsTotal: number;
  topicsWithPractice: number;
  topicsCoveragePercent: number;
  questionsInBank: number;
  distinctQuestionsPracticed: number;
  bankCoveragePercent: number;
  lastActivityAt: string | null;
}

export interface AIActivity {
  totalQuestionsAsked: number;
  threadsStarted: number;
  legacyThreadsStarted?: number;
  persistentThreadsStarted?: number;
}

export interface ProgressFullReport {
  subjects: SubjectProgress[];
  studyMaterials: StudyMaterialsProgress;
  pastQuestions: PastQuestionsReport;
  mockExams: MockExamReport;
  aiActivity: AIActivity;
}

export interface AIRecommendation {
  title: string;
  body: string;
  image?: string;
  alt?: string;
}

// ── Dashboard stats (new endpoint) ──────────────────────────────────────────

export interface TopicBreakdown {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  accuracyPct: number;
  lastAttemptAt: string | null;
}

export interface WeeklyActivityDay {
  day: string;   // "Mon", "Tue", …
  date: string;  // "2026-07-14"
  count: number;
  correct: number;
}

export interface RecommendedTopic extends TopicBreakdown {
  reason: "focus" | "continue" | "explore";
}

export interface AvailableTopic {
  topicId: string;
  topicTitle: string;
  subjectName: string;
}

export interface InProgressMock {
  instanceId: string;
  title: string;
  subjectName: string;
  answeredCount: number;
  questionCount: number;
  startedAt: string;
}

export interface PracticeDraftSummary {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  savedAnswerCount: number;
  updatedAt: string;
}

export interface WeeklySummary {
  questionsAttempted: number;
  correctAnswers: number;
  accuracyPct: number | null;
  activeDays: number;
}

export interface TodaySummary {
  questionsAttempted: number;
  mockExamsCompleted: number;
  aiQuestionsAsked: number;
}

export interface DashboardStats {
  availableTopics: AvailableTopic[];
  topicBreakdown: TopicBreakdown[];
  focusTopics: TopicBreakdown[];
  recommendedTopic: RecommendedTopic | null;
  weeklyActivity: WeeklyActivityDay[];
  weeklySummary: WeeklySummary;
  todaySummary: TodaySummary;
  streakDays: number;
  lastInProgressMock: InProgressMock | null;
  resumePractice: PracticeDraftSummary | null;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface DashboardClientProps {
  me: MeResponse | null;
  stats: DashboardStats | null;
}
