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
}

/** Stable pseudonym for grouping abuse without putting raw identifiers in logs. */
export function securityFingerprint(value: string) {
  const normalized = value.trim().toLowerCase();
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  const digest = secret
    ? createHmac("sha256", secret).update(normalized).digest("hex")
    : createHash("sha256").update(normalized).digest("hex");

  return digest.slice(0, 24);
}
