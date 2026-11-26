import { ageOnDate, INDEPENDENT_ACCOUNT_AGE } from "@/lib/account-age";

export function getAiAccessRestriction(
  dateOfBirth: Date | null | undefined,
  aiAccessAuthorized: boolean,
) {
  if (!dateOfBirth || !Number.isFinite(dateOfBirth.getTime())) {
    return {
      error: "AI_AGE_REQUIRED",
      message: "A confirmed date of birth is required to use AI features.",
    };
  }
  if (ageOnDate(dateOfBirth) < INDEPENDENT_ACCOUNT_AGE) {
    return {
      error: "AI_AGE_RESTRICTED",
      message: "AI features are currently paused for users under 18.",
    };
  }
  if (!aiAccessAuthorized) {
    return {
      error: "AI_AUTHORIZATION_REQUIRED",
      message: "AI features have not been authorised for this account.",
    };
  }
  return null;
}
