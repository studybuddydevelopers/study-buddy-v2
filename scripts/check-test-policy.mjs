import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const TEST_FILE_PATTERN = /\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/;
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "output",
]);
const TEST_ROOTS = new Set(["describe", "it", "suite", "test"]);
const REPORTED_MARKERS = new Set(["fail", "fails", "fixme", "skip", "todo"]);

function propertyChain(node) {
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isPropertyAccessExpression(node)) {
    const parent = propertyChain(node.expression);
    return parent ? [...parent, node.name.text] : null;
  }
  if (
    ts.isElementAccessExpression(node) &&
    node.argumentExpression &&
    (ts.isStringLiteral(node.argumentExpression) ||
      ts.isNoSubstitutionTemplateLiteral(node.argumentExpression))
  ) {
    const parent = propertyChain(node.expression);
    return parent ? [...parent, node.argumentExpression.text] : null;
  }
  return null;
}

function locationFor(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1, column: position.character + 1 };
}

function enabledOptionMarkers(call) {
  const markers = [];
  for (const argument of call.arguments) {
    if (!ts.isObjectLiteralExpression(argument)) continue;
    for (const property of argument.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? property.name.text
        : null;
      if (!name || (name !== "only" && !REPORTED_MARKERS.has(name))) continue;
      const value = property.initializer;
      if (value.kind === ts.SyntaxKind.TrueKeyword || ts.isStringLiteral(value)) {
        markers.push({ name, node: property.name });
      }
    }
  }
  return markers;
}

export function analyzeTestSource(source, file = "<memory>") {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const focused = [];
  const reported = [];

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const chain = propertyChain(node.expression);
      if (chain && TEST_ROOTS.has(chain[0])) {
        const location = locationFor(sourceFile, node.expression);
        if (chain.includes("only")) {
          focused.push({ file, marker: chain.join("."), ...location });
        }
        const marker = chain.find((part) => REPORTED_MARKERS.has(part));
        if (marker) {
          reported.push({ file, marker: chain.join("."), ...location });
        }
        for (const option of enabledOptionMarkers(node)) {
          const optionLocation = locationFor(sourceFile, option.node);
          const entry = {
            file,
            marker: `${chain.join(".")} options.${option.name}`,
            ...optionLocation,
          };
          if (option.name === "only") focused.push(entry);
          else reported.push(entry);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { focused, reported };
}

export function findTestFiles(root) {
  const files = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const resolved = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(resolved);
      else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) files.push(resolved);
    }
  }

  walk(root);
  return files.sort();
}

export function scanTestPolicy(root) {
  const files = findTestFiles(root);
  const focused = [];
  const reported = [];

  for (const absoluteFile of files) {
    const file = path.relative(root, absoluteFile);
    const result = analyzeTestSource(fs.readFileSync(absoluteFile, "utf8"), file);
    focused.push(...result.focused);
    reported.push(...result.reported);
  }

  return {
    filesScanned: files.length,
    focused,
    reported,
  };
}

function writeJsonReport(report, outputFile) {
  const resolved = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printLocations(label, entries) {
  if (entries.length === 0) return;
  console.log(`${label}:`);
  for (const entry of entries) {
    console.log(`- ${entry.file}:${entry.line}:${entry.column} (${entry.marker})`);
  }
}

function main() {
  const jsonArgument = process.argv.find((argument) => argument.startsWith("--json="));
  const report = scanTestPolicy(process.cwd());

  if (jsonArgument) writeJsonReport(report, jsonArgument.slice("--json=".length));

  console.log(
    `Test policy scanned ${report.filesScanned} files: ` +
      `${report.focused.length} focused, ${report.reported.length} skipped/todo/fixme.`
  );
  printLocations("Reported non-running or expected-failure tests", report.reported);

  if (report.focused.length > 0) {
    printLocations("Focused tests are forbidden", report.focused);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

