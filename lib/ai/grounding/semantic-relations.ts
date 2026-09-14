import {
  canonicalizeConditionText,
  canonicalizeUnitExpression,
  componentKindMatches,
  conditionTextMatches,
  semanticConceptMatches,
  semanticTextMatches,
  type SemanticComponent,
  type SemanticComponentKind,
} from "./semantic-concepts";

export type CanonicalSemanticRelationKind =
  | "GENERAL_EXPLANATION"
  | "PROCESS_EXPLANATION"
  | "METHOD"
  | "FORMULA"
  | "SYMBOL_DEFINITION"
  | "UNIT"
  | "CONDITION"
  | "COMPARISON_SIDE"
  | "RELATION"
  | "CONSEQUENCE"
  | "PASSAGE_INTERPRETATION";

export type CanonicalSemanticRelation = {
  relationKind: CanonicalSemanticRelationKind;
  conceptId?: string;
  symbol?: string;
  formulaContext?: string;
  unit?: string;
  condition?: string;
  relation?: string;
  object?: string;
  text?: string;
  sourceCapabilityId?: string;
};

export function semanticRelationFromComponent(
  component: SemanticComponent
): CanonicalSemanticRelation {
  return {
    relationKind: relationKindForComponent(component.kind),
    conceptId: component.concept?.baseConcept,
    symbol: component.symbol,
    unit: canonicalizeUnitExpression(component.unit ?? component.text)?.canonical,
    condition:
      component.kind === "CONDITION"
        ? canonicalizeConditionText(component.text)
        : undefined,
    relation: component.relation,
    object: component.object,
    text: component.text,
    sourceCapabilityId: component.sourceCapabilityId,
  };
}

export function semanticComponentRelationMatches(
  requirement: SemanticComponent,
  evidence: SemanticComponent
): boolean {
  const required = semanticRelationFromComponent(requirement);
  const candidate = semanticRelationFromComponent(evidence);

  if (!relationKindsCompatible(required.relationKind, candidate.relationKind)) {
    return false;
  }
  if (
    required.relationKind === "PROCESS_EXPLANATION" &&
    candidate.relationKind === "RELATION" &&
    !hasProcessMechanismText(candidate.text)
  ) {
    return false;
  }
  if (
    requirement.concept &&
    !semanticConceptMatches(requirement.concept, evidence.concept)
  ) {
    return false;
  }
  if (required.symbol && required.symbol !== candidate.symbol) return false;
  if (required.unit && required.unit !== candidate.unit) return false;
  if (
    required.relation &&
    candidate.relation &&
    !semanticTextMatches(candidate.relation, required.relation)
  ) {
    return false;
  }
  if (
    required.object &&
    candidate.object &&
    !semanticTextMatches(candidate.object, required.object)
  ) {
    return false;
  }
  if (
    required.relationKind === "CONDITION" &&
    required.condition &&
    candidate.text &&
    !conditionTextMatches(candidate.text, required.condition)
  ) {
    return false;
  }
  if (!relationConstraintsSatisfied(requirement.constraints ?? [], evidence)) {
    return false;
  }

  return true;
}

function hasProcessMechanismText(value: string | undefined): boolean {
  return /\b(?:process\s+by\s+which|happens?\s+when|uses?\s+.+?\s+to|changes?\s+.+?\s+(?:into|to)|converts?\s+.+?\s+(?:into|to)|produces?|forms?|transfers?|moves?|passes?|separates?)\b/i.test(
    value ?? ""
  );
}

export function relationKindsCompatible(
  required: CanonicalSemanticRelationKind,
  evidence: CanonicalSemanticRelationKind
): boolean {
  if (required === evidence) return true;
  if (required === "GENERAL_EXPLANATION") {
    return [
      "GENERAL_EXPLANATION",
      "RELATION",
      "CONSEQUENCE",
      "PASSAGE_INTERPRETATION",
    ].includes(evidence);
  }
  if (required === "PROCESS_EXPLANATION") {
    return ["PROCESS_EXPLANATION", "METHOD", "RELATION"].includes(evidence);
  }
  if (required === "METHOD") {
    return ["METHOD", "PROCESS_EXPLANATION"].includes(evidence);
  }
  if (required === "CONDITION") {
    return ["CONDITION", "RELATION"].includes(evidence);
  }
  if (required === "CONSEQUENCE") {
    return ["CONSEQUENCE", "RELATION"].includes(evidence);
  }
  return false;
}

export function formulaContextKey(value: string | undefined): string | undefined {
  const normalized = value
    ?.toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/π/g, "pi")
    .replace(/[×·]/g, " * ")
    .replace(/[÷]/g, " / ")
    .replace(/[^a-z0-9\u0370-\u03ff=/*+\-²³\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\brho\b/g, "ρ")
    .replace(/\blambda\b/g, "λ")
    .replace(/\btheta\b/g, "θ")
    .replace(/\balpha\b/g, "α")
    .replace(/\bbeta\b/g, "β")
    .replace(/\bgamma\b/g, "γ")
    .replace(/\bpi\b/g, "π")
    .replace(/\bdelta\b/g, "δ")
    .replace(/\bequals?\b/g, "=")
    .replace(/\s*\b(?:x|times|multiply|multiplied by)\b\s*/g, "*")
    .replace(/\s*(?:\b(?:over|divided by)\b|\/)\s*/g, "/")
    .replace(/\s*=\s*/g, "=")
    .replace(/\s+/g, "");
  return normalized || undefined;
}

function relationKindForComponent(
  kind: SemanticComponentKind
): CanonicalSemanticRelationKind {
  switch (kind) {
    case "FORMULA":
      return "FORMULA";
    case "SYMBOL":
      return "SYMBOL_DEFINITION";
    case "UNIT":
      return "UNIT";
    case "CONDITION":
      return "CONDITION";
    case "METHOD":
      return "METHOD";
    case "PROCESS":
      return "PROCESS_EXPLANATION";
    case "COMPARISON_SIDE":
      return "COMPARISON_SIDE";
    case "RELATION":
    case "FUNCTION":
    case "PURPOSE":
      return "RELATION";
    case "CONSEQUENCE":
      return "CONSEQUENCE";
    case "PASSAGE_INTERPRETATION":
      return "PASSAGE_INTERPRETATION";
    case "DEFINITION":
    case "EXPLICIT_FACT":
    case "LIMITATION":
    case "QUANTITY":
    default:
      return componentKindMatches("PROCESS", kind)
        ? "PROCESS_EXPLANATION"
        : "GENERAL_EXPLANATION";
  }
}

function relationConstraintsSatisfied(
  constraints: string[],
  evidence: SemanticComponent
): boolean {
  if (constraints.length === 0) return true;
  const text = `${evidence.text ?? ""} ${evidence.relation ?? ""} ${
    evidence.object ?? ""
  } ${evidence.concept?.aliases?.join(" ") ?? ""}`;
  return constraints.every((constraint) => {
    if (constraint === "kinds mentioned") {
      return /\b(?:common|proper|types?|kinds?)\b/i.test(text);
    }
    return semanticTextMatches(text, constraint);
  });
}
