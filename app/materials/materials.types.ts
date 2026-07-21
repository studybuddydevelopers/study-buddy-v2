export interface MaterialsTopicRow {
  id: string;
  title: string;
  sortOrder: number;
  questionCount: number;
  questionsAttempted: number;
  progressPercentage: number;
}

export interface MaterialsSubjectSection {
  id: string;
  name: string;
  examCode: string | null;
  displayName: string;
  topics: MaterialsTopicRow[];
}
