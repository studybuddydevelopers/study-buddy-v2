import { describe, expect, it } from "vitest";
import {
  parseFormDataRequest,
  parseJsonObjectRequest,
  parseJsonRequest,
} from "./request-body";

describe("bounded request body parsing", () => {
  it("parses a JSON object below the byte limit", async () => {
    const result = await parseJsonObjectRequest(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ message: "hello" }),
      }),
      64
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ message: "hello" });
  });

  it("rejects a declared body larger than the route limit", async () => {
    const result = await parseJsonRequest(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "Content-Length": "1024" },
        body: "{}",
      }),
      32
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("rejects an oversized streamed body without Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"value":"'));
        controller.enqueue(new TextEncoder().encode("x".repeat(100)));
        controller.enqueue(new TextEncoder().encode('"}'));
        controller.close();
      },
    });

    const result = await parseJsonRequest(
      new Request("http://localhost/api", {
        method: "POST",
        body: stream,
        duplex: "half",
      } as RequestInit & { duplex: "half" }),
      32
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("parses bounded multipart form data", async () => {
    const form = new FormData();
    form.set("title", "Revision guide");
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: form,
    });

    const result = await parseFormDataRequest(request, 1024);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.get("title")).toBe("Revision guide");
  });
});
