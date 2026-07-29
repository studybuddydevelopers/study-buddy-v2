import { describe, expect, it } from "vitest";
import { resourceJsonResponse } from "./http";

describe("resource API response privacy", () => {
  it("redacts private storage bucket and path fields recursively", async () => {
    const response = resourceJsonResponse({
      resource: {
        id: "resource-1",
        storageBucket: "resources-private",
        storagePath: "resources/resource-1/v1/file.md",
        chunks: [
          {
            id: "chunk-1",
            content: "Visible extracted text",
            storagePath: "should-not-leak",
          },
        ],
      },
    });

    const body = await response.json();

    expect(body.resource.storageBucket).toBeUndefined();
    expect(body.resource.storagePath).toBeUndefined();
    expect(body.resource.chunks[0].storagePath).toBeUndefined();
    expect(body.resource.chunks[0].content).toBe("Visible extracted text");
  });
});
