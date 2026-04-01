// lib/materials-display.ts
// UI labels for study materials (DB still uses SAT_* subject names in many places).

export const MATERIALS_SUBJECT_ORDER = [
  "SAT-MATH",
  "SAT-READ",
  "SAT-WRIT",
] as const;

export const MATERIALS_SUBJECT_LABELS: Record<string, string> = {
  "SAT-MATH": "Math",
  "SAT-READ": "English Reading",
  "SAT-WRIT": "English Writing",
};

export function materialsSubjectDisplayName(examCode: string | null | undefined): string {
  if (examCode && MATERIALS_SUBJECT_LABELS[examCode]) {
    return MATERIALS_SUBJECT_LABELS[examCode];
  }
  return "Subject";
}
