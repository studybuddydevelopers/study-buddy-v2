import { AiGenerationFailureCode } from "@prisma/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ChatProviderError } from "./errors";
import type {
  ChatModelProvider,
  GenerateInput,
  GenerateResult,
  StructuredGenerateInput,
  StructuredGenerateResult,
} from "./types";

const FAKE_CHAT_MODES = [
  "SUCCESS",
  "DELAYED_SUCCESS",
  "FAILURE",
  "INVALID_RESPONSE",
] as const;
const FAKE_STRUCTURED_CHAT_MODES = [
  "VALID",
  "EMPTY_ANSWER",
  "MALFORMED",
  "UNKNOWN_LABEL",
  "MISSING_CITATION",
  "OBJECT_WITHOUT_MARKER",
  "MARKER_WITHOUT_OBJECT",
  "DUPLICATE_LABEL",
  "INSUFFICIENT_FACTUAL",
  "EXCESSIVE_SUGGESTIONS",
  "FAKE_LINK_CITATION",
  "WRONG_SEMANTIC_QUANTITY",
  "CONTRADICTORY_CALCULATION",
  "INVENTED_CALCULATION_PATH",
  "FORMULA_OMIT_VARIABLE",
  "FORMULA_INVENTED_SYMBOL",
  "FORMULA_UNSUPPORTED_RELATION",
  "VALID_REPAIRED",
] as const;

type FakeChatMode = (typeof FAKE_CHAT_MODES)[number];
type FakeStructuredChatMode = (typeof FAKE_STRUCTURED_CHAT_MODES)[number];

interface FakeChatModelProviderOptions {
  text?: string;
  structuredValue?: unknown;
  provider?: string;
  model?: string;
  delayMs?: number;
  failWith?: AiGenerationFailureCode;
  mode?: FakeChatMode;
  usage?: GenerateResult["usage"];
}

interface FakeChatRuntimeControl {
  mode?: FakeChatMode;
  structuredMode?: FakeStructuredChatMode;
  delayMs?: number;
  failureCode?: AiGenerationFailureCode;
}

type FakeStructuredContract = {
  sourceLabels?: string[];
  authorisedMethods?: Array<{
    targetQuantity?: string;
    expression?: string;
    result?: string;
    sourceLabels?: string[];
  }>;
  expressions?: string[];
  requiredVariables?: Array<{
    symbol?: string;
    meaning?: string;
    sourceLabels?: string[];
  }>;
  requiredConditions?: Array<{
    text?: string;
    sourceLabels?: string[];
  }>;
};

function isFakeChatMode(value: unknown): value is FakeChatMode {
  return (
    typeof value === "string" &&
    FAKE_CHAT_MODES.includes(value as FakeChatMode)
  );
}

function isFailureCode(value: unknown): value is AiGenerationFailureCode {
  return (
    typeof value === "string" &&
    Object.values(AiGenerationFailureCode).includes(
      value as AiGenerationFailureCode
    )
  );
}

function isFakeStructuredChatMode(
  value: unknown
): value is FakeStructuredChatMode {
  return (
    typeof value === "string" &&
    FAKE_STRUCTURED_CHAT_MODES.includes(value as FakeStructuredChatMode)
  );
}

function parseDelayMs(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 30_000) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Invalid fake provider delay."
    );
  }

  return Math.floor(numeric);
}

function parseRuntimeControlObject(value: unknown): FakeChatRuntimeControl {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Invalid fake provider control file."
    );
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "mode",
    "structuredMode",
    "delayMs",
    "failureCode",
  ]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Invalid fake provider control key."
    );
  }

  const mode = record.mode === undefined ? undefined : record.mode;
  const failureCode =
    record.failureCode === undefined ||
    record.failureCode === null ||
    record.failureCode === ""
      ? undefined
      : record.failureCode;

  if (mode !== undefined && !isFakeChatMode(mode)) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Invalid fake provider mode."
    );
  }
  if (
    record.structuredMode !== undefined &&
    !isFakeStructuredChatMode(record.structuredMode)
  ) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Invalid fake structured provider mode."
    );
  }

  if (failureCode !== undefined && !isFailureCode(failureCode)) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Invalid fake provider failure code."
    );
  }

  return {
    mode: mode as FakeChatMode | undefined,
    structuredMode: record.structuredMode as FakeStructuredChatMode | undefined,
    delayMs: parseDelayMs(record.delayMs),
    failureCode,
  };
}

function assertSafeControlFilePath(filePath: string) {
  const resolved = path.resolve(filePath);
  const tmpRoot = path.resolve(os.tmpdir());
  const privateTmpRoot = path.resolve("/private/tmp");
  const slashTmpRoot = path.resolve("/tmp");

  if (
    !path.isAbsolute(filePath) ||
    !(
      resolved.startsWith(`${tmpRoot}${path.sep}`) ||
      resolved.startsWith(`${privateTmpRoot}${path.sep}`) ||
      resolved.startsWith(`${slashTmpRoot}${path.sep}`)
    )
  ) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Fake provider control file must be in an OS temporary directory."
    );
  }

  return resolved;
}

function readRuntimeControlFile(filePath: string) {
  const resolved = assertSafeControlFilePath(filePath);
  const raw = fs.readFileSync(resolved, "utf8");
  return parseRuntimeControlObject(JSON.parse(raw));
}

function getRuntimeControl(): FakeChatRuntimeControl {
  if (process.env.AI_CHAT_PROVIDER !== "fake") return {};

  const hasRuntimeControls =
    process.env.AI_FAKE_CHAT_MODE ||
    process.env.AI_FAKE_STRUCTURED_CHAT_MODE ||
    process.env.AI_FAKE_CHAT_DELAY_MS ||
    process.env.AI_FAKE_CHAT_FAILURE_CODE ||
    process.env.AI_FAKE_CHAT_CONTROL_FILE;

  if (process.env.NODE_ENV === "production" && hasRuntimeControls) {
    throw new ChatProviderError(
      AiGenerationFailureCode.INTERNAL_ERROR,
      "Fake provider runtime controls are not available in production."
    );
  }

  const controlFile = process.env.AI_FAKE_CHAT_CONTROL_FILE;
  if (controlFile) {
    return readRuntimeControlFile(controlFile);
  }

  return parseRuntimeControlObject({
    mode: process.env.AI_FAKE_CHAT_MODE || undefined,
    structuredMode: process.env.AI_FAKE_STRUCTURED_CHAT_MODE || undefined,
    delayMs: process.env.AI_FAKE_CHAT_DELAY_MS || undefined,
    failureCode: process.env.AI_FAKE_CHAT_FAILURE_CODE || undefined,
  });
}

export class FakeChatModelProvider implements ChatModelProvider {
  private readonly options: FakeChatModelProviderOptions;
  invocationCount = 0;

  constructor(options: FakeChatModelProviderOptions = {}) {
    this.options = options;
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    void input;
    this.invocationCount += 1;
    const runtimeControl = getRuntimeControl();
    const mode = runtimeControl.mode ?? this.options.mode ?? "SUCCESS";
    const delayMs =
      runtimeControl.delayMs ??
      this.options.delayMs ??
      (mode === "DELAYED_SUCCESS" ? 1_000 : undefined);
    const failureCode =
      runtimeControl.failureCode ??
      this.options.failWith ??
      AiGenerationFailureCode.PROVIDER_ERROR;

    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (mode === "FAILURE" || this.options.failWith) {
      throw new ChatProviderError(failureCode);
    }

    if (mode === "INVALID_RESPONSE") {
      return {
        text: "",
        provider: this.options.provider ?? "fake",
        model: this.options.model ?? "fake-chat-model",
        usage: this.options.usage,
      };
    }

    return {
      text: this.options.text ?? "Fake tutor response.",
      provider: this.options.provider ?? "fake",
      model: this.options.model ?? "fake-chat-model",
      usage: this.options.usage,
    };
  }

  async generateStructured(
    input: StructuredGenerateInput
  ): Promise<StructuredGenerateResult> {
    const result = await this.generate(input);
    const runtimeControl = getRuntimeControl();
    const value =
      this.options.structuredValue ??
      buildStructuredValue(input, runtimeControl.structuredMode ?? "VALID", result.text);

    return {
      value,
      rawText: JSON.stringify(value),
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    };
  }
}

function buildStructuredValue(
  input: StructuredGenerateInput,
  mode: FakeStructuredChatMode,
  text: string
) {
  if (input.outputSchema.name === "capability_structured_calculation_response") {
    return buildStructuredCalculationValue(input, mode);
  }
  if (input.outputSchema.name === "capability_structured_formula_response") {
    return buildStructuredFormulaValue(input, mode);
  }
  const contract = extractStructuredPromptContract(input);
  const validSegment = {
    text:
      text === "Fake tutor response."
        ? buildDefaultGroundedText(contract.evidenceText) ?? contract.evidenceText ?? text
        : text,
    sourceLabels: contract.sourceLabels,
  };
  switch (mode) {
    case "EMPTY_ANSWER":
      return {
        answerSegments: [],
        insufficientContext: false,
        suggestedQuestions: [],
      };
    case "MALFORMED":
      return { answer: text };
    case "UNKNOWN_LABEL":
      return {
        answerSegments: [{ ...validSegment, sourceLabels: ["SOURCE_9"] }],
        insufficientContext: false,
        suggestedQuestions: [],
      };
    case "MISSING_CITATION":
      return {
        answerSegments: [{ ...validSegment, sourceLabels: [] }],
        insufficientContext: false,
        suggestedQuestions: [],
      };
    case "OBJECT_WITHOUT_MARKER":
      return {
        answerSegments: [validSegment],
        insufficientContext: false,
        suggestedQuestions: [],
      };
    case "MARKER_WITHOUT_OBJECT":
      return {
        answerSegments: [{ ...validSegment, text: `${text} [SOURCE_1]`, sourceLabels: [] }],
        insufficientContext: false,
        suggestedQuestions: [],
      };
    case "DUPLICATE_LABEL":
      return {
        answerSegments: [
          { ...validSegment, sourceLabels: [contract.sourceLabels[0] ?? "SOURCE_1", contract.sourceLabels[0] ?? "SOURCE_1"] },
        ],
        insufficientContext: false,
        suggestedQuestions: [],
      };
    case "INSUFFICIENT_FACTUAL":
      return {
        answerSegments: [{ text: "The factual answer is unsupported.", sourceLabels: [] }],
        insufficientContext: true,
        suggestedQuestions: [],
      };
    case "EXCESSIVE_SUGGESTIONS":
      return {
        answerSegments: [validSegment],
        insufficientContext: false,
        suggestedQuestions: ["one", "two", "three", "four"],
      };
    case "FAKE_LINK_CITATION":
      return {
        answerSegments: [
          { ...validSegment, text: `${text} [SOURCE_1](https://example.test/source)` },
        ],
        insufficientContext: false,
        suggestedQuestions: [],
      };
    case "VALID":
    default:
      return {
        answerSegments: [validSegment],
        insufficientContext: false,
        suggestedQuestions: [],
      };
  }
}

function buildStructuredCalculationValue(
  input: StructuredGenerateInput,
  mode: FakeStructuredChatMode
) {
  const contract = extractJsonBlock(input, "calculation_contract");
  const labels = contract.sourceLabels ?? ["SOURCE_1"];
  const repaired = input.messages.some((message) =>
    /Repair the previous JSON object/i.test(message.content)
  );
  if (mode === "VALID_REPAIRED" && !repaired) {
    return {
      steps: [
        {
          targetQuantity: "girls",
          expression: "2 * 5",
          result: "10",
          unit: "",
          sourceLabels: labels,
        },
      ],
      finalQuantity: "girls",
      finalResult: "10",
      finalUnit: "",
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }
  if (mode === "WRONG_SEMANTIC_QUANTITY") {
    return {
      steps: [
        {
          targetQuantity: "girls",
          expression: "2 * 5",
          result: "10",
          unit: "",
          sourceLabels: labels,
        },
      ],
      finalQuantity: "girls",
      finalResult: "10",
      finalUnit: "",
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }
  if (mode === "CONTRADICTORY_CALCULATION") {
    return {
      steps: [
        {
          targetQuantity: "girls",
          expression: "3 * 5",
          result: "15",
          unit: "",
          sourceLabels: labels,
        },
        {
          targetQuantity: "girls",
          expression: "2 * 5",
          result: "10",
          unit: "",
          sourceLabels: labels,
        },
      ],
      finalQuantity: "girls",
      finalResult: "15",
      finalUnit: "",
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }
  if (mode === "INVENTED_CALCULATION_PATH") {
    return {
      steps: [
        {
          targetQuantity: "one part",
          expression: "10 / 3",
          result: "3.33",
          unit: "",
          sourceLabels: labels,
        },
      ],
      finalQuantity: "girls",
      finalResult: "15",
      finalUnit: "",
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }

  if (Array.isArray(contract.authorisedMethods) && contract.authorisedMethods.length > 0) {
    const steps = contract.authorisedMethods.map(
      (method: {
        targetQuantity?: string;
        expression?: string;
        result?: string;
        sourceLabels?: string[];
      }) => ({
        targetQuantity: method.targetQuantity ?? "result",
        expression: method.expression ?? "1 + 1",
        result: method.result ?? "2",
        unit: "",
        sourceLabels: method.sourceLabels ?? labels,
      })
    );
    const finalStep = steps[steps.length - 1];
    return {
      steps,
      finalQuantity: finalStep?.targetQuantity ?? "result",
      finalResult: finalStep?.result ?? "2",
      finalUnit: "",
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }

  return {
    steps: [
      {
        targetQuantity: "one part",
        expression: "10 / 2",
        result: "5",
        unit: "",
        sourceLabels: labels,
      },
      {
        targetQuantity: "girls",
        expression: "3 * 5",
        result: "15",
        unit: "",
        sourceLabels: labels,
      },
    ],
    finalQuantity: "girls",
    finalResult: "15",
    finalUnit: "",
    sourceLabels: labels,
    suggestedQuestions: [],
  };
}

function buildStructuredFormulaValue(
  input: StructuredGenerateInput,
  mode: FakeStructuredChatMode
) {
  const contract = extractJsonBlock(input, "formula_contract");
  const labels = contract.sourceLabels ?? ["SOURCE_1"];
  const repaired = input.messages.some((message) =>
    /Repair the previous JSON object/i.test(message.content)
  );
  if (mode === "VALID_REPAIRED" && !repaired) {
    return {
      expression: "Area = 1/2 * b * h",
      variables: [
        { symbol: "b", meaning: "base", sourceLabels: labels },
      ],
      conditions: [],
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }
  if (mode === "FORMULA_OMIT_VARIABLE") {
    return {
      expression: "Area = 1/2 * base * height",
      variables: [{ symbol: "base", meaning: "base", sourceLabels: labels }],
      conditions: [{ text: "height meets the base at a right angle", sourceLabels: labels }],
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }
  if (mode === "FORMULA_INVENTED_SYMBOL") {
    return {
      expression: "Area = 1/2 * b * h",
      variables: [
        { symbol: "b", meaning: "base", sourceLabels: labels },
        { symbol: "h", meaning: "perpendicular height", sourceLabels: labels },
      ],
      conditions: [{ text: "h meets b at a right angle", sourceLabels: labels }],
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }
  if (mode === "FORMULA_UNSUPPORTED_RELATION") {
    return {
      expression: "Area = 1/2 * base * height",
      variables: [
        { symbol: "base", meaning: "base", sourceLabels: labels },
        { symbol: "height", meaning: "perpendicular height", sourceLabels: labels },
      ],
      conditions: [
        { text: "height is drawn from the opposite vertex to the base", sourceLabels: labels },
      ],
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }

  if (Array.isArray(contract.expressions) && Array.isArray(contract.requiredVariables)) {
    return {
      expression: contract.expressions[0] ?? "Area = 1/2 * base * height",
      variables: contract.requiredVariables.map(
        (variable: {
          symbol?: string;
          meaning?: string;
          sourceLabels?: string[];
        }) => ({
          symbol: variable.symbol ?? "base",
          meaning: variable.meaning ?? "base",
          sourceLabels: variable.sourceLabels ?? labels,
        })
      ),
      conditions: Array.isArray(contract.requiredConditions)
        ? contract.requiredConditions.map(
            (condition: { text?: string; sourceLabels?: string[] }) => ({
              text: condition.text ?? "height meets the base at a right angle",
              sourceLabels: condition.sourceLabels ?? labels,
            })
          )
        : [],
      sourceLabels: labels,
      suggestedQuestions: [],
    };
  }

  return {
    expression: "Area = 1/2 * base * height",
    variables: [
      { symbol: "base", meaning: "base", sourceLabels: labels },
      { symbol: "height", meaning: "perpendicular height", sourceLabels: labels },
    ],
    conditions: [{ text: "height meets the base at a right angle", sourceLabels: labels }],
    sourceLabels: labels,
    suggestedQuestions: [],
  };
}

function extractJsonBlock(input: StructuredGenerateInput, tagName: string) {
  const text = input.messages.map((message) => message.content).join("\n");
  const pattern = new RegExp(`<${tagName}>\\n([\\s\\S]*?)\\n<\\/${tagName}>`);
  const raw = text.match(pattern)?.[1];
  if (!raw) return { sourceLabels: ["SOURCE_1"] };
  try {
    return JSON.parse(raw) as FakeStructuredContract;
  } catch {
    return { sourceLabels: ["SOURCE_1"] };
  }
}

function extractStructuredPromptContract(input: StructuredGenerateInput) {
  const text = input.messages.map((message) => message.content).join("\n");
  const sourceLabels = uniqueStrings(
    [...text.matchAll(/\bSOURCE_[1-9][0-9]*\b/g)].map((match) => match[0] ?? "")
  );

  return {
    sourceLabels: sourceLabels.length > 0 ? sourceLabels : ["SOURCE_1"],
    evidenceText:
      [...text.matchAll(/—\s*"([^"]+)"/g)]
        .map((match) => match[1])
        .filter(Boolean)
        .join(" ") || undefined,
  };
}

function buildDefaultGroundedText(evidenceText: string | undefined) {
  if (!evidenceText) return undefined;
  if (/blue counters/i.test(evidenceText) && /red counters/i.test(evidenceText)) {
    return "Mathematics 2021 Question 5 asks about counters. The evidence gives 20 red counters and 25 blue counters, so the answer is 25 blue counters.";
  }
  if (/discount/i.test(evidenceText) && /\bsale price\b/i.test(evidenceText)) {
    return "A 20 percent discount on 500 is 100, so the sale price is 400.";
  }
  if (/ohm'?s law/i.test(evidenceText)) {
    return "Ohm's law is V = I x R. V means voltage, I means current, and R means resistance. Voltage is measured in volts, current in amperes, and resistance in ohms.";
  }
  return evidenceText;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
