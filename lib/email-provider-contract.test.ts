import { createHash } from "node:crypto";
import { createServer, type IncomingHttpHeaders } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import {
  sendAccountDeletionConfirmationEmail,
  sendAccountDeletionPendingEmail,
  sendInactiveAccountExpiryWarningEmail,
} from "./account-deletion-email";
import { sendGuardianAuthorizationEmail } from "./guardian-authorization";

const nativeFetch = globalThis.fetch;
const recipient = "learner@example.test";
const from = "Study Buddy <notifications@example.test>";
const replyTo = "support@example.test";
const origin = "https://app.example.test";
const token = "a".repeat(43);
const tokenHash = createHash("sha256").update(token).digest("hex");
const deadline = new Date("2026-12-15T12:00:00.000Z");
const deletion = { email: recipient, token, expiresAt: deadline };

type EmailRequest = {
  method?: string;
  path?: string;
  headers: IncomingHttpHeaders;
  body: { to: string[]; from: string; reply_to: string; subject: string; html: string; text: string };
};
const requests: EmailRequest[] = [];
let localOrigin: string;
let responseStatus = 200;
let stallResponse = false;
const resend = createServer(async (request, response) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push({
      method: request.method, path: request.url, headers: request.headers,
      body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
    });
    if (stallResponse) return;
    response.writeHead(responseStatus, { "Content-Type": "application/json" });
    response.end(JSON.stringify(responseStatus === 200
      ? { id: "synthetic-delivery-id" }
      : { message: "Synthetic provider failure" }));
  } catch {
    response.writeHead(400).end();
  }
});

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    resend.once("error", reject);
    resend.listen(0, "127.0.0.1", resolve);
  });
  const address = resend.address();
  if (!address || typeof address === "string") throw new Error("Local Resend server failed to start");
  localOrigin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (!resend.listening) return;
  await new Promise<void>((resolve) => {
    resend.close(() => resolve());
    resend.closeAllConnections();
  });
});

beforeEach(() => {
  requests.length = 0;
  responseStatus = 200;
  stallResponse = false;
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("RESEND_API_KEY", "synthetic-resend-key");
  vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", from);
  vi.stubEnv("TRANSACTIONAL_EMAIL_REPLY_TO", replyTo);
  vi.stubEnv("EXTERNAL_REQUEST_TIMEOUT_MS", "3000");
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toBe("https://api.resend.com/emails");
    return nativeFetch(`${localOrigin}/emails`, init);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const messages = [
  {
    subject: "Approve Ayo <Student>'s Study Buddy account",
    send: () => sendGuardianAuthorizationEmail({
      guardianName: "Tomi & Family", guardianEmail: recipient,
      studentName: "Ayo <Student>", token, expiresAt: deadline,
    }),
    key: `guardian-authorization-${tokenHash}`,
    link: `${origin}/guardian-authorization#token=${token}`,
  },
  {
    subject: "Confirm deletion of your Study Buddy account",
    send: () => sendAccountDeletionConfirmationEmail(deletion),
    key: `account-deletion-confirm-${tokenHash}`,
    link: `${origin}/account-deletion/confirm#token=${token}`,
  },
  {
    subject: "Your Study Buddy account is pending deletion",
    send: () => sendAccountDeletionPendingEmail({ email: recipient, requestId: "synthetic-01", scheduledFor: deadline }),
    key: "account-deletion-pending-synthetic-01",
    link: "mailto:privacy@studybuddyng.com",
  },
  {
    subject: "Your Study Buddy account will be deleted in 1 day",
    send: () => sendInactiveAccountExpiryWarningEmail({
      email: recipient, daysRemaining: 1, deletionAt: deadline, idempotencyKey: "synthetic-01",
    }),
    key: "inactive-account-expiry-synthetic-01",
    link: `${origin}/login`,
  },
];

test.each(messages)("sends the Resend HTTP contract for $subject", async ({ subject, send, key, link }) => {
  await send();
  expect(requests).toHaveLength(1);
  const [delivered] = requests;
  expect(delivered).toMatchObject({
    method: "POST", path: "/emails",
    headers: { authorization: "Bearer synthetic-resend-key", "content-type": "application/json", "idempotency-key": key },
    body: { from, to: [recipient], reply_to: replyTo, subject },
  });
  expect(delivered.body.html).toContain(`href="${link}"`);
  expect(delivered.body.text).toContain(link.replace(/^mailto:/, ""));
  expect(delivered.body.html).toContain(deadline.toUTCString());
  expect(delivered.body.text).toContain(deadline.toUTCString());
  if (link.includes("#token=")) {
    expect(new URL(link).search).toBe("");
    expect(delivered.headers["idempotency-key"]).not.toContain(token);
  }
  if (key.startsWith("guardian-authorization-")) {
    expect(delivered.body.html).toContain("Tomi &amp; Family");
    expect(delivered.body.html).toContain("Ayo &lt;Student&gt;");
  }
});

test.each([429, 503])("rejects provider status %i and keeps the idempotency key on retry", async (status) => {
  responseStatus = status;
  await expect(sendAccountDeletionConfirmationEmail(deletion)).rejects.toThrow("ACCOUNT_DELETION_CONFIRMATION_EMAIL_FAILED");
  expect(requests).toHaveLength(1);
  responseStatus = 200;
  await sendAccountDeletionConfirmationEmail(deletion);
  expect(requests).toHaveLength(2);
  expect(requests[1].headers["idempotency-key"]).toBe(requests[0].headers["idempotency-key"]);
  expect(requests[1].body).toEqual(requests[0].body);
});

test("aborts a stalled provider and allows an explicit retry", async () => {
  vi.stubEnv("EXTERNAL_REQUEST_TIMEOUT_MS", "750");
  stallResponse = true;
  await expect(sendAccountDeletionConfirmationEmail(deletion)).rejects.toMatchObject({ name: "TimeoutError" });
  expect(requests).toHaveLength(1);
  stallResponse = false;
  await sendAccountDeletionConfirmationEmail(deletion);
  expect(requests).toHaveLength(2);
  expect(requests[1].headers["idempotency-key"]).toBe(requests[0].headers["idempotency-key"]);
});
