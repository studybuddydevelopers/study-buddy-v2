import type { RetrievalEvaluationCase } from "./types";

export const developmentEvaluationSet: RetrievalEvaluationCase[] = [
  {
    id: "dev-direct-number-base",
    split: "development",
    query: "Number and numeration place value",
    notes: "Direct topic phrasing.",
  },
  {
    id: "dev-exact-year",
    split: "development",
    query: "WAEC Mathematics 2021 question 5",
    notes: "Year and question-number signal.",
  },
  {
    id: "dev-formula",
    split: "development",
    query: "formula for area of a sector",
    notes: "Formula-reference case.",
  },
  {
    id: "dev-no-evidence",
    split: "development",
    query: "Explain an unrelated celebrity news story",
    expectNoEvidence: true,
    notes: "No-evidence case.",
  },
];

export const holdoutEvaluationSet: RetrievalEvaluationCase[] = [
  {
    id: "holdout-paraphrase-algebra",
    split: "holdout",
    query: "questions about solving linear equations",
    notes: "Paraphrased topic.",
  },
  {
    id: "holdout-exact-term",
    split: "holdout",
    query: "\"simultaneous equations\"",
    notes: "Quoted phrase case.",
  },
  {
    id: "holdout-wrong-subject",
    split: "holdout",
    query: "biology cell division",
    expectNoEvidence: true,
    notes: "Wrong-subject case for Mathematics-only corpus.",
  },
];

export const retrievalEvaluationCases = [
  ...developmentEvaluationSet,
  ...holdoutEvaluationSet,
];
