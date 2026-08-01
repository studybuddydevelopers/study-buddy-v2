import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Stage 4 grounding provider boundaries", () => {
  it("does not import the OpenAI SDK outside provider adapters", () => {
    const dir = path.resolve(__dirname);
    const files = walkFiles(dir).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts")
    );

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      expect(source).not.toMatch(/from ["']openai["']|new OpenAI/);
    }
  });
});

function walkFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}
