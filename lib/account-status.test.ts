import { describe, expect, it } from "vitest";
import { accountStatusDestination } from "./account-status";

describe("account status destinations", () => {
  it.each([
    ["AGE_VERIFICATION_REQUIRED", "/age-verification"],
    ["BELOW_MINIMUM_AGE", "/account-unavailable"],
    ["GUARDIAN_AUTHORIZATION_REQUIRED", "/guardian-authorization-pending"],
    ["GUARDIAN_AUTHORIZATION_DENIED", "/guardian-authorization-pending"],
    ["DEACTIVATED", "/account-deactivated"],
    ["DELETION_PENDING", "/account-deletion-pending"],
    ["ACTIVE", null],
  ])("maps %s to %s", (status, destination) => {
    expect(accountStatusDestination(status)).toBe(destination);
  });
});

