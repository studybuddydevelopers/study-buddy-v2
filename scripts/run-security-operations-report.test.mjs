import assert from "node:assert/strict";
import test from "node:test";
import {
  costAnomaly,
  evidenceStatus,
  parseReportRecipients,
  previousUtcCalendarMonth,
} from "./run-security-operations-report.mjs";

test("reports the previous complete UTC calendar month", () => {
  assert.deepEqual(previousUtcCalendarMonth(new Date("2026-09-16T12:00:00Z")), {
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-01T00:00:00.000Z"),
  });
});

test("normalizes and deduplicates company recipients", () => {
  assert.deepEqual(
    parseReportRecipients(
      "Security@studybuddyng.com, privacy@studybuddyng.com, security@studybuddyng.com"
    ),
    ["security@studybuddyng.com", "privacy@studybuddyng.com"]
  );
});

test("rejects malformed recipients", () => {
  assert.throws(
    () => parseReportRecipients("not-an-email"),
    /SECURITY_REPORT_RECIPIENTS_INVALID/
  );
});

test("requires evidence from inside the report month", () => {
  const start = new Date("2026-08-01T00:00:00Z");
  const end = new Date("2026-09-01T00:00:00Z");
  assert.equal(evidenceStatus(null, start, end).status, "MISSING");
  assert.equal(
    evidenceStatus({ verifiedAt: "2026-07-31T23:59:59Z" }, start, end).status,
    "OVERDUE"
  );
  assert.equal(
    evidenceStatus({ verifiedAt: "2026-08-14T12:00:00Z" }, start, end).status,
    "CURRENT"
  );
});

test("flags an absolute threshold or a meaningful two-times cost increase", () => {
  assert.equal(
    costAnomaly({ current: 10, previous: 9, absoluteThreshold: 10 }),
    true
  );
  assert.equal(
    costAnomaly({ current: 4, previous: 1.5, absoluteThreshold: null }),
    true
  );
  assert.equal(
    costAnomaly({ current: 0.5, previous: 0.1, absoluteThreshold: null }),
    false
  );
});
