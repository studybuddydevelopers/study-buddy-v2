// UI labels for study materials, keyed by subject examCode.

export const MATERIALS_SUBJECT_ORDER = [
  "WAEC-MATH",
  // "WAEC-ENG" — English Language coming soon
] as const;

export const MATERIALS_SUBJECT_LABELS: Record<string, string> = {
  "WAEC-MATH": "Mathematics",
  // "WAEC-ENG": "English Language",
};

export function materialsSubjectDisplayName(examCode: string | null | undefined): string {
  if (examCode && MATERIALS_SUBJECT_LABELS[examCode]) {
    return MATERIALS_SUBJECT_LABELS[examCode];
  }
  return "Subject";
}
