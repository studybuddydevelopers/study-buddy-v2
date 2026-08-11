export function findPresentEvaluationFacts(answer: string, requiredFacts: string[]) {
  return requiredFacts.filter((fact) => evaluationFactAppears(answer, fact));
}

export function evaluationFactAppears(answer: string, requiredFact: string) {
  const normalizedAnswer = normalizeEvaluationFactText(answer);
  const normalizedFact = normalizeEvaluationFactText(requiredFact);

  if (normalizedAnswer.includes(normalizedFact)) return true;

  if (normalizedFact === "squared") {
    return /\br\s*(?:\^?\s*2|squared)\b/i.test(normalizedAnswer);
  }

  if (normalizedFact === "radius squared") {
    return (
      /\bradius\s+squared\b/i.test(normalizedAnswer) ||
      /\br\s*(?:\^?\s*2|squared)\b/i.test(normalizedAnswer)
    );
  }

  return false;
}

function normalizeEvaluationFactText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\u00b2/g, "^2")
    .replace(/[×*]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}
