import { Prisma } from "@prisma/client";

type ResolvableQuestion = Omit<Prisma.PastQuestionCreateManyInput, "subjectId" | "topicId"> & {
  subjectName: string;
  topicTitle: string;
};

export const questions: ResolvableQuestion[] = [
  {
    subjectName: "SAT Math",
    topicTitle: "Heart of Algebra",
    questionText: "If 4x − 7 = 13, what is x?",
    answerText: "5",
    explanationText: "Add 7 to both sides (20), then divide by 4.",
    difficulty: 1,
  },
  {
    subjectName: "SAT Math",
    topicTitle: "Problem Solving & Data Analysis",
    questionText: "A survey shows 18 of 60 students prefer option A. What percent prefer A?",
    answerText: "30",
    explanationText: "18/60 = 0.3 → 30%.",
    difficulty: 1,
  },
  {
    subjectName: "SAT Math",
    topicTitle: "Passport to Advanced Math",
    questionText: "If f(x) = x² − 5x + 6, what is f(3)?",
    answerText: "0",
    explanationText: "9 − 15 + 6 = 0.",
    difficulty: 1,
  },
  {
    subjectName: "SAT Math",
    topicTitle: "Geometry & Trigonometry",
    questionText: "A right triangle has legs 5 and 12. What is the hypotenuse length?",
    answerText: "13",
    explanationText: "5² + 12² = 169; sqrt = 13.",
    difficulty: 1,
  },
  {
    subjectName: "SAT Reading",
    topicTitle: "Information & Ideas",
    questionText: "A passage claims a city reduced traffic by investing in rail. Which detail best supports this?",
    answerText: "Rush-hour rail capacity increased by 40% after new trains were added.",
    explanationText: "Direct evidence of rail investment tied to traffic reduction.",
    difficulty: 2,
  },
  {
    subjectName: "SAT Reading",
    topicTitle: "Craft & Structure",
    questionText: "In a passage contrasting two historians, why would the author quote both?",
    answerText: "To present differing interpretations of the same event.",
    explanationText: "Quoting both shows contrast in viewpoints.",
    difficulty: 2,
  },
  {
    subjectName: "SAT Reading",
    topicTitle: "Expression of Ideas",
    questionText: "Which revision best clarifies that the committee’s decision was unanimous?",
    answerText: "The committee voted unanimously to adopt the proposal.",
    explanationText: "States unanimity explicitly and concisely.",
    difficulty: 2,
  },
  {
    subjectName: "SAT Writing & Language",
    topicTitle: "Standard English Conventions",
    questionText: "Choose the best version: 'The results of the experiment was surprising.'",
    answerText: "The results of the experiment were surprising.",
    explanationText: "Plural subject 'results' takes 'were'.",
    difficulty: 1,
  },
  {
    subjectName: "SAT Writing & Language",
    topicTitle: "Sentence Structure",
    questionText: "Select the option that eliminates the comma splice: 'The test was difficult, many students finished early.'",
    answerText: "The test was difficult, but many students finished early.",
    explanationText: "Adds a coordinating conjunction to join two clauses.",
    difficulty: 2,
  },
  {
    subjectName: "SAT Writing & Language",
    topicTitle: "Verb Tense & Agreement",
    questionText: "Pick the correct form: 'Each of the players ____ bringing their own equipment.'",
    answerText: "is",
    explanationText: "'Each' is singular → 'is bringing.'",
    difficulty: 1,
  },
];
