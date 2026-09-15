import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PasswordResetRecoveryClient, {
  RecoveryEmailSentSummary,
} from "./PasswordResetRecoveryClient";

describe("PasswordResetRecoveryClient", () => {
  it("explains the protected recovery flow before anything changes", () => {
    const html = renderToStaticMarkup(
      createElement(PasswordResetRecoveryClient)
    );

    expect(html).toContain("Recover your locked account");
    expect(html).toContain("What happens when you continue");
    expect(html).toContain("Open a secure recovery window");
    expect(html).toContain("Nothing has changed yet");
    expect(html).toContain("Checking the secure recovery link");
    expect(html).toContain("Start secure recovery");
    expect(html).not.toContain("provider lock");
    expect(html).not.toContain("<main");
  });

  it("gives clear next steps after the recovery email is sent", () => {
    const html = renderToStaticMarkup(
      createElement(RecoveryEmailSentSummary)
    );

    expect(html).toContain("Password-reset instructions have been sent");
    expect(html).toContain("Finish the recovery");
    expect(html).toContain("Use the newest email only");
    expect(html).toContain('aria-live="polite"');
  });
});
