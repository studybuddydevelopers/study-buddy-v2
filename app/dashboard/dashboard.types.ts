// app/dashboard/dashboard.types.ts

// -------------------------------------------------------------
// User Profile Types
// -------------------------------------------------------------
export interface UserProfile {
  id: string;
  firstName: string | null;
  middleNames?: string | null;
  lastNames: string | null;
  phoneNumber?: string | null;
  gradeLevel?: string | null;
  waecYear?: number | null;
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

// -------------------------------------------------------------
// Subject Progress
// -------------------------------------------------------------
export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  progressPercentage: number;
  updatedAt: string; // serialized date
}

// -------------------------------------------------------------
// Past Question Analytics
// -------------------------------------------------------------
export interface PastQuestionSubjectBreakdown {
  subjectId: string;
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

// -------------------------------------------------------------
// Mock Exam Stats
// -------------------------------------------------------------
export interface MockExamEntry {
  instanceId: string;
  subjectId: string;
  templateTitle: string;
  score: number | null;
  graded: boolean;
  startedAt: string;
  submittedAt: string | null;
}

export interface MockExamReport {
  count: number;
  totalScore: number;
  averageScore: number;
  exams: MockExamEntry[];
}

// -------------------------------------------------------------
// AI Activity
// -------------------------------------------------------------
export interface AIActivity {
  totalQuestionsAsked: number;
}

// -------------------------------------------------------------
// Full Progress Report (API Response)
// -------------------------------------------------------------
export interface ProgressFullReport {
  subjects: SubjectProgress[];
  pastQuestions: PastQuestionsReport;
  mockExams: MockExamReport;
  aiActivity: AIActivity;
}

// -------------------------------------------------------------
// AI Recommendations
// -------------------------------------------------------------
export interface AIRecommendation {
  title: string;
  body: string;
  image?: string;
  alt?: string;
}

// -------------------------------------------------------------
// Props for Dashboard Client
// -------------------------------------------------------------
export interface DashboardClientProps {
  me: MeResponse | null;
  progress: ProgressFullReport | null;
  aiRecommendations: AIRecommendation[];
}
