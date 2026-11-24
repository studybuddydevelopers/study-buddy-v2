import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const MINIMUM_BLOCKING_SEVERITY = "moderate";
const SEVERITY_RANK = new Map([
  ["info", 0],
  ["low", 1],
  ["moderate", 2],
  ["high", 3],
  ["critical", 4],
]);

function isBlockingSeverity(severity) {
  const rank = SEVERITY_RANK.get(severity);
  return (
    rank !== undefined &&
    rank >= SEVERITY_RANK.get(MINIMUM_BLOCKING_SEVERITY)
  );
}

export function evaluateAuditReport(report) {
  if (
    report === null ||
    typeof report !== "object" ||
    report.auditReportVersion !== 2 ||
    report.vulnerabilities === null ||
    typeof report.vulnerabilities !== "object" ||
    Array.isArray(report.vulnerabilities)
  ) {
    return {
      ok: false,
      blocking: ["INVALID_AUDIT_REPORT"],
    };
  }

  const blocking = [];

  for (const [name, vulnerability] of Object.entries(
    report.vulnerabilities,
  )) {
    if (
      vulnerability !== null &&
      typeof vulnerability === "object" &&
      isBlockingSeverity(vulnerability.severity)
    ) {
      blocking.push(name);
    }
  }

  return {
    ok: blocking.length === 0,
    blocking: blocking.sort(),
  };
}

export function runAudit() {
  const result = spawnSync("npm", ["audit", "--json"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.error) {
    console.error("Dependency audit could not be started.");
    return 1;
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    console.error("Dependency audit returned an invalid report.");
    return 1;
  }

  const evaluation = evaluateAuditReport(report);
  if (!evaluation.ok) {
    console.error(
      `Dependency audit failed: ${evaluation.blocking.join(", ")}.`,
    );
    return 1;
  }

  console.log("Dependency audit passed with no blocking findings.");

  return 0;
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  process.exitCode = runAudit();
}
