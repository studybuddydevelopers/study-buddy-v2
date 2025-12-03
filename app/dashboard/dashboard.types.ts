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
// Progress Types
// -------------------------------------------------------------
export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  progressPercentage: number;
}

export interface ProgressFullReport {
  subjectProgress: SubjectProgress[];
  aiQuestionsAnswered?: number;
  pastQuestionAccuracy?: Record<string, number>;
  mockExamStats?: any;
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
