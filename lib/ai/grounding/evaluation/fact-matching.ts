export function findPresentEvaluationFacts(answer: string, requiredFacts: string[]) {
  return requiredFacts.filter((fact) => evaluationFactAppears(answer, fact));
}

export function evaluationFactAppears(answer: string, requiredFact: string) {
  const normalizedAnswer = normalizeEvaluationFactText(answer);
  const normalizedFact = normalizeEvaluationFactText(requiredFact);

  if (evaluationPhraseAppearsNormalized(normalizedAnswer, normalizedFact)) return true;

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

export function evaluationPhraseAppears(answer: string, phrase: string) {
  return evaluationPhraseAppearsNormalized(
    normalizeEvaluationFactText(answer),
    normalizeEvaluationFactText(phrase)
  );
}

function evaluationPhraseAppearsNormalized(answer: string, phrase: string) {
  if (!phrase) return false;
  if (phrase === "pi") {
    return /(^|[^a-z0-9])(?:pi|π)([^a-z0-9]|$)/i.test(answer);
  }

  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(answer);
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
