import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");

describe("embedding provider import boundaries", () => {
  it("keeps OpenAI SDK imports isolated to adapter files", () => {
    const files = collectTsFiles([
      path.join(repoRoot, "lib/ai/embeddings"),
      path.join(repoRoot, "lib/resources/retrieval"),
      path.join(repoRoot, "scripts"),
    ]);
    const offenders = files.filter((file) => {
      const relative = path.relative(repoRoot, file);
      if (relative === "lib/ai/chat/openai-provider.ts") return false;
      if (relative === "lib/ai/embeddings/openai-provider.ts") return false;
      if (relative.endsWith(".test.ts")) return false;
      return /from\s+["']openai["']|require\(["']openai["']\)/.test(
        fs.readFileSync(file, "utf8")
      );
    });

    expect(offenders.map((file) => path.relative(repoRoot, file))).toEqual([]);
  });
});

function collectTsFiles(dirs: string[]) {
  const files: string[] = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectTsFiles([fullPath]));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
  }
  return files;
}
