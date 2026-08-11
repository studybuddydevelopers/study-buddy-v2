export const GROUNDING_VERSION = "stage4-grounded-teach-v1";
export const GROUNDED_PROMPT_VERSION = "grounded-teach-prompt-v1.6";
export const SUFFICIENCY_POLICY_VERSION = "sufficiency-policy-v1.6";
export const GROUNDING_VALIDATOR_VERSION = "grounding-validator-v1.5";

export function isGroundedChatEnabled() {
  return parseBooleanFlag(process.env.AI_GROUNDED_CHAT_ENABLED, false);
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
}
