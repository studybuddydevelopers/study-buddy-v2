import { createHash, randomBytes } from "node:crypto";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { PRIVACY_EMAIL } from "@/lib/legal-entity";

const DEFAULT_CONFIRMATION_TTL_HOURS = 24;

export function createAccountDeletionConfirmationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAccountDeletionConfirmationToken(token) };
}

export function hashAccountDeletionConfirmationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function accountDeletionConfirmationExpiry(now = new Date()) {
  const configured = Number.parseInt(
    process.env.ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS ?? "",
    10
  );
  const hours =
    Number.isFinite(configured) && configured >= 1 && configured <= 72
      ? configured
      : DEFAULT_CONFIRMATION_TTL_HOURS;
  return new Date(now.getTime() + hours * 60 * 60_000);
}

export async function sendAccountDeletionConfirmationEmail(input: {
  email: string;
  token: string;
  expiresAt: Date;
}) {
  const { apiKey, from, replyTo, appOrigin } = emailConfiguration();
  // A URL fragment keeps the bearer token out of HTTP requests and Referer
  // headers. The browser removes it before sending it in a bounded POST body.
  const confirmationUrl = `${appOrigin}/account-deletion/confirm#token=${encodeURIComponent(input.token)}`;
  const expiry = input.expiresAt.toUTCString();
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `account-deletion-confirm-${hashAccountDeletionConfirmationToken(input.token)}`,
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      reply_to: replyTo,
      subject: "Confirm deletion of your Study Buddy account",
      html: `
        <p>Hello,</p>
        <p>Someone signed in to your Study Buddy account and requested permanent deletion.</p>
        <p>Your account has not been scheduled for deletion yet. Use the secure link below and confirm on the page to continue.</p>
        <p><a href="${confirmationUrl}">Review and confirm account deletion</a></p>
        <p>This one-time link expires at ${escapeHtml(expiry)}. If you did not make this request, ignore this email and change your password.</p>
        <p>Study Buddy Privacy<br />${PRIVACY_EMAIL}</p>
      `,
      text: [
        "Hello,",
        "Someone signed in to your Study Buddy account and requested permanent deletion.",
        "Your account has not been scheduled for deletion yet. Open the secure link and confirm on the page to continue:",
        confirmationUrl,
        `This one-time link expires at ${expiry}.`,
        "If you did not make this request, ignore this email and change your password.",
        `Questions: ${PRIVACY_EMAIL}`,
      ].join("\n\n"),
    }),
  });

  if (!response.ok) {
    throw new Error("ACCOUNT_DELETION_CONFIRMATION_EMAIL_FAILED");
  }
}

export async function sendAccountDeletionPendingEmail(input: {
  email: string;
  requestId: string;
  scheduledFor: Date;
}) {
  const { apiKey, from, replyTo } = emailConfiguration();
  const deadline = input.scheduledFor.toUTCString();
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `account-deletion-pending-${input.requestId}`,
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      reply_to: replyTo,
      subject: "Your Study Buddy account is pending deletion",
      html: `
        <p>Hello,</p>
        <p>Your permanent account-deletion request has been confirmed. Your Study Buddy account is now locked.</p>
        <p>You have 15 days to reverse this decision. Contact <a href="mailto:${PRIVACY_EMAIL}">${PRIVACY_EMAIL}</a> before ${escapeHtml(deadline)}. You can also cancel from the pending-deletion page after signing in.</p>
        <p>If the request is not cancelled before processing begins, we will delete active-system personal data, except limited records we must retain by law. Protected backup copies age out within 90 days of confirmation.</p>
        <p>Study Buddy Privacy<br />${PRIVACY_EMAIL}</p>
      `,
      text: [
        "Hello,",
        "Your permanent account-deletion request has been confirmed. Your Study Buddy account is now locked.",
        `You have 15 days to reverse this decision. Contact ${PRIVACY_EMAIL} before ${deadline}. You can also cancel from the pending-deletion page after signing in.`,
        "If the request is not cancelled before processing begins, we will delete active-system personal data, except limited records we must retain by law.",
        "Protected backup copies age out within 90 days of confirmation.",
      ].join("\n\n"),
    }),
  });

  if (!response.ok) {
    throw new Error("ACCOUNT_DELETION_PENDING_EMAIL_FAILED");
  }
}

function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  const replyTo =
    process.env.TRANSACTIONAL_EMAIL_REPLY_TO?.trim() || PRIVACY_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Account deletion email delivery is not configured.");
  }

  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (!configuredOrigin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_ORIGIN is required for account deletion emails.");
    }
    return { apiKey, from, replyTo, appOrigin: "http://localhost:3000" };
  }

  const url = new URL(configuredOrigin);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_ORIGIN must use HTTPS in production.");
  }
  return { apiKey, from, replyTo, appOrigin: url.origin };
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

