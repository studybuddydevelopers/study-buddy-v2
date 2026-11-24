import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAuditReport } from "./check-npm-audit.mjs";

function report(vulnerabilities = {}) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
  };
}

test("passes when npm reports no vulnerabilities", () => {
  assert.deepEqual(evaluateAuditReport(report()), {
    ok: true,
    blocking: [],
  });
});

test("blocks the withdrawn picomatch advisory if it reappears", () => {
  const result = evaluateAuditReport(
    report({
      picomatch: {
        severity: "high",
        via: [
          {
            name: "picomatch",
            dependency: "picomatch",
            url: "https://github.com/advisories/GHSA-fc5q-39xc-vjpf",
          },
        ],
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking, ["picomatch"]);
});

test("blocks an unrelated moderate-or-higher advisory", () => {
  const result = evaluateAuditReport(
    report({
      unrelated: {
        severity: "moderate",
        via: [
          {
            name: "unrelated",
            dependency: "unrelated",
            url: "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz",
          },
        ],
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking, ["unrelated"]);
});

test("blocks every moderate-or-higher package", () => {
  const result = evaluateAuditReport(
    report({
      high: {
        severity: "high",
      },
      critical: {
        severity: "critical",
      },
      moderate: {
        severity: "moderate",
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking, ["critical", "high", "moderate"]);
});

test("does not fail the moderate gate for a low-severity finding", () => {
  const result = evaluateAuditReport(
    report({
      unrelated: {
        severity: "low",
        via: [],
      },
    }),
  );

  assert.deepEqual(result, {
    ok: true,
    blocking: [],
  });
});

test("fails closed for an invalid npm audit report", () => {
  assert.deepEqual(evaluateAuditReport({}), {
    ok: false,
    blocking: ["INVALID_AUDIT_REPORT"],
  });
});
