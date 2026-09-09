import { createHash, randomBytes } from "node:crypto";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";

const DEFAULT_AUTHORIZATION_TTL_HOURS = 72;

export function createGuardianAuthorizationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashGuardianAuthorizationToken(token) };
}

export function hashGuardianAuthorizationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function guardianAuthorizationExpiry(now = new Date()) {
  const configured = Number.parseInt(
    process.env.GUARDIAN_AUTHORIZATION_TTL_HOURS ?? "",
    10
  );
  const hours =
    Number.isFinite(configured) && configured >= 1 && configured <= 168
      ? configured
      : DEFAULT_AUTHORIZATION_TTL_HOURS;
  return new Date(now.getTime() + hours * 60 * 60_000);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "the guardian email address";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

export async function sendGuardianAuthorizationEmail(input: {
  guardianName: string;
  guardianEmail: string;
  studentName: string;
  token: string;
  expiresAt: Date;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  const replyTo = process.env.TRANSACTIONAL_EMAIL_REPLY_TO?.trim();
  const appOrigin = productionAppOrigin();

  if (!apiKey || !from) {
    throw new Error("Guardian authorization email delivery is not configured.");
  }

  // Keep the bearer token in the URL fragment. Browsers do not send fragments
  // in HTTP requests or Referer headers; the client exchanges it in a POST body
  // and immediately clears it from the address bar.
  const decisionUrl = `${appOrigin}/guardian-authorization#token=${encodeURIComponent(input.token)}`;
  const guardianName = escapeHtml(input.guardianName);
  const studentName = escapeHtml(input.studentName);
  const subjectStudentName = safeHeaderText(input.studentName);
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `guardian-authorization-${hashGuardianAuthorizationToken(input.token)}`,
    },
    body: JSON.stringify({
      from,
      to: [input.guardianEmail],
      reply_to: replyTo || undefined,
      subject: `Approve ${subjectStudentName}'s Study Buddy account`,
      html: `
        <p>Hello ${guardianName},</p>
        <p>${studentName} gave us this email address while creating a Study Buddy account.</p>
        <p>The account cannot use Study Buddy until a parent or legal guardian reviews the child privacy information and makes a decision.</p>
        <p><a href="${decisionUrl}">Review the authorisation request</a></p>
        <p>This one-time link expires at ${escapeHtml(input.expiresAt.toUTCString())}. If you are not ${studentName}'s parent or legal guardian, deny or ignore this request.</p>
        <p>Study Buddy Privacy<br />privacy@studybuddyng.com</p>
      `,
      text: [
        `Hello ${input.guardianName},`,
        `${input.studentName} gave us this email address while creating a Study Buddy account.`,
        "The account is blocked until a parent or legal guardian reviews and decides this request.",
        `Review it here: ${decisionUrl}`,
        `This one-time link expires at ${input.expiresAt.toUTCString()}.`,
        "If you are not the parent or legal guardian, deny or ignore the request.",
        "Questions: privacy@studybuddyng.com",
      ].join("\n\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(`Guardian authorization email failed with ${response.status}.`);
  }
}

export async function syncAuthAccountStatus(
  userId: string,
  accountStatus: string
) {
  try {
    const admin = getSupabaseAdminClient();
    const current = await admin.auth.admin.getUserById(userId);
    if (current.error || !current.data.user) throw current.error;
    const update = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...current.data.user.user_metadata,
        accountStatus,
      },
    });
    if (update.error) throw update.error;
  } catch {
    // Database state is the authorization source of truth. Metadata only makes
    // redirects faster and must never be used as the server-side access check.
    logSecurityEvent("auth_account_status_sync_failed", "warn", {
      accountFingerprint: securityFingerprint(userId),
      accountStatus,
    });
  }
}

function productionAppOrigin() {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) {
    const url = new URL(configured);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("APP_ORIGIN must use HTTPS in production.");
    }
    return url.origin;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGIN is required for guardian authorization emails.");
  }
  return "http://localhost:3000";
}

function escapeHtml(value: string) {
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

function safeHeaderText(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 160) || "the student";
}
