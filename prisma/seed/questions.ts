import { Prisma } from "@prisma/client";

type ResolvableQuestion = Omit<Prisma.PastQuestionCreateManyInput, "subjectId" | "topicId"> & {
  subjectName: string;
  topicTitle: string;
};

const mathLinear = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const a = 2 + (i % 7);
    const b = 1 + ((i * 3) % 11);
    const c = 10 + ((i * 5) % 40);
    const answer = (c - b) / a;
    return {
      subjectName: "SAT Math",
      topicTitle: "Heart of Algebra",
      questionText: `If ${a}x + ${b} = ${c}, what is x?`,
      answerText: String(answer),
      explanationText: `Subtract ${b} and divide by ${a}.`,
      difficulty: 1 + (i % 3),
    };
  });

const mathData = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const total = 40 + (i % 30);
    const part = 8 + ((i * 2) % 20);
    const percent = Math.round((part / total) * 100);
    return {
      subjectName: "SAT Math",
      topicTitle: "Problem Solving & Data Analysis",
      questionText: `${part} out of ${total} students chose option A. What percent is that?`,
      answerText: String(percent),
      explanationText: `Compute ${part}/${total} and convert to percent.`,
      difficulty: 1 + (i % 3),
    };
  });

const mathAdvanced = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const k = 1 + (i % 6);
    const x = 2 + (i % 5);
    const value = x * x - k * x + 6;
    return {
      subjectName: "SAT Math",
      topicTitle: "Passport to Advanced Math",
      questionText: `If f(x) = x^2 - ${k}x + 6, what is f(${x})?`,
      answerText: String(value),
      explanationText: `Plug in ${x}: ${x}^2 - ${k}(${x}) + 6.`,
      difficulty: 2 + (i % 3),
    };
  });

const mathGeo = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const legA = 3 + (i % 10);
    const legB = 4 + ((i * 2) % 12);
    const hyp = Math.sqrt(legA * legA + legB * legB);
    return {
      subjectName: "SAT Math",
      topicTitle: "Geometry & Trigonometry",
      questionText: `A right triangle has legs ${legA} and ${legB}. What is the hypotenuse length?`,
      answerText: hyp.toFixed(2),
      explanationText: "Use Pythagorean theorem and round to two decimals if needed.",
      difficulty: 2 + (i % 3),
    };
  });

const readingInfo = (count: number): ResolvableQuestion[] => {
  const contexts = [
    ["city transit plan", "Which detail best supports the claim that the plan reduced congestion?"],
    ["coastal restoration", "Which detail best supports the claim that wetlands improved water quality?"],
    ["school nutrition program", "Which detail best supports the claim that the program boosted attendance?"],
    ["solar initiative", "Which detail best supports the claim that solar adoption lowered bills?"],
  ];
  return Array.from({ length: count }).map((_, i) => {
    const [topic, stem] = contexts[i % contexts.length];
    const uptick = 15 + (i % 30);
    return {
      subjectName: "SAT Reading",
      topicTitle: "Information & Ideas",
      questionText: `In a passage about a ${topic}, ${stem}`,
      answerText: `Data showing a ${uptick}% improvement after the program started.`,
      explanationText: "Direct quantitative evidence best supports the claim.",
      difficulty: 2 + (i % 2),
    };
  });
};

const readingCraft = (count: number): ResolvableQuestion[] => {
  const devices = ["analogy", "contrast", "definition", "cause and effect"];
  return Array.from({ length: count }).map((_, i) => {
    const device = devices[i % devices.length];
    return {
      subjectName: "SAT Reading",
      topicTitle: "Craft & Structure",
      questionText: `An author uses ${device} to explain a complex idea. What is the purpose of this choice?`,
      answerText: `To clarify the idea by using ${device} the audience recognizes.`,
      explanationText: "Identifies rhetorical purpose tied to the device.",
      difficulty: 2 + (i % 3),
    };
  });
};

const readingExpression = (count: number): ResolvableQuestion[] => {
  const aims = ["clarity", "cohesion", "precision", "tone"];
  return Array.from({ length: count }).map((_, i) => {
    const aim = aims[i % aims.length];
    return {
      subjectName: "SAT Reading",
      topicTitle: "Expression of Ideas",
      questionText: `Which revision best improves ${aim} in a sentence describing a research finding?`,
      answerText: "Use a direct, active construction that names the finding and result.",
      explanationText: "SAT favors concise, specific revisions with clear logic.",
      difficulty: 2 + (i % 2),
    };
  });
};

const writingConventions = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const plural = i % 2 === 0 ? "results" : "committee";
    const verb = plural === "results" ? "were" : "was";
    const fix = plural === "results" ? "were" : "was";
    return {
      subjectName: "SAT Writing & Language",
      topicTitle: "Standard English Conventions",
      questionText: `Choose the best version: "The ${plural} of the trial ${verb} surprising."`,
      answerText: `The ${plural} of the trial ${fix} surprising.`,
      explanationText: "Match subject number to verb form.",
      difficulty: 1 + (i % 3),
    };
  });

const writingSentence = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const connector = ["but", "so", "and", "yet"][i % 4];
    return {
      subjectName: "SAT Writing & Language",
      topicTitle: "Sentence Structure",
      questionText: `Fix the run-on: "The test was difficult, many students finished early."`,
      answerText: `The test was difficult, ${connector} many students finished early.`,
      explanationText: "Use a coordinating conjunction to join independent clauses.",
      difficulty: 2 + (i % 2),
    };
  });

const writingVerb = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const subject = i % 2 === 0 ? "Each of the players" : "Neither of the options";
    const verb = "is";
    return {
      subjectName: "SAT Writing & Language",
      topicTitle: "Verb Tense & Agreement",
      questionText: `Pick the correct form: "${subject} ____ available next week."`,
      answerText: `${verb}`,
      explanationText: "Indefinite pronouns take singular agreement.",
      difficulty: 1 + (i % 3),
    };
  });

const writingRhetorical = (count: number): ResolvableQuestion[] =>
  Array.from({ length: count }).map((_, i) => {
    const goal = ["emphasize a benefit", "clarify a timeline", "stress a limitation", "highlight a contrast"][i % 4];
    return {
      subjectName: "SAT Writing & Language",
      topicTitle: "Rhetorical Skills",
      questionText: `Which revision best helps the author ${goal} in a proposal?`,
      answerText: "Select the option that directly states the point in concise language.",
      explanationText: "Rhetorical edits should support the stated goal efficiently.",
      difficulty: 2 + (i % 2),
    };
  });

export const questions: ResolvableQuestion[] = [
  ...mathLinear(50),
  ...mathData(50),
  ...mathAdvanced(50),
  ...mathGeo(50),
  ...readingInfo(50),
  ...readingCraft(50),
  ...readingExpression(50),
  ...writingConventions(50),
  ...writingSentence(50),
  ...writingVerb(50),
  ...writingRhetorical(50),
];
