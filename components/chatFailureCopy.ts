const GENERATION_FAILURE_CODES = new Set([
  "PROVIDER_TIMEOUT",
  "RATE_LIMITED",
  "PROVIDER_ERROR",
  "INVALID_PROVIDER_RESPONSE",
  "INTERNAL_ERROR",
]);

export const FAILED_ASSISTANT_MESSAGE =
  "I couldn't finish that response. Please try again.";

export function isGenerationFailureCode(value: unknown) {
  return typeof value === "string" && GENERATION_FAILURE_CODES.has(value);
}

export function getChatErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (isGenerationFailureCode(message)) {
    return "I couldn't finish that response. You can retry it from the message.";
  }

  return message || "Something went wrong. Please try again.";
}
