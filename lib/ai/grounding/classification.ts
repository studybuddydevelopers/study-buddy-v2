export type GroundedMessageCategory =
  | "SUBSTANTIVE_EDUCATIONAL"
  | "CONVERSATIONAL"
  | "CHAT_CONTEXT_ONLY"
  | "UNSUPPORTED_MODE";

const CONVERSATIONAL_PATTERNS = [
  /^(hi|hello|hey|good morning|good afternoon|good evening)[.!? ]*$/i,
  /^(thanks|thank you|cheers|ok|okay|cool)[.!? ]*$/i,
  /^how are you[?!. ]*$/i,
];

const UNSUPPORTED_MODE_PATTERNS = [
  /\b(hint|solve|mark)\s+mode\b/i,
  /\bmark\s+(my|this|the)\b/i,
  /\bsolve\s+(it|this|the whole|everything)\b/i,
  /\bgive\s+me\s+just\s+the\s+answer\b/i,
];

const SHORT_CONTEXT_ONLY_PATTERNS = [
  /^(why|how|explain more|can you explain that|what about this|and this|what does that mean)[?!. ]*$/i,
  /^(why is it|why does it|why can it|how is it|what is it)\b/i,
];

export interface ClassifyGroundedMessageInput {
  message: string;
  recentMessages?: Array<{ role: "USER" | "ASSISTANT"; content: string }>;
}

export function classifyGroundedMessage(
  input: ClassifyGroundedMessageInput
): GroundedMessageCategory {
  const message = input.message.trim();
  if (!message) return "CONVERSATIONAL";

  if (UNSUPPORTED_MODE_PATTERNS.some((pattern) => pattern.test(message))) {
    return "UNSUPPORTED_MODE";
  }

  if (CONVERSATIONAL_PATTERNS.some((pattern) => pattern.test(message))) {
    return "CONVERSATIONAL";
  }

  const hasRecentEducationalContext = Boolean(
    input.recentMessages?.some((item) => containsEducationalSignal(item.content))
  );
  if (
    hasRecentEducationalContext &&
    SHORT_CONTEXT_ONLY_PATTERNS.some((pattern) => pattern.test(message))
  ) {
    return "CHAT_CONTEXT_ONLY";
  }

  return "SUBSTANTIVE_EDUCATIONAL";
}

export function containsEducationalSignal(value: string) {
  return /\b(waec|math|mathematics|english|biology|chemistry|physics|question|answer|formula|equation|ratio|fraction|algebra|geometry|number|acceleration|area|current|density|force|pressure|resistance|speed|topic|subject|velocity|voltage)\b/i.test(
    value
  );
}
