// lib/mock-exam-multiple-choice.ts
// Deterministic WAEC-style 4-option MCQ so choices stay stable per instance + question.

export interface McqChoice {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

const GENERIC_DISTRACTORS = [
  "None of the above",
  "The values cannot be determined from the information given.",
  "I and II only",
  "I, II, and III",
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) || 0;
  }
  return Math.abs(h) || 1;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase();
}

function uniqueAnswers(pool: string[]): string[] {
  const m = new Map<string, string>();
  for (const raw of pool) {
    const t = raw.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!m.has(k)) m.set(k, t);
  }
  return [...m.values()];
}

export function buildMockExamMcqChoices(params: {
  correctAnswer: string;
  answerPool: string[];
  instanceId: string;
  questionId: string;
}): McqChoice[] {
  const correct = params.correctAnswer.trim();
  const normCorrect = normalizeAnswer(correct);

  const uniquePool = uniqueAnswers(params.answerPool).filter(
    (a) => normalizeAnswer(a) !== normCorrect
  );

  const pickSeed = hashString(
    `${params.instanceId}:${params.questionId}:distractors`
  );
  const rngPick = mulberry32(pickSeed);
  const poolCopy = [...uniquePool];
  const distractors: string[] = [];

  for (let n = 0; n < 3 && poolCopy.length > 0; n++) {
    const j = Math.floor(rngPick() * poolCopy.length);
    distractors.push(poolCopy[j]);
    poolCopy.splice(j, 1);
  }

  let padIdx = 0;
  while (distractors.length < 3) {
    const candidate = GENERIC_DISTRACTORS[padIdx % GENERIC_DISTRACTORS.length];
    padIdx++;
    const norm = normalizeAnswer(candidate);
    if (norm === normCorrect) continue;
    if (distractors.some((d) => normalizeAnswer(d) === norm)) continue;
    distractors.push(candidate);
  }

  const fourTexts = [correct, distractors[0], distractors[1], distractors[2]];

  const orderSeed = hashString(
    `${params.instanceId}:${params.questionId}:order`
  );
  const rngOrder = mulberry32(orderSeed);
  const arr = [...fourTexts];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rngOrder() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const letters: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  return arr.map((text, i) => ({
    letter: letters[i],
    text,
  }));
}
