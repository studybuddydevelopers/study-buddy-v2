export type ChatModelMessageRole = "system" | "user" | "assistant";

export interface GenerateMessage {
  role: ChatModelMessageRole;
  content: string;
}

export interface GenerateInput {
  messages: GenerateMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  /** Optional shorter deadline for auxiliary requests; disables SDK retries. */
  timeoutMs?: number;
}

export interface GenerateUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface GenerateResult {
  text: string;
  finishReason?: string | null;
  provider: string;
  model: string;
  usage?: GenerateUsage;
}

export interface ChatModelProvider {
  generate(input: GenerateInput): Promise<GenerateResult>;
}

export interface StructuredOutputSchema {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

export interface StructuredGenerateInput extends GenerateInput {
  outputSchema: StructuredOutputSchema;
}

export interface StructuredGenerateResult {
  value: unknown;
  rawText?: string;
  provider: string;
  model: string;
  usage?: GenerateUsage;
}

export interface StructuredChatModelProvider extends ChatModelProvider {
  generateStructured(input: StructuredGenerateInput): Promise<StructuredGenerateResult>;
}

export function supportsStructuredGeneration(
  provider: ChatModelProvider
): provider is StructuredChatModelProvider {
  return "generateStructured" in provider && typeof provider.generateStructured === "function";
}
