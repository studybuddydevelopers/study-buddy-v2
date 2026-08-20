export type SemanticFacet =
  | "DEFINITION"
  | "FORMULA"
  | "UNIT"
  | "PURPOSE"
  | "FUNCTION"
  | "PROCESS"
  | "LIMITATION"
  | "CONSEQUENCE"
  | "METHOD";

export type SemanticConcept = {
  baseConcept: string;
  facet?: SemanticFacet;
  subjectId: string;
  topicId?: string;
  aliases?: string[];
};

export type SemanticComponentKind =
  | SemanticFacet
  | "SYMBOL"
  | "QUANTITY"
  | "RELATION"
  | "COMPARISON_SIDE"
  | "EXPLICIT_FACT"
  | "PASSAGE_INTERPRETATION";

export type SemanticComponent = {
  kind: SemanticComponentKind;
  concept?: SemanticConcept;
  symbol?: string;
  relation?: string;
  object?: string;
  value?: number;
  unit?: string;
  text?: string;
  constraints?: string[];
  sourceCapabilityId?: string;
  resourceChunkId?: string;
  sourceLabel?: string;
};

export type CanonicalConcept = {
  id: string;
  label: string;
  aliases: string[];
};

type ConceptAliasEntry = {
  id: string;
  label: string;
  aliases: string[];
  subjectIds?: string[];
  topicIds?: string[];
};

const CONTROLLED_CONCEPTS: ConceptAliasEntry[] = [
  {
    id: "simple-interest",
    label: "Simple interest",
    aliases: ["simple interest", "simple-interest", "si"],
  },
  { id: "area-of-circle", label: "Area of a circle", aliases: ["circle area", "area of a circle", "area circle"] },
  { id: "area-of-triangle", label: "Area of a triangle", aliases: ["triangle area", "area of a triangle", "area triangle"] },
  { id: "perimeter", label: "Perimeter", aliases: ["perimeter"] },
  { id: "circumference", label: "Circumference", aliases: ["circumference", "circle boundary"] },
  { id: "density", label: "Density", aliases: ["density"] },
  { id: "speed", label: "Speed", aliases: ["speed"] },
  { id: "distance", label: "Distance", aliases: ["distance"] },
  { id: "time", label: "Time", aliases: ["time", "time period"] },
  { id: "mass", label: "Mass", aliases: ["mass"] },
  { id: "volume", label: "Volume", aliases: ["volume"] },
  { id: "acceleration", label: "Acceleration", aliases: ["acceleration"] },
  { id: "pressure", label: "Pressure", aliases: ["pressure"] },
  { id: "force", label: "Force", aliases: ["force", "resultant force"] },
  { id: "voltage", label: "Voltage", aliases: ["voltage", "potential difference"] },
  { id: "current", label: "Current", aliases: ["current", "electric current"] },
  { id: "resistance", label: "Resistance", aliases: ["resistance"] },
  { id: "power", label: "Power", aliases: ["power", "electrical power"] },
  { id: "frequency", label: "Frequency", aliases: ["frequency"] },
  { id: "wavelength", label: "Wavelength", aliases: ["wavelength"] },
  { id: "evaporation", label: "Evaporation", aliases: ["evaporation"] },
  { id: "condensation", label: "Condensation", aliases: ["condensation"] },
  { id: "boiling", label: "Boiling", aliases: ["boiling"] },
  { id: "filtration", label: "Filtration", aliases: ["filtration"] },
  { id: "sieving", label: "Sieving", aliases: ["sieving"] },
  { id: "photosynthesis", label: "Photosynthesis", aliases: ["photosynthesis"] },
  { id: "respiration", label: "Respiration", aliases: ["respiration"] },
  { id: "diffusion", label: "Diffusion", aliases: ["diffusion"] },
  { id: "acid", label: "Acid", aliases: ["acid", "acids"] },
  { id: "base", label: "Base", aliases: ["base", "bases", "alkali", "alkalis"] },
  { id: "osmosis", label: "Osmosis", aliases: ["osmosis"] },
  { id: "ratio", label: "Ratio", aliases: ["ratio", "ratios"] },
  { id: "percentage", label: "Percentage", aliases: ["percentage", "percent"] },
  { id: "percentage-change", label: "Percentage change", aliases: ["percentage change", "percentage increase", "percentage decrease"] },
  { id: "change", label: "Change", aliases: ["change"] },
  { id: "original-value", label: "Original value", aliases: ["original value", "original"] },
  { id: "principal", label: "Principal", aliases: ["principal"] },
  { id: "rate", label: "Rate", aliases: ["rate", "percentage rate"] },
  { id: "ohms-law", label: "Ohm's law", aliases: ["ohm's law", "ohms law"] },
  { id: "conductor", label: "Conductor", aliases: ["conductor", "conductors"] },
  { id: "insulator", label: "Insulator", aliases: ["insulator", "insulators"] },
  {
    id: "series-resistance-rule",
    label: "Series resistance rule",
    aliases: [
      "series resistance",
      "series resistance rule",
      "series resistance rules",
      "series rules",
      "series circuit resistance",
      "series circuit resistance rule",
    ],
  },
  {
    id: "parallel-resistance-rule",
    label: "Parallel resistance rule",
    aliases: [
      "parallel resistance",
      "parallel resistance rule",
      "parallel resistance rules",
      "parallel rules",
      "parallel circuit resistance",
      "parallel circuit resistance rule",
    ],
  },
  { id: "noun", label: "Noun", aliases: ["noun", "nouns"] },
  { id: "adjective", label: "Adjective", aliases: ["adjective", "adjectives"] },
  { id: "mean", label: "Arithmetic mean", aliases: ["mean", "arithmetic mean", "average"] },
  { id: "median", label: "Median", aliases: ["median"] },
  { id: "main-idea", label: "Main idea", aliases: ["main idea", "central point"] },
  { id: "supporting-details", label: "Supporting details", aliases: ["supporting details", "examples"] },
  { id: "rusting", label: "Rusting", aliases: ["rusting"] },
  { id: "mitosis", label: "Mitosis", aliases: ["mitosis"] },
  { id: "meiosis", label: "Meiosis", aliases: ["meiosis"] },
  { id: "food-chain", label: "Food chain", aliases: ["food chain"] },
  { id: "food-web", label: "Food web", aliases: ["food web"] },
  { id: "producer", label: "Producer", aliases: ["producer", "producers"] },
  { id: "consumer", label: "Consumer", aliases: ["consumer", "consumers", "primary consumers", "secondary consumers"] },
  { id: "conduction", label: "Conduction", aliases: ["conduction"] },
  { id: "convection", label: "Convection", aliases: ["convection"] },
  { id: "xylem", label: "Xylem", aliases: ["xylem"] },
  { id: "phloem", label: "Phloem", aliases: ["phloem"] },
  { id: "suffix", label: "Suffix", aliases: ["suffix", "word ending"] },
];

export function canonicalizeConcept(
  rawConcept: string,
  scope?: { subjectId?: string; topicId?: string }
): CanonicalConcept {
  const normalized = singularizeConcept(normalizeConceptText(rawConcept));
  const match = findControlledConcept(normalized, scope);

  if (match) {
    return {
      id: match.id,
      label: match.label,
      aliases: match.aliases,
    };
  }

  return {
    id: `concept:${slugify(normalized || "unknown")}`,
    label: toTitleCase(normalized || rawConcept),
    aliases: normalized ? [normalized] : [],
  };
}

export function canonicalizeSemanticConcept(input: {
  rawConcept: string;
  subjectId: string;
  topicId?: string;
  facet?: SemanticFacet;
}): SemanticConcept | undefined {
  const base = normalizeSemanticBaseConcept(input.rawConcept, input.facet);
  if (!base) return undefined;
  const canonical = canonicalizeConcept(base, input);
  return {
    baseConcept: canonical.id,
    facet: input.facet,
    subjectId: input.subjectId,
    topicId: input.topicId,
    aliases: canonical.aliases,
  };
}

export function normalizeSemanticBaseConcept(
  rawConcept: string,
  facet?: SemanticFacet
): string {
  let cleaned = normalizeConceptText(rawConcept)
    .replace(/\baccording\s+to\s+(?:the\s+)?(?:[a-z0-9 -]+?\s+)?(?:cards?|notes?|sources?|evidence)\b/g, " ")
    .replace(/\b(?:using|from|with)\s+(?:these|the|this|two)?\s*(?:[a-z0-9]+\s+){0,3}(?:notes?|cards?|sources?|evidence|formula notes?)\b/g, " ")
    .replace(/\b(?:from memory|general knowledge|outside sources?)\b/g, " ")
    .replace(/\b(?:ignore|bypass|override|disregard)\b.+?\b(?:sources?|evidence|citations?|resources?|context|instructions?)\b/g, " ")
    .replace(/\buse\s+source[_\s-]*\d+\b/g, " ")
    .replace(/\buse only the source label(?: the server gives you)?\b/g, " ")
    .replace(/\b(?:explain|teach|define|state|give|tell me|what is|what are|what does|why is|why are|how does|how do|how to|show how to|calculate|work out|find|compare|contrast|differentiate|distinguish)\b/g, " ")
    .replace(/\b(?:formula|process|method|rule|rules|definition|meaning|concept|lesson|card|note|notes)\b/g, " ")
    .replace(/\s+and\s+(?:name|define|identify|explain)\s+(?:the\s+)?(?:variables?|symbols?)$/g, " ")
    .replace(/\s+and\s+what\s+(?:do|does|is|are)\s+.+$/g, " ")
    .replace(/\b(?:measured in|measured with|unit of|units of|what kind of|what kinds of|what types of|what type of|kinds are mentioned|kind are mentioned)\b/g, " ")
    .replace(/\b(?:purpose|useful|used for|function|role|limitation|caveat|cannot|can not|does not|do not)\b/g, " ")
    .replace(/\b(?:and|or)\s+what\s+(?:do|does|is|are)\b.+$/g, " ")
    .replace(/\b(?:in|for)\s+(?:simple terms|motion|this topic|this card|these cards|the two cards)\b/g, " ")
    .replace(/\b(?:a|an|the|this|that|its)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (facet === "FORMULA") {
    const areaOf = cleaned.match(/^area of (.+)$/);
    if (areaOf) cleaned = `area of ${areaOf[1] ?? ""}`;
  }

  const areaOf = cleaned.match(/^area of (circle|triangle|parallelogram|rectangle)$/);
  if (areaOf) return `area of ${areaOf[1]}`;
  if (/^(circle|triangle|parallelogram|rectangle) area$/.test(cleaned)) {
    const shape = cleaned.split(" ")[0];
    return `area of ${shape}`;
  }
  if (/^arithmetic mean(?: completely)?$/.test(cleaned)) return "arithmetic mean";
  if (/^producers consumers food chain$/.test(cleaned)) return "food chain";
  if (/^circle boundary can be(?: measured)?$/.test(cleaned)) return "circle boundary";
  if (/\bresistors?\s+in\s+series\b.*\btotal resistance\b/.test(cleaned)) return "series resistance rule";
  if (/\bresistors?\s+in\s+parallel\b.*\b(?:reciprocal|total resistance)\b/.test(cleaned)) {
    return "parallel resistance rule";
  }
  if (/^series(?: circuit)? resistance$/.test(cleaned)) return "series resistance rule";
  if (/^parallel(?: circuit)? resistance$/.test(cleaned)) return "parallel resistance rule";
  if (/^series parallel circuit resistance$/.test(cleaned)) return "resistance";
  if (/^heater h(?:'| )?s electrical power$/.test(cleaned)) return "electrical power";
  if (/^suffix$/.test(cleaned)) return "suffix";
  if (/^voltage$/.test(cleaned)) return "voltage";
  if (/^mitosis$/.test(cleaned)) return "mitosis";
  if (/^noun$/.test(cleaned)) return "noun";

  return cleaned;
}

export function inferRequestedFacet(question: string): SemanticFacet | undefined {
  const normalized = normalizeConceptText(question);
  if (/\b(?:formula|equation|relation)\b/.test(normalized)) return "FORMULA";
  if (/\b(?:measured in|unit|units)\b/.test(normalized)) return "UNIT";
  if (/\b(?:purpose|why is|why are|useful|used for)\b/.test(normalized)) return "PURPOSE";
  if (/\b(?:function|role)\b/.test(normalized)) return "FUNCTION";
  if (/\b(?:process|how does|how do|explain|describe)\b/.test(normalized)) return "PROCESS";
  if (/\b(?:limitation|caveat|cannot|can not|does not|do not)\b/.test(normalized)) {
    return "LIMITATION";
  }
  if (/\b(?:effect|consequence|result|happens)\b/.test(normalized)) return "CONSEQUENCE";
  if (/\b(?:method|steps|how to|show how to)\b/.test(normalized)) return "METHOD";
  return "DEFINITION";
}

export function semanticConceptMatches(
  left: SemanticConcept | undefined,
  right: SemanticConcept | undefined
): boolean {
  if (!left || !right) return false;
  if (left.subjectId !== right.subjectId) return false;
  if (left.topicId && right.topicId && left.topicId !== right.topicId) return false;
  return left.baseConcept === right.baseConcept;
}

export function semanticComponentMatches(
  requirement: SemanticComponent,
  evidence: SemanticComponent
): boolean {
  if (!componentKindMatches(requirement.kind, evidence.kind)) return false;
  if (requirement.concept && !semanticConceptMatches(requirement.concept, evidence.concept)) {
    return false;
  }
  if (requirement.symbol && requirement.symbol !== evidence.symbol) return false;
  if (
    requirement.relation &&
    evidence.relation &&
    !semanticTextMatches(evidence.relation, requirement.relation)
  ) {
    return false;
  }
  if (requirement.object && evidence.object && !semanticTextMatches(evidence.object, requirement.object)) {
    return false;
  }
  return constraintsSatisfied(requirement.constraints ?? [], evidence);
}

export function componentKindMatches(
  required: SemanticComponentKind,
  evidence: SemanticComponentKind
): boolean {
  if (required === evidence) return true;
  if (required === "DEFINITION" && evidence === "EXPLICIT_FACT") {
    return true;
  }
  if (required === "PROCESS" && ["PROCESS", "METHOD", "RELATION"].includes(evidence)) return true;
  if (required === "METHOD" && ["METHOD", "PROCESS"].includes(evidence)) return true;
  if (required === "FUNCTION" && ["FUNCTION", "PURPOSE", "RELATION"].includes(evidence)) return true;
  if (required === "PURPOSE" && ["PURPOSE", "FUNCTION"].includes(evidence)) return true;
  if (required === "CONSEQUENCE" && ["CONSEQUENCE", "RELATION"].includes(evidence)) return true;
  return false;
}

export function findMentionedCanonicalConcepts(
  text: string,
  scope?: { subjectId?: string; topicId?: string }
): CanonicalConcept[] {
  const normalized = ` ${singularizeConcept(normalizeConceptText(text))} `;
  const matches = CONTROLLED_CONCEPTS.filter((entry) => {
    const subjectMatches =
      !entry.subjectIds || !scope?.subjectId || entry.subjectIds.includes(scope.subjectId);
    const topicMatches =
      !entry.topicIds || !scope?.topicId || entry.topicIds.includes(scope.topicId);
    return (
      subjectMatches &&
      topicMatches &&
      entry.aliases.some((alias) => {
        const aliasText = singularizeConcept(normalizeConceptText(alias));
        return aliasText.length > 0 && normalized.includes(` ${aliasText} `);
      })
    );
  });

  return matches.map((entry) => ({
    id: entry.id,
    label: entry.label,
    aliases: entry.aliases,
  }));
}

export function makeSemanticComponent(input: SemanticComponent): SemanticComponent {
  return {
    ...input,
    constraints: input.constraints?.filter(Boolean),
  };
}

export function normalizeConceptText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/π/g, "pi")
    .replace(/[×]/g, " x ")
    .replace(/[÷]/g, " / ")
    .replace(/[^a-z0-9%/²³_:+\-=\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function semanticTextMatches(haystack: string, needle: string): boolean {
  const haystackTokens = new Set(toSemanticTokens(haystack));
  const needleTokens = toSemanticTokens(needle);
  if (needleTokens.length === 0) return false;
  const matched = needleTokens.filter((token) => haystackTokens.has(token));
  if (needleTokens.length <= 2) return matched.length === needleTokens.length;
  return matched.length >= Math.max(2, Math.ceil(needleTokens.length * 0.65));
}

export function toSemanticTokens(value: string): string[] {
  const synonymized = normalizeConceptText(value)
    .replace(/\baffects?\b/g, " affect ")
    .replace(/\bchanges?\b/g, " affect ")
    .replace(/\bturns?\b/g, " affect ")
    .replace(/\bcarry\b|\bcarries\b|\btransports?\b/g, " transport ")
    .replace(/\buseful\b|\bused\b|\buses\b/g, " use ")
    .replace(/\bhelps?\b/g, " help ")
    .replace(/\bchance\b|\blikelihood\b/g, " probability ")
    .replace(/\bmainly\b/g, " main ")
    .replace(/\bsummar(?:y|ise|ize|ises|izes)\b/g, " summary ");
  return uniqueStrings(
    synonymized
      .split(" ")
      .map((token) => singularizeConcept(token))
      .filter((token) => token.length > 2 && !SEMANTIC_STOPWORDS.has(token))
  );
}

function constraintsSatisfied(constraints: string[], evidence: SemanticComponent) {
  if (constraints.length === 0) return true;
  const text = `${evidence.text ?? ""} ${evidence.relation ?? ""} ${evidence.object ?? ""} ${
    evidence.concept?.aliases?.join(" ") ?? ""
  }`;
  return constraints.every((constraint) => {
    const normalized = normalizeConceptText(constraint);
    if (normalized === "kinds mentioned") {
      return /\b(?:common|proper|types?|kinds?)\b/i.test(text);
    }
    return semanticTextMatches(text, constraint);
  });
}

function findControlledConcept(
  normalized: string,
  scope?: { subjectId?: string; topicId?: string }
): ConceptAliasEntry | undefined {
  return CONTROLLED_CONCEPTS.find((entry) => {
    const subjectMatches =
      !entry.subjectIds || !scope?.subjectId || entry.subjectIds.includes(scope.subjectId);
    const topicMatches =
      !entry.topicIds || !scope?.topicId || entry.topicIds.includes(scope.topicId);
    return (
      subjectMatches &&
      topicMatches &&
      entry.aliases.some((alias) => singularizeConcept(normalizeConceptText(alias)) === normalized)
    );
  });
}

function singularizeConcept(value: string): string {
  return value
    .split(" ")
    .map((token) => singularizeToken(token))
    .join(" ")
    .trim();
}

function singularizeToken(token: string): string {
  if (/^(?:physics|mathematics|series|species|news)$/.test(token)) return token;
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function slugify(value: string): string {
  return normalizeConceptText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toTitleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

const SEMANTIC_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "when",
  "what",
  "which",
  "how",
  "why",
  "does",
  "have",
  "this",
  "that",
  "into",
  "using",
  "used",
  "use",
  "simple",
  "term",
  "terms",
  "question",
  "card",
  "note",
  "source",
  "sources",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "english",
]);
