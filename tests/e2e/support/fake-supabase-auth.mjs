import http from "node:http";

const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.E2E_FAKE_SUPABASE_PORT ?? "55431", 10);
const USER = Object.freeze({
  id: "11111111-1111-4111-8111-111111111111",
  email: "e2e.student@example.test",
  password: "E2E-password-123!",
});
const REFRESH_TOKEN = "e2e-refresh-token";
const ACCESS_TOKEN = createAccessToken();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);

  if (request.method === "GET" && url.pathname === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }

  if (request.method === "POST" && url.pathname === "/auth/v1/token") {
    const body = await readJsonBody(request);
    const grantType = url.searchParams.get("grant_type");

    if (
      grantType === "password" &&
      body?.email === USER.email &&
      body?.password === USER.password
    ) {
      return sendJson(response, 200, sessionPayload());
    }
    if (grantType === "refresh_token" && body?.refresh_token === REFRESH_TOKEN) {
      return sendJson(response, 200, sessionPayload());
    }

    return sendJson(response, 400, {
      code: "invalid_credentials",
      error_code: "invalid_credentials",
      msg: "Invalid login credentials",
    });
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/user") {
    if (request.headers.authorization === `Bearer ${ACCESS_TOKEN}`) {
      return sendJson(response, 200, userPayload());
    }
    return sendJson(response, 401, {
      code: "bad_jwt",
      error_code: "bad_jwt",
      msg: "Invalid JWT",
    });
  }

  if (request.method === "POST" && url.pathname === "/auth/v1/logout") {
    response.writeHead(204);
    return response.end();
  }

  console.error(
    JSON.stringify({
      event: "unexpected_fake_supabase_request",
      method: request.method,
      path: url.pathname,
    })
  );
  return sendJson(response, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Fake Supabase Auth listening on http://${HOST}:${PORT}`);
});

function userPayload() {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return {
    id: USER.id,
    aud: "authenticated",
    role: "authenticated",
    email: USER.email,
    email_confirmed_at: timestamp,
    phone: "",
    confirmed_at: timestamp,
    last_sign_in_at: timestamp,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { accountStatus: "ACTIVE" },
    identities: [],
    created_at: timestamp,
    updated_at: timestamp,
    is_anonymous: false,
  };
}

function sessionPayload() {
  return {
    access_token: ACCESS_TOKEN,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: REFRESH_TOKEN,
    user: userPayload(),
  };
}

function createAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  return [
    base64Url({ alg: "HS256", typ: "JWT" }),
    base64Url({
      sub: USER.id,
      aud: "authenticated",
      role: "authenticated",
      email: USER.email,
      iat: now,
      exp: now + 3600,
    }),
    "synthetic-e2e-signature",
  ].join(".");
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
