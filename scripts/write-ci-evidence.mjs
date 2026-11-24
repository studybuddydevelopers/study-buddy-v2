import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RESULT_FILES = {
  testPolicy: "output/test-results/test-policy.json",
  vitest: "output/test-results/vitest.json",
  nodeScripts: "output/test-results/node-scripts.xml",
  playwright: "output/playwright/results.json",
  coverage: "coverage/coverage-summary.json",
  buildLog: "output/test-results/build.log",
};

function safeOutcome(value) {
  const allowed = new Set(["cancelled", "failure", "skipped", "success"]);
  return allowed.has(value) ? value : "not-run";
}

export function buildCiEvidence({ env, actualNodeVersion, expectedNodeVersion, exists }) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    revision: env.GITHUB_SHA || "local",
    ref: env.GITHUB_REF || "local",
    run: {
      id: env.GITHUB_RUN_ID || null,
      attempt: env.GITHUB_RUN_ATTEMPT || null,
    },
    runtime: {
      expectedNodeVersion,
      actualNodeVersion,
      matches: expectedNodeVersion === actualNodeVersion,
    },
    steps: {
      runtime: safeOutcome(env.RUNTIME_OUTCOME),
      testPolicy: safeOutcome(env.TEST_POLICY_OUTCOME),
      coverage: safeOutcome(env.COVERAGE_OUTCOME),
      nodeScripts: safeOutcome(env.NODE_SCRIPTS_OUTCOME),
      browser: safeOutcome(env.BROWSER_OUTCOME),
      build: safeOutcome(env.BUILD_OUTCOME),
    },
    artifacts: Object.fromEntries(
      Object.entries(RESULT_FILES).map(([name, file]) => [name, { file, present: exists(file) }])
    ),
  };
}

export function evidenceMarkdown(evidence) {
  const rows = Object.entries(evidence.steps)
    .map(([name, outcome]) => `| ${name} | ${outcome} |`)
    .join("\n");
  return [
    "## CI evidence",
    "",
    `Revision: \`${evidence.revision}\``,
    "",
    `Node: \`${evidence.runtime.actualNodeVersion}\` (expected \`${evidence.runtime.expectedNodeVersion}\`)`,
    "",
    "| Step | Outcome |",
    "| --- | --- |",
    rows,
    "",
  ].join("\n");
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const evidence = buildCiEvidence({
    env: process.env,
    actualNodeVersion: process.versions.node,
    expectedNodeVersion: packageJson.engines?.node ?? "missing",
    exists: (file) => fs.existsSync(file),
  });
  const outputDirectory = path.resolve("output/test-results");
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, "ci-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(outputDirectory, "ci-summary.md"),
    evidenceMarkdown(evidence),
    "utf8"
  );
  console.log("CI evidence manifest written.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

