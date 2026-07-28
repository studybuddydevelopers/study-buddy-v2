import { describe, expect, it } from "vitest";
import {
  FAILED_ASSISTANT_MESSAGE,
  getChatErrorMessage,
  isGenerationFailureCode,
} from "./chatFailureCopy";

describe("chat failure copy", () => {
  it("does not expose internal generation failure codes in user-facing copy", () => {
    expect(isGenerationFailureCode("PROVIDER_ERROR")).toBe(true);
    expect(isGenerationFailureCode("INVALID_PROVIDER_RESPONSE")).toBe(true);
    expect(getChatErrorMessage("PROVIDER_ERROR")).not.toContain("PROVIDER_ERROR");
    expect(getChatErrorMessage("INVALID_PROVIDER_RESPONSE")).not.toContain(
      "INVALID_PROVIDER_RESPONSE"
    );
    expect(FAILED_ASSISTANT_MESSAGE).not.toMatch(
      /PROVIDER_ERROR|INVALID_PROVIDER_RESPONSE|INTERNAL_ERROR/
    );
  });

  it("keeps ordinary errors readable", () => {
    expect(getChatErrorMessage("Chat not found")).toBe("Chat not found");
    expect(getChatErrorMessage("")).toBe("Something went wrong. Please try again.");
  });
});
