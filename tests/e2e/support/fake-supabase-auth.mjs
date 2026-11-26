import { randomUUID } from "node:crypto";
import http from "node:http";
import fixtureUsers from "./fixture-users.json" with { type: "json" };

const HOST = "127.0.0.1";
const PORT = 55431;
const APP_ORIGIN = "http://127.0.0.1:3200";
const users = new Map();
const sessions = new Map();
const tokens = new Map();
const outbox = [];
const failedDeliveries = new Set();
const throttledRecoveries = new Set();
const failedCompletions = new Set();

for (const seed of Object.values(fixtureUsers)) {
  createUser({ ...seed, confirmedAt: new Date().toISOString(), metadata: { accountStatus: "ACTIVE" } });
}

const server = http.createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch {
    sendJson(response, 500, { error: "Invalid fake provider request" });
  }
});

async function handleRequest(request, response) {
  const { pathname, searchParams } = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
  const method = request.method;
  const bearer = request.headers.authorization?.replace(/^Bearer /, "");
  const session = sessions.get(bearer);
  const body = method === "POST" || method === "PUT" ? await readJsonBody(request) : {};

  if (request.headers.origin === APP_ORIGIN) {
    response.setHeader("Access-Control-Allow-Origin", APP_ORIGIN);
    response.setHeader("Vary", "Origin");
  }
  if (method === "OPTIONS" && pathname.startsWith("/auth/v1/")) {
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "apikey, authorization, content-type, x-client-info, x-supabase-api-version");
    return response.writeHead(204).end();
  }
  if (method === "GET" && pathname === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }
  if (method === "GET" && pathname === "/outbox") {
    const recipient = searchParams.get("to");
    return sendJson(response, 200, outbox.filter((email) => email.to === recipient));
  }
  if (method === "POST" && pathname === "/outbox/fail-next-delivery" && isFixtureEmail(body.to)) {
    failedDeliveries.add(body.to);
    return response.writeHead(204).end();
  }
  if (method === "POST" && pathname === "/outbox/throttle-next-recovery" && isFixtureEmail(body.to)) {
    throttledRecoveries.add(body.to);
    return response.writeHead(204).end();
  }
  if (method === "POST" && pathname === "/resend/emails") {
    const recipient = body.to?.[0];
    if (bearer !== "e2e-fake-resend" || !isFixtureEmail(recipient) || body.to.length !== 1) {
      return sendJson(response, 400, { error: "Invalid synthetic email" });
    }
    if (failedDeliveries.delete(recipient)) return sendJson(response, 503, { error: "Simulated delivery failure" });
    outbox.push({ to: recipient, subject: body.subject, html: body.html });
    return sendJson(response, 200, { id: randomUUID() });
  }
  if (method === "POST" && pathname === "/openai/fail-next-completion" && typeof body.prompt === "string") {
    failedCompletions.add(body.prompt);
    return response.writeHead(204).end();
  }
  if (method === "POST" && pathname === "/openai/v1/chat/completions") {
    if (bearer !== "e2e-fake-openai" || !Array.isArray(body.messages)) {
      return sendJson(response, 400, { error: { message: "Invalid synthetic completion request" } });
    }
    if (failedCompletions.delete(body.messages.at(-1)?.content)) {
      response.setHeader("x-should-retry", "false");
      return sendJson(response, 503, { error: { message: "Simulated completion failure" } });
    }
    return sendJson(response, 200, {
      id: randomUUID(), model: body.model,
      choices: [{ message: { role: "assistant", content: "Fake tutor response." }, finish_reason: "stop" }],
      usage: { prompt_tokens: 20, completion_tokens: 4, total_tokens: 24 },
    });
  }

  if (method === "POST" && pathname === "/auth/v1/signup") {
    if (!isFixtureEmail(body.email) || typeof body.password !== "string" || findUser(body.email)) {
      return authError(response, 400, "invalid_credentials", "Invalid synthetic signup");
    }
    const user = createUser({ email: body.email, password: body.password, metadata: body.data });
    deliverAuthLink(user, "email", `${APP_ORIGIN}/auth/confirm`);
    return sendJson(response, 200, userPayload(user));
  }
  if (method === "POST" && pathname === "/auth/v1/recover") {
    const user = findUser(body.email);
    const redirect = searchParams.get("redirect_to");
    if (!isFixtureEmail(body.email) || redirect !== `${APP_ORIGIN}/auth/password-reset` ||
        request.headers.apikey !== "sb_publishable_e2e_test_only") {
      return authError(response, 400, "validation_failed", "Invalid synthetic recovery request");
    }
    if (throttledRecoveries.delete(body.email)) {
      return authError(response, 429, "over_email_send_rate_limit", "Simulated provider throttling");
    }
    if (user?.confirmedAt && !user.banned) {
      const pkceS256 = body.code_challenge_method === "s256" && /^[\w-]{43}$/.test(body.code_challenge ?? "");
      deliverAuthLink(user, "recovery", redirect, { pkceS256 });
    }
    return sendJson(response, 200, {});
  }
  if (method === "POST" && pathname === "/auth/v1/verify") {
    const token = tokens.get(body.token_hash);
    if (!token || token.type !== body.type || token.user.banned || !users.has(token.user.id)) {
      return authError(response, 403, "otp_expired", "Email link is invalid or has expired");
    }
    tokens.delete(body.token_hash);
    if (token.type === "email") token.user.confirmedAt = new Date().toISOString();
    return sendJson(response, 200, issueSession(token.user));
  }
  if (method === "POST" && pathname === "/auth/v1/token") {
    const grantType = searchParams.get("grant_type");
    if (grantType === "password") {
      const user = findUser(body.email);
      if (user?.confirmedAt && !user.banned && body.password === user.password) {
        return sendJson(response, 200, issueSession(user));
      }
    }
    if (grantType === "refresh_token") {
      const record = [...sessions.values()].find((item) => item.refreshToken === body.refresh_token);
      if (record && !record.user.banned) return sendJson(response, 200, issueSession(record.user));
    }
    return authError(response, 400, "invalid_credentials", "Invalid login credentials");
  }
  if (pathname === "/auth/v1/user" && (method === "GET" || method === "PUT")) {
    if (!session || session.user.banned) return authError(response, 401, "bad_jwt", "Invalid JWT");
    if (method === "PUT") session.user.password = body.password;
    return sendJson(response, 200, userPayload(session.user));
  }
  if (method === "POST" && pathname === "/auth/v1/logout") {
    if (session) {
      if (searchParams.get("scope") === "local") sessions.delete(bearer);
      else revokeSessions(session.user);
    }
    return response.writeHead(204).end();
  }

  const adminId = pathname.match(/^\/auth\/v1\/admin\/users\/([^/]+)$/)?.[1];
  if (adminId && request.headers.apikey === "sb_secret_e2e_only") {
    const user = users.get(adminId);
    if (!user) return authError(response, 404, "user_not_found", "User not found");
    if (method === "GET") return sendJson(response, 200, userPayload(user));
    if (method === "PUT") {
      if (body.user_metadata) user.metadata = body.user_metadata;
      if (typeof body.password === "string") user.password = body.password;
      if (typeof body.ban_duration === "string") {
        user.banned = body.ban_duration !== "none";
        if (user.banned) revokeSessions(user);
      }
      return sendJson(response, 200, userPayload(user));
    }
    if (method === "DELETE") {
      revokeSessions(user);
      users.delete(adminId);
      return sendJson(response, 200, {});
    }
  }

  console.error(JSON.stringify({ event: "unexpected_fake_supabase_request", method, path: pathname }));
  return sendJson(response, 404, { error: "Not found" });
}

function isFixtureEmail(email) {
  return typeof email === "string" && /^[a-z0-9.-]+@example\.test$/.test(email);
}

function createUser({ id = randomUUID(), email, password, confirmedAt, metadata = {} }) {
  const user = { id, email, password, metadata, confirmedAt, createdAt: new Date().toISOString() };
  users.set(id, user);
  return user;
}

function findUser(email) {
  return [...users.values()].find((user) => user.email === email);
}

function userPayload(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: user.confirmedAt,
    phone: "",
    confirmed_at: user.confirmedAt,
    last_sign_in_at: user.lastSignInAt,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: user.metadata,
    identities: [{ id: user.id, user_id: user.id, provider: "email" }],
    created_at: user.createdAt,
    updated_at: user.createdAt,
    is_anonymous: false,
  };
}

function issueSession(user) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: user.id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = [encode({ alg: "HS256", typ: "JWT" }), encode(claims), randomUUID()].join(".");
  const refreshToken = randomUUID();
  user.lastSignInAt = new Date().toISOString();
  sessions.set(accessToken, { user, refreshToken });
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: refreshToken,
    user: userPayload(user),
  };
}

function revokeSessions(user) {
  for (const [accessToken, session] of sessions) {
    if (session.user === user) sessions.delete(accessToken);
  }
}

function deliverAuthLink(user, type, target, requestMetadata = {}) {
  for (const [token, entry] of tokens) {
    if (entry.user === user && entry.type === type) tokens.delete(token);
  }
  const token = randomUUID();
  tokens.set(token, { user, type });
  const link = new URL(target);
  link.searchParams.set("token_hash", token);
  link.searchParams.set("type", type);
  outbox.push({
    to: user.email, subject: type === "email" ? "Confirm your email" : "Reset your password",
    link: link.href, ...requestMetadata,
  });
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function authError(response, status, code, message) {
  return sendJson(response, status, { code, error_code: code, msg: message });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

server.listen(PORT, HOST, () => console.log(`Fake Auth and email services listening on http://${HOST}:${PORT}`));
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
