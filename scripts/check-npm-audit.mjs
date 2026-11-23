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

export const AUDIT_EXCEPTION = Object.freeze({
  advisoryUrl: "https://github.com/advisories/GHSA-fc5q-39xc-vjpf",
  dependency: "picomatch",
  expiresAt: "2026-12-17T23:59:59.999Z",
  affectedPackages: Object.freeze([
    "@next/eslint-plugin-next",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "@typescript-eslint/type-utils",
    "@typescript-eslint/typescript-estree",
    "@typescript-eslint/utils",
    "anymatch",
    "chokidar",
    "eslint-config-next",
    "eslint-import-resolver-typescript",
    "fast-glob",
    "fdir",
    "micromatch",
    "picomatch",
    "readdirp",
    "sucrase",
    "tailwindcss",
    "tinyglobby",
    "typescript-eslint",
    "vite",
    "vitest",
  ]),
});

function isBlockingSeverity(severity) {
  const rank = SEVERITY_RANK.get(severity);
  return (
    rank !== undefined &&
    rank >= SEVERITY_RANK.get(MINIMUM_BLOCKING_SEVERITY)
  );
}

function isAcceptedAdvisory(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    value.url === AUDIT_EXCEPTION.advisoryUrl &&
    value.name === AUDIT_EXCEPTION.dependency &&
    value.dependency === AUDIT_EXCEPTION.dependency
  );
}

function resolvesOnlyToAcceptedAdvisory(name, vulnerabilities, visiting) {
  if (visiting.has(name)) {
    return false;
  }

  const vulnerability = vulnerabilities[name];
  if (
    vulnerability === null ||
    typeof vulnerability !== "object" ||
    !Array.isArray(vulnerability.via) ||
    vulnerability.via.length === 0
  ) {
    return false;
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(name);

  return vulnerability.via.every((via) => {
    if (typeof via === "string") {
      return resolvesOnlyToAcceptedAdvisory(
        via,
        vulnerabilities,
        nextVisiting,
      );
    }

    return isAcceptedAdvisory(via);
  });
}

export function evaluateAuditReport(report, now = new Date()) {
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
      accepted: [],
      blocking: ["INVALID_AUDIT_REPORT"],
    };
  }

  const vulnerabilities = report.vulnerabilities;
  const acceptedPackageNames = new Set(AUDIT_EXCEPTION.affectedPackages);
  const accepted = [];
  const blocking = [];

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (
      vulnerability === null ||
      typeof vulnerability !== "object" ||
      !isBlockingSeverity(vulnerability.severity)
    ) {
      continue;
    }

    const isKnownPackage = acceptedPackageNames.has(name);
    const hasAcceptedRootCause = resolvesOnlyToAcceptedAdvisory(
      name,
      vulnerabilities,
      new Set(),
    );

    if (isKnownPackage && hasAcceptedRootCause) {
      accepted.push(name);
    } else {
      blocking.push(name);
    }
  }

  const expiry = new Date(AUDIT_EXCEPTION.expiresAt);
  if (
    accepted.length > 0 &&
    (!Number.isFinite(now.getTime()) ||
      !Number.isFinite(expiry.getTime()) ||
      now > expiry)
  ) {
    blocking.push("AUDIT_EXCEPTION_EXPIRED");
  }

  return {
    ok: blocking.length === 0,
    accepted: accepted.sort(),
    blocking: [...new Set(blocking)].sort(),
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

  if (evaluation.accepted.length > 0) {
    console.warn(
      `Dependency audit passed with one time-limited reviewed exception (${evaluation.accepted.length} affected packages; expires ${AUDIT_EXCEPTION.expiresAt.slice(0, 10)}).`,
    );
  } else {
    console.log("Dependency audit passed with no blocking findings.");
  }

  return 0;
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  process.exitCode = runAudit();
}
