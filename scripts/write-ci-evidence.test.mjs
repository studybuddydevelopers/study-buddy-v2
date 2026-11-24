import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCiEvidence, evidenceMarkdown } from "./write-ci-evidence.mjs";

test("builds a bounded manifest from explicit CI metadata", () => {
  const present = new Set([
    "output/test-results/vitest.json",
    "coverage/coverage-summary.json",
  ]);
  const evidence = buildCiEvidence({
    env: {
      GITHUB_SHA: "abc123",
      GITHUB_REF: "refs/pull/1/merge",
      GITHUB_RUN_ID: "42",
      GITHUB_RUN_ATTEMPT: "2",
      RUNTIME_OUTCOME: "success",
      TEST_POLICY_OUTCOME: "success",
      COVERAGE_OUTCOME: "success",
      NODE_SCRIPTS_OUTCOME: "failure",
      BROWSER_OUTCOME: "skipped",
      BUILD_OUTCOME: "success",
    },
    actualNodeVersion: "24.22.3",
    expectedNodeVersion: "24.22.3",
    exists: (file) => present.has(file),
  });

  assert.equal(evidence.revision, "abc123");
  assert.equal(evidence.runtime.matches, true);
  assert.equal(evidence.steps.nodeScripts, "failure");
  assert.equal(evidence.artifacts.vitest.present, true);
  assert.equal(evidence.artifacts.playwright.present, false);
});

test("normalizes missing or unexpected outcomes and renders a summary", () => {
  const evidence = buildCiEvidence({
    env: { COVERAGE_OUTCOME: "unknown-value" },
    actualNodeVersion: "24.22.3",
    expectedNodeVersion: "24.22.3",
    exists: () => false,
  });

  assert.equal(evidence.steps.coverage, "not-run");
  assert.match(evidenceMarkdown(evidence), /\| coverage \| not-run \|/);
});

