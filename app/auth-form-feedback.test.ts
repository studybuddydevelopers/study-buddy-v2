import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const AUTH_CLIENTS = [
  "forgot-password/ForgotPasswordClient.tsx",
  "login/LoginClient.tsx",
  "sign-up/SignUpClient.tsx",
] as const;

describe("authentication form feedback", () => {
  it.each(AUTH_CLIENTS)("keeps errors inline in %s", (relativePath) => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", relativePath),
      "utf8"
    );

    expect(source).not.toMatch(/\b(?:window\.)?alert\s*\(/);
    expect(source).toContain("<FormErrorMessage");
    expect(source).toContain("readResponseError");
  });
});
