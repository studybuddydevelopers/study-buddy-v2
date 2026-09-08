import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIRECTORY = path.join(process.cwd(), "app");
const METADATA_EXPORT =
  /export const metadata|export (?:async )?function generateMetadata/;

function collectPageFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectPageFiles(entryPath);
    return entry.name === "page.tsx" ? [entryPath] : [];
  });
}

function findMetadataOwner(pageFile: string) {
  const pageSource = fs.readFileSync(pageFile, "utf8");
  if (METADATA_EXPORT.test(pageSource)) {
    return { file: pageFile, source: pageSource };
  }

  let directory = path.dirname(pageFile);
  while (directory !== APP_DIRECTORY && directory.startsWith(APP_DIRECTORY)) {
    const layoutFile = path.join(directory, "layout.tsx");
    if (fs.existsSync(layoutFile)) {
      const layoutSource = fs.readFileSync(layoutFile, "utf8");
      if (METADATA_EXPORT.test(layoutSource)) {
        return { file: layoutFile, source: layoutSource };
      }
    }

    directory = path.dirname(directory);
  }

  return null;
}

describe("page metadata coverage", () => {
  it("gives every page route explicit metadata through the shared policy", () => {
    const failures = collectPageFiles(APP_DIRECTORY).flatMap((pageFile) => {
      const owner = findMetadataOwner(pageFile);
      const relativePage = path.relative(APP_DIRECTORY, pageFile);

      if (!owner) return [`${relativePage}: no metadata export`];
      if (!owner.source.includes("createPageMetadata")) {
        return [
          `${relativePage}: ${path.relative(APP_DIRECTORY, owner.file)} bypasses createPageMetadata`,
        ];
      }
      return [];
    });

    expect(failures).toEqual([]);
  });
});
