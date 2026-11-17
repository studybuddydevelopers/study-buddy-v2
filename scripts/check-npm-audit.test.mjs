import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIT_EXCEPTION,
  evaluateAuditReport,
} from "./check-npm-audit.mjs";

function report(vulnerabilities = {}) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
  };
}

function acceptedAdvisory() {
  return {
    name: "picomatch",
    dependency: "picomatch",
    url: AUDIT_EXCEPTION.advisoryUrl,
    severity: "high",
  };
}

const beforeExpiry = new Date("2026-12-01T00:00:00.000Z");

test("passes when npm reports no vulnerabilities", () => {
  assert.deepEqual(evaluateAuditReport(report(), beforeExpiry), {
    ok: true,
    accepted: [],
    blocking: [],
  });
});

test("accepts only the reviewed advisory and its known transitive chain", () => {
  const result = evaluateAuditReport(
    report({
      picomatch: {
        severity: "high",
        via: [acceptedAdvisory()],
      },
      tinyglobby: {
        severity: "high",
        via: ["picomatch"],
      },
      vitest: {
        severity: "high",
        via: ["picomatch", "tinyglobby"],
      },
    }),
    beforeExpiry,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.accepted, ["picomatch", "tinyglobby", "vitest"]);
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
    beforeExpiry,
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking, ["unrelated"]);
});

test("blocks a new package even when it points at the reviewed advisory", () => {
  const result = evaluateAuditReport(
    report({
      picomatch: {
        severity: "high",
        via: [acceptedAdvisory()],
      },
      "new-dependent": {
        severity: "high",
        via: ["picomatch"],
      },
    }),
    beforeExpiry,
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking, ["new-dependent"]);
});

test("blocks unresolved or cyclic dependency paths", () => {
  const result = evaluateAuditReport(
    report({
      vitest: {
        severity: "high",
        via: ["tinyglobby"],
      },
      tinyglobby: {
        severity: "high",
        via: ["vitest"],
      },
    }),
    beforeExpiry,
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking, ["tinyglobby", "vitest"]);
});

test("blocks the reviewed advisory after the exception expires", () => {
  const result = evaluateAuditReport(
    report({
      picomatch: {
        severity: "high",
        via: [acceptedAdvisory()],
      },
    }),
    new Date("2026-12-18T00:00:00.000Z"),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking, ["AUDIT_EXCEPTION_EXPIRED"]);
});

test("does not fail the moderate gate for a low-severity finding", () => {
  const result = evaluateAuditReport(
    report({
      unrelated: {
        severity: "low",
        via: [],
      },
    }),
    beforeExpiry,
  );

  assert.deepEqual(result, {
    ok: true,
    accepted: [],
    blocking: [],
  });
});

test("fails closed for an invalid npm audit report", () => {
  assert.deepEqual(evaluateAuditReport({}, beforeExpiry), {
    ok: false,
    accepted: [],
    blocking: ["INVALID_AUDIT_REPORT"],
  });
});
