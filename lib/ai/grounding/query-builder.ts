import { containsEducationalSignal } from "./classification";

export const QUERY_CONTEXT_MESSAGE_LIMIT = 8;
export const QUERY_CONTEXT_TOKEN_LIMIT = 550;
export const RETRIEVAL_QUERY_MAX_CHARS = 1_000;

export interface GroundedQueryMessage {
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface BuildStandaloneRetrievalQueryInput {
  message: string;
  subjectName?: string | null;
  topicTitle?: string | null;
  recentMessages?: GroundedQueryMessage[];
}

export function buildStandaloneRetrievalQuery(
  input: BuildStandaloneRetrievalQueryInput
) {
  const current = normalizeText(input.message);
  const contextWindow = buildBoundedRecentContext(input.recentMessages ?? []);
  const nounPhraseContext = extractEducationalNounPhrases(contextWindow)
    .slice(0, 8)
    .join(" ");
  const contextPrefix = [
    input.subjectName ? `Subject: ${input.subjectName}` : null,
    input.topicTitle ? `Topic: ${input.topicTitle}` : null,
    isShortFollowUp(current) && nounPhraseContext
      ? `Relevant context: ${nounPhraseContext}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  return [contextPrefix, current]
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .slice(0, RETRIEVAL_QUERY_MAX_CHARS)
    .trim();
}

export function buildBoundedRecentContext(messages: GroundedQueryMessage[]) {
  const selected: GroundedQueryMessage[] = [];
  let tokenCount = 0;

  for (const message of [...messages].reverse()) {
    if (selected.length >= QUERY_CONTEXT_MESSAGE_LIMIT) break;
    const normalized = normalizeText(message.content);
    if (!normalized || !containsEducationalSignal(normalized)) continue;
    const estimate = estimateTokens(normalized);
    if (tokenCount + estimate > QUERY_CONTEXT_TOKEN_LIMIT && selected.length > 0) {
      break;
    }
    tokenCount += estimate;
    selected.push({ role: message.role, content: normalized });
  }

  return selected.reverse();
}

function isShortFollowUp(value: string) {
  return value.length <= 80 && /^(why|how|what|and|can you|explain|why is|why does|what about)\b/i.test(value);
}

function extractEducationalNounPhrases(messages: GroundedQueryMessage[]) {
  const text = messages.map((message) => message.content).join(" ");
  const matches = text.match(
    /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|acceleration|velocity|force|ratio|equivalent ratios?|fraction|equation|linear equation|formula|algebra|geometry|number|numeration|probability|percentage|discount|angle|triangle|quadratic|simultaneous equations|ohm'?s law|voltage|current|resistance|density|litmus|photosynthesis|main idea|supporting details)\b/gi
  );
  return Array.from(new Set((matches ?? []).map((item) => item.toLowerCase())));
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}
