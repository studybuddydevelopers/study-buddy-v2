import { createHash, createHmac } from "node:crypto";

type SecurityEventLevel = "info" | "warn" | "error";
type SecurityEventDetail = string | number | boolean | null | undefined;

export function logSecurityEvent(
  securityEvent: string,
  level: SecurityEventLevel,
  details: Record<string, SecurityEventDetail> = {}
) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.SECURITY_EVENT_LOGGING !== "true"
  ) {
    return;
  }

  const record = JSON.stringify({
    level,
    message: `Security event: ${securityEvent}`,
    securityEvent,
    ...details,
    environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
    service: process.env.RAILWAY_SERVICE_NAME,
  });

  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);

  if (securityAuditDatabaseIsEnabled()) {
    // Console output remains the immediate Railway log. Database persistence is
    // best-effort so an audit-store outage never breaks the user request that
    // produced the event. The monthly report separately exposes missing data.
    void persistSecurityEvent(securityEvent, level, details);
  }
}

/** Stable pseudonym for grouping abuse without putting raw identifiers in logs. */
export function securityFingerprint(value: string) {
  return securityIdentifierHash(value).slice(0, 24);
}

/**
 * Stable keyed identifier used for equality lookups without duplicating a raw
 * email address in the application database. Keep RATE_LIMIT_HASH_SECRET stable
 * and re-run the documented backfill after rotating it.
 */
export function securityIdentifierHash(value: string) {
  const normalized = value.trim().toLowerCase();
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_HASH_SECRET is required in production.");
  }

  return secret
    ? createHmac("sha256", secret).update(normalized).digest("hex")
    : createHash("sha256").update(normalized).digest("hex");
}

function securityAuditDatabaseIsEnabled() {
  if (process.env.NODE_ENV === "test") return false;
  const configured = process.env.SECURITY_AUDIT_DB_ENABLED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

async function persistSecurityEvent(
  event: string,
  level: SecurityEventLevel,
  details: Record<string, SecurityEventDetail>
) {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.securityAuditEvent.create({
      data: {
        event: event.slice(0, 96),
        level,
        details: persistentDetails(details),
        environment: boundedOptionalString(
          process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
          64
        ),
        service: boundedOptionalString(process.env.RAILWAY_SERVICE_NAME, 96),
      },
    });
  } catch {
    // Never recurse through logSecurityEvent when the audit store itself fails.
    console.error(
      JSON.stringify({
        level: "error",
        message: "Security event persistence failed",
        securityEvent: "security_audit_persistence_failed",
      })
    );
  }
}

function persistentDetails(details: Record<string, SecurityEventDetail>) {
  const entries = Object.entries(details)
    .slice(0, 24)
    .flatMap(([key, value]) => {
      if (value === undefined) return [];
      const safeKey = key.slice(0, 64);
      const safeValue =
        typeof value === "string" ? value.slice(0, 500) : value;
      return [[safeKey, safeValue] as const];
    });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function boundedOptionalString(value: string | undefined, maximum: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maximum) : undefined;
}
