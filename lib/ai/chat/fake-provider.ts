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
      buildStructuredValue(runtimeControl.structuredMode ?? "VALID", result.text);

    return {
      value,
      rawText: JSON.stringify(value),
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    };
  }
}

function buildStructuredValue(mode: FakeStructuredChatMode, text: string) {
  switch (mode) {
    case "EMPTY_ANSWER":
      return {
        answer: "",
        citations: [{ sourceLabel: "SOURCE_1" }],
        insufficientContext: false,
      };
    case "MALFORMED":
      return { answer: text };
    case "UNKNOWN_LABEL":
      return {
        answer: `${text} [SOURCE_9]`,
        citations: [{ sourceLabel: "SOURCE_9" }],
        insufficientContext: false,
      };
    case "MISSING_CITATION":
      return {
        answer: text,
        citations: [],
        insufficientContext: false,
      };
    case "OBJECT_WITHOUT_MARKER":
      return {
        answer: text,
        citations: [{ sourceLabel: "SOURCE_1" }],
        insufficientContext: false,
      };
    case "MARKER_WITHOUT_OBJECT":
      return {
        answer: `${text} [SOURCE_1]`,
        citations: [],
        insufficientContext: false,
      };
    case "DUPLICATE_LABEL":
      return {
        answer: `${text} [SOURCE_1]`,
        citations: [{ sourceLabel: "SOURCE_1" }, { sourceLabel: "SOURCE_1" }],
        insufficientContext: false,
      };
    case "INSUFFICIENT_FACTUAL":
      return {
        answer: "The factual answer is unsupported.",
        citations: [],
        insufficientContext: true,
      };
    case "EXCESSIVE_SUGGESTIONS":
      return {
        answer: `${text} [SOURCE_1]`,
        citations: [{ sourceLabel: "SOURCE_1" }],
        insufficientContext: false,
        suggestedQuestions: ["one", "two", "three", "four"],
      };
    case "FAKE_LINK_CITATION":
      return {
        answer: `${text} [SOURCE_1](https://example.test/source)`,
        citations: [{ sourceLabel: "SOURCE_1" }],
        insufficientContext: false,
      };
    case "VALID":
    default:
      return {
        answer: `${text} [SOURCE_1]`,
        citations: [{ sourceLabel: "SOURCE_1" }],
        insufficientContext: false,
        suggestedQuestions: [],
      };
  }
}
