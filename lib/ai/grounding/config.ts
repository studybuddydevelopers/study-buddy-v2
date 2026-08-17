export const GROUNDING_VERSION = "stage4-grounded-teach-v1";
export const GROUNDED_PROMPT_VERSION = "grounded-teach-prompt-v1.6";
export const SUFFICIENCY_POLICY_VERSION = "sufficiency-policy-v1.15";
export const GROUNDING_VALIDATOR_VERSION = "grounding-validator-v1.11";
export const CAPABILITY_GROUNDING_VERSION = "stage4.1-capability-grounding-v1";
export const CAPABILITY_GROUNDED_PROMPT_VERSION =
  "capability-grounded-teach-prompt-v1";

export type GroundingPipelineKind = "legacy" | "capability";

export function isGroundedChatEnabled() {
  return parseBooleanFlag(process.env.AI_GROUNDED_CHAT_ENABLED, false);
}

export function getSelectedGroundingPipeline(): GroundingPipelineKind {
  return resolveGroundingPipelineKind(process.env.AI_GROUNDING_PIPELINE);
}

export function resolveGroundingPipelineKind(
  selected: string | null | undefined
): GroundingPipelineKind {
  if (selected !== "capability") return "legacy";
  return process.env.NODE_ENV === "production" ? "legacy" : "capability";
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
}
