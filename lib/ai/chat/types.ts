export type ChatModelMessageRole = "system" | "user" | "assistant";

export interface GenerateMessage {
  role: ChatModelMessageRole;
  content: string;
}

export interface GenerateInput {
  messages: GenerateMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
  usage?: GenerateUsage;
}

export interface ChatModelProvider {
  generate(input: GenerateInput): Promise<GenerateResult>;
}
