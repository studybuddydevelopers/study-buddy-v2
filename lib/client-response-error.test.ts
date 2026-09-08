import { describe, expect, it } from "vitest";
import { readResponseError } from "./client-response-error";

describe("readResponseError", () => {
  it("prefers a human-readable message over an error code", async () => {
    const response = Response.json(
      { error: "RATE_LIMITED", message: "Please wait before trying again." },
      { status: 429 }
    );

    await expect(readResponseError(response, "Try again.")).resolves.toBe(
      "Please wait before trying again."
    );
  });

  it("uses a non-empty error when no message is provided", async () => {
    const response = Response.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );

    await expect(readResponseError(response, "Login failed.")).resolves.toBe(
      "Invalid email or password."
    );
  });

  it("falls back safely for malformed responses", async () => {
    const response = new Response("Service unavailable", { status: 503 });

    await expect(readResponseError(response, "Try again later.")).resolves.toBe(
      "Try again later."
    );
  });
});
