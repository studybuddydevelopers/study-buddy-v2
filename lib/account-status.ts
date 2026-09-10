export function accountStatusDestination(status: string | null | undefined) {
  if (status === "AGE_VERIFICATION_REQUIRED") return "/age-verification";
  if (status === "BELOW_MINIMUM_AGE") return "/account-unavailable";
  if (
    status === "GUARDIAN_AUTHORIZATION_REQUIRED" ||
    status === "GUARDIAN_AUTHORIZATION_DENIED"
  ) {
    return "/guardian-authorization-pending";
  }
  if (status === "DEACTIVATED") return "/account-deactivated";
  if (status === "DELETION_PENDING") return "/account-deletion-pending";
  return null;
}

