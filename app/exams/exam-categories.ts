import type { StudyBuddyIconName } from "@/components/StudyBuddyIcon";

export const EXAM_CATEGORIES = {
  "full-waec": {
    title: "Full WAEC Mock Exam",
    description:
      "Choose Paper 1 objective or Paper 2 written practice with the official paper structure and timing.",
    cardDescription:
      "Practise Paper 1 objective or Paper 2 written under full exam conditions.",
    icon: "exams" as StudyBuddyIconName,
    templateTitles: [
      "WAEC Mathematics – Paper 1 Practice",
      "WAEC Mathematics – Paper 2 Practice",
    ],
  },
  "quick-practice": {
    title: "Quick Practice",
    description:
      "Complete a short Mathematics check when you have about 18 minutes available.",
    cardDescription:
      "A focused 10-question check for a short revision session.",
    icon: "clock" as StudyBuddyIconName,
    templateTitles: ["WAEC Mathematics – Quick Practice"],
  },
  "standard-practice": {
    title: "Standard Practice",
    description:
      "Work through a balanced 25-question Mathematics session in about 45 minutes.",
    cardDescription:
      "A balanced 25-question session across Mathematics topics.",
    icon: "practice" as StudyBuddyIconName,
    templateTitles: ["WAEC Mathematics – Standard Practice"],
  },
  "exam-readiness": {
    title: "Exam Readiness Practice",
    description:
      "Build concentration with a longer 40-question Mathematics practice session.",
    cardDescription:
      "A longer 40-question session for stamina and exam readiness.",
    icon: "analytics" as StudyBuddyIconName,
    templateTitles: ["WAEC Mathematics – Exam Readiness"],
  },
} as const;

export type ExamCategorySlug = keyof typeof EXAM_CATEGORIES;

export function isExamCategorySlug(value: string): value is ExamCategorySlug {
  return value in EXAM_CATEGORIES;
}
