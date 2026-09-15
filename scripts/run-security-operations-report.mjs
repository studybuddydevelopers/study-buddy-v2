import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_RECIPIENT = "security@studybuddyng.com";
const BACKUP_RESTORE_EVIDENCE = "BACKUP_RESTORE_TEST";
const PROVIDER_ACCESS_EVIDENCE = "PROVIDER_ACCESS_REVIEW";
const REPORT_TIMEOUT_MS = 20_000;

export function previousUtcCalendarMonth(now = new Date()) {
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const periodStart = new Date(
    Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() - 1, 1)
  );
  return { periodStart, periodEnd };
}

export function parseReportRecipients(value) {
  const recipients = (value || DEFAULT_RECIPIENT)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(recipients)];
  if (
    unique.length === 0 ||
    unique.length > 10 ||
    unique.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    throw new Error("SECURITY_REPORT_RECIPIENTS_INVALID");
  }
  return unique;
}

export function evidenceStatus(evidence, periodStart, periodEnd) {
  if (!evidence) return { status: "MISSING", verifiedAt: null };
  const verifiedAt = new Date(evidence.verifiedAt);
  return {
    status:
      verifiedAt >= periodStart && verifiedAt < periodEnd
        ? "CURRENT"
        : "OVERDUE",
    verifiedAt: verifiedAt.toISOString(),
  };
}

export function costAnomaly(input) {
  if (!Number.isFinite(input.current) || input.current < 0) return false;
  if (
    Number.isFinite(input.absoluteThreshold) &&
    input.absoluteThreshold > 0 &&
    input.current >= input.absoluteThreshold
  ) {
    return true;
  }
  return (
    input.current >= 1 &&
    Number.isFinite(input.previous) &&
    input.previous > 0 &&
    input.current >= input.previous * 2
  );
}

async function collectSecuritySummary(periodStart, periodEnd) {
  const rows = await prisma.securityAuditEvent.groupBy({
    by: ["event", "level"],
    where: { createdAt: { gte: periodStart, lt: periodEnd } },
    _count: { _all: true },
  });
  const events = rows
    .map((row) => ({
      event: row.event,
      level: row.level,
      count: row._count._all,
    }))
    .sort((left, right) => right.count - left.count);
  const countFor = (event) =>
    events
      .filter((row) => row.event === event)
      .reduce((total, row) => total + row.count, 0);

  return {
    total: events.reduce((total, row) => total + row.count, 0),
    warningCount: events
      .filter((row) => row.level === "warn")
      .reduce((total, row) => total + row.count, 0),
    errorCount: events
      .filter((row) => row.level === "error")
      .reduce((total, row) => total + row.count, 0),
    loginFailures: countFor("login_failed"),
    rateLimitRejections: countFor("rate_limit_exceeded"),
    webhookSignatureFailures: countFor("webhook_signature_failed"),
    csrfFailures: countFor("csrf_validation_failed"),
    topEvents: events.slice(0, 20),
  };
}

async function collectAiSummary(periodStart, periodEnd) {
  const [currentRows, previousPeriod] = await Promise.all([
    prisma.aiGlobalDailyUsage.findMany({
      where: { usageDate: { gte: periodStart, lt: periodEnd } },
      orderBy: { usageDate: "asc" },
      select: {
        usageDate: true,
        consumedTokens: true,
        reservedTokens: true,
        requestCount: true,
      },
    }),
    fetchOpenAiCosts(periodStart, periodEnd),
  ]);

  const consumedTokens = currentRows.reduce(
    (total, row) => total + row.consumedTokens,
    0
  );
  const requestCount = currentRows.reduce(
    (total, row) => total + row.requestCount,
    0
  );
  const maxDailyTokens = currentRows.reduce(
    (maximum, row) => Math.max(maximum, row.consumedTokens),
    0
  );
  const unsettledReservedTokens = currentRows.reduce(
    (total, row) => total + row.reservedTokens,
    0
  );

  return {
    consumedTokens,
    requestCount,
    activeDays: currentRows.length,
    maxDailyTokens,
    unsettledReservedTokens,
    providerCost: previousPeriod,
  };
}

async function fetchOpenAiCosts(periodStart, periodEnd) {
  const apiKey = process.env.OPENAI_ADMIN_KEY?.trim();
  if (!apiKey) {
    return {
      status: "NOT_CONFIGURED",
      currency: "usd",
      current: null,
      previous: null,
      unusual: null,
    };
  }

  const comparisonStart = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() - 1, 1)
  );
  const url = new URL("https://api.openai.com/v1/organization/costs");
  url.searchParams.set("start_time", String(comparisonStart.getTime() / 1000));
  url.searchParams.set("end_time", String(periodEnd.getTime() / 1000));
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.set("limit", "93");
  url.searchParams.append("group_by", "project_id");

  const headers = { Authorization: `Bearer ${apiKey}` };
  if (process.env.OPENAI_ORGANIZATION_ID?.trim()) {
    headers["OpenAI-Organization"] = process.env.OPENAI_ORGANIZATION_ID.trim();
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    });
    if (!response.ok) {
      return providerCostError(`HTTP_${response.status}`);
    }
    const payload = await response.json();
    const buckets = Array.isArray(payload?.data) ? payload.data : [];
    const projectId = process.env.OPENAI_COST_PROJECT_ID?.trim();
    let currency = "usd";
    let current = 0;
    let previous = 0;

    for (const bucket of buckets) {
      const bucketStart = new Date(Number(bucket?.start_time) * 1000);
      const results = Array.isArray(bucket?.results) ? bucket.results : [];
      for (const result of results) {
        if (projectId && result?.project_id !== projectId) continue;
        const value = Number(result?.amount?.value);
        if (!Number.isFinite(value)) continue;
        if (typeof result?.amount?.currency === "string") {
          currency = result.amount.currency.toLowerCase();
        }
        if (bucketStart >= periodStart && bucketStart < periodEnd) {
          current += value;
        } else if (bucketStart >= comparisonStart && bucketStart < periodStart) {
          previous += value;
        }
      }
    }

    const absoluteThreshold = positiveNumberFromEnv(
      "AI_MONTHLY_COST_ALERT_USD"
    );
    return {
      status: "AVAILABLE",
      currency,
      current: roundCurrency(current),
      previous: roundCurrency(previous),
      unusual: costAnomaly({ current, previous, absoluteThreshold }),
      scope: projectId ? "PROJECT" : "ORGANIZATION",
    };
  } catch (error) {
    return providerCostError(error instanceof Error ? error.name : "FAILED");
  }
}

function providerCostError(reason) {
  return {
    status: "ERROR",
    reason: String(reason).slice(0, 64),
    currency: "usd",
    current: null,
    previous: null,
    unusual: null,
  };
}

async function collectDeletionSummary(periodStart, periodEnd, now) {
  const [completed, failed, overdue, incompleteEvidence] = await Promise.all([
    prisma.accountDeletionRequest.count({
      where: { completedAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.accountDeletionRequest.count({ where: { status: "FAILED" } }),
    prisma.accountDeletionRequest.count({
      where: {
        scheduledFor: { lt: now },
        status: { in: ["PENDING", "PROCESSING", "FAILED"] },
      },
    }),
    prisma.accountDeletionRequest.count({
      where: {
        completedAt: { gte: periodStart, lt: periodEnd },
        OR: [
          { status: { not: "COMPLETED" } },
          { userId: { not: null } },
          { authUserId: { not: null } },
        ],
      },
    }),
  ]);
  return { completed, failed, overdue, incompleteEvidence };
}

async function collectEvidenceSummary(periodStart, periodEnd) {
  const evidence = await prisma.securityOperationsEvidence.findMany({
    where: {
      evidenceType: {
        in: [BACKUP_RESTORE_EVIDENCE, PROVIDER_ACCESS_EVIDENCE],
      },
    },
    select: { evidenceType: true, verifiedAt: true },
  });
  const byType = new Map(evidence.map((item) => [item.evidenceType, item]));
  return {
    backupRestore: evidenceStatus(
      byType.get(BACKUP_RESTORE_EVIDENCE),
      periodStart,
      periodEnd
    ),
    providerAccess: evidenceStatus(
      byType.get(PROVIDER_ACCESS_EVIDENCE),
      periodStart,
      periodEnd
    ),
  };
}

function attentionReasons(summary) {
  const reasons = [];
  const loginThreshold = positiveIntegerFromEnv(
    "SECURITY_REPORT_LOGIN_FAILURE_THRESHOLD",
    25
  );
  const rateLimitThreshold = positiveIntegerFromEnv(
    "SECURITY_REPORT_RATE_LIMIT_THRESHOLD",
    50
  );
  if (summary.security.errorCount > 0) reasons.push("security errors recorded");
  if (summary.security.loginFailures >= loginThreshold) {
    reasons.push("login-failure threshold reached");
  }
  if (summary.security.rateLimitRejections >= rateLimitThreshold) {
    reasons.push("rate-limit threshold reached");
  }
  if (summary.security.webhookSignatureFailures > 0) {
    reasons.push("webhook-signature failures recorded");
  }
  if (summary.ai.unsettledReservedTokens > 0) {
    reasons.push("unsettled AI token reservations remain");
  }
  if (summary.ai.providerCost.status !== "AVAILABLE") {
    reasons.push("OpenAI provider cost could not be verified");
  } else if (summary.ai.providerCost.unusual) {
    reasons.push("unusual OpenAI spending detected");
  }
  if (summary.deletions.failed > 0 || summary.deletions.overdue > 0) {
    reasons.push("failed or overdue account deletions exist");
  }
  if (summary.deletions.incompleteEvidence > 0) {
    reasons.push("completed deletion evidence is inconsistent");
  }
  if (summary.evidence.backupRestore.status !== "CURRENT") {
    reasons.push("monthly backup-restore evidence is missing or overdue");
  }
  if (summary.evidence.providerAccess.status !== "CURRENT") {
    reasons.push("monthly provider-access review is missing or overdue");
  }
  return reasons;
}

async function sendReportEmail({ recipients, periodStart, periodEnd, summary }) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("TRANSACTIONAL_EMAIL_FROM");
  const month = periodStart.toISOString().slice(0, 7);
  const needsAttention = summary.attentionReasons.length > 0;
  const subject = `${needsAttention ? "Action needed: " : ""}Study Buddy monthly security report — ${month}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `security-operations-report-${month}`,
    },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: "security@studybuddyng.com",
      subject,
      html: renderHtmlReport(periodStart, periodEnd, summary),
      text: renderTextReport(periodStart, periodEnd, summary),
    }),
    signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`REPORT_EMAIL_HTTP_${response.status}`);
}

function renderTextReport(periodStart, periodEnd, summary) {
  const cost = summary.ai.providerCost;
  return [
    "Study Buddy monthly security-operations report",
    `Period: ${dateOnly(periodStart)} to ${dateOnly(new Date(periodEnd.getTime() - 1))} UTC`,
    `Overall: ${summary.attentionReasons.length ? "ACTION NEEDED" : "PASS"}`,
    "",
    `Security events: ${summary.security.total} total; ${summary.security.warningCount} warnings; ${summary.security.errorCount} errors`,
    `Login failures: ${summary.security.loginFailures}; rate-limit rejections: ${summary.security.rateLimitRejections}; webhook-signature failures: ${summary.security.webhookSignatureFailures}; CSRF failures: ${summary.security.csrfFailures}`,
    `AI usage: ${summary.ai.consumedTokens} consumed tokens across ${summary.ai.requestCount} requests; maximum daily tokens: ${summary.ai.maxDailyTokens}`,
    `OpenAI cost: ${formatProviderCost(cost)}`,
    `Deletion evidence: ${summary.deletions.completed} completed; ${summary.deletions.failed} currently failed; ${summary.deletions.overdue} overdue; ${summary.deletions.incompleteEvidence} inconsistent completed records`,
    `Backup restore evidence: ${formatEvidence(summary.evidence.backupRestore)}`,
    `Provider access evidence: ${formatEvidence(summary.evidence.providerAccess)}`,
    "",
    "Items requiring attention:",
    ...(summary.attentionReasons.length
      ? summary.attentionReasons.map((reason) => `- ${reason}`)
      : ["- None"]),
    "",
    "This report contains counts only. Review restricted provider dashboards and evidence records for investigation details; do not forward them into ordinary email.",
  ].join("\n");
}

function renderHtmlReport(periodStart, periodEnd, summary) {
  const text = renderTextReport(periodStart, periodEnd, summary);
  return `<div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111"><h1 style="color:#6247AA">Study Buddy monthly security report</h1><pre style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.55">${escapeHtml(text)}</pre><p style="font-size:12px;color:#666">Study Buddy Security · security@studybuddyng.com</p></div>`;
}

function formatProviderCost(cost) {
  if (cost.status === "NOT_CONFIGURED") return "not configured (set OPENAI_ADMIN_KEY in the isolated cron service)";
  if (cost.status === "ERROR") return `unavailable (${cost.reason})`;
  return `${cost.currency.toUpperCase()} ${cost.current.toFixed(2)} for the report month; previous month ${cost.currency.toUpperCase()} ${cost.previous.toFixed(2)}; unusual=${cost.unusual ? "yes" : "no"}; scope=${cost.scope.toLowerCase()}`;
}

function formatEvidence(evidence) {
  return `${evidence.status.toLowerCase()}${evidence.verifiedAt ? `; last verified ${evidence.verifiedAt}` : ""}`;
}

export async function runMonthlySecurityOperationsReport(now = new Date()) {
  const { periodStart, periodEnd } = previousUtcCalendarMonth(now);
  const recipients = parseReportRecipients(
    process.env.SECURITY_REPORT_RECIPIENTS
  );
  const existing = await prisma.securityOperationsReportRun.findUnique({
    where: {
      periodStart_periodEnd: { periodStart, periodEnd },
    },
    select: { status: true },
  });
  if (existing?.status === "SENT") {
    return { skipped: true, periodStart, periodEnd };
  }

  await prisma.securityOperationsReportRun.upsert({
    where: { periodStart_periodEnd: { periodStart, periodEnd } },
    create: {
      periodStart,
      periodEnd,
      status: "RUNNING",
      recipients,
    },
    update: {
      status: "RUNNING",
      recipients,
      failureCode: null,
    },
  });

  try {
    const [security, ai, deletions, evidence] = await Promise.all([
      collectSecuritySummary(periodStart, periodEnd),
      collectAiSummary(periodStart, periodEnd),
      collectDeletionSummary(periodStart, periodEnd, now),
      collectEvidenceSummary(periodStart, periodEnd),
    ]);
    const summary = { security, ai, deletions, evidence };
    summary.attentionReasons = attentionReasons(summary);
    await sendReportEmail({ recipients, periodStart, periodEnd, summary });
    await prisma.securityOperationsReportRun.update({
      where: { periodStart_periodEnd: { periodStart, periodEnd } },
      data: {
        status: "SENT",
        summary,
        sentAt: new Date(),
        failureCode: null,
      },
    });
    return { skipped: false, periodStart, periodEnd, summary };
  } catch (error) {
    const failureCode =
      error instanceof Error ? error.message.slice(0, 64) : "REPORT_FAILED";
    await prisma.securityOperationsReportRun.update({
      where: { periodStart_periodEnd: { periodStart, periodEnd } },
      data: { status: "FAILED", failureCode },
    });
    throw error;
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function positiveIntegerFromEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function positiveNumberFromEnv(name) {
  const value = Number.parseFloat(process.env[name] ?? "");
  return Number.isFinite(value) && value > 0 ? value : null;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

async function main() {
  try {
    const result = await runMonthlySecurityOperationsReport();
    console.info(
      JSON.stringify({
        event: "security_operations_report_completed",
        skipped: result.skipped,
        periodStart: result.periodStart.toISOString(),
        periodEnd: result.periodEnd.toISOString(),
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "security_operations_report_failed",
        reason: error instanceof Error ? error.message : "UNKNOWN",
      })
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
