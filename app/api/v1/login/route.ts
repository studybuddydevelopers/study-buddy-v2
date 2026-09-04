// app/api/v1/login/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { isRecord } from "@/lib/type-utils";
import {
  parseJsonRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";
import {
  enforceRateLimitRules,
  getClientIp,
} from "@/lib/security/rate-limit";
import { fetchWithTimeout } from "@/lib/security/timeouts";

export async function POST(req: Request) {
  const parsedBody = await parseJsonRequest(req, REQUEST_LIMITS.publicFormJson);
  if (!parsedBody.ok) return parsedBody.response;
  if (!isRecord(parsedBody.data)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parsedBody.data;
  const { identifier, password } = body;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  if (typeof identifier !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const rateLimitResponse = await enforceRateLimitRules([
    {
      scope: "auth:login:ip",
      identifier: getClientIp(req.headers),
      limit: 20,
      windowMs: 15 * 60_000,
    },
    {
      scope: "auth:login:account",
      identifier: identifier.trim().toLowerCase(),
      limit: 10,
      windowMs: 15 * 60_000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const res = NextResponse.json({ success: true });
  const supabaseConfig = getServerSupabaseConfig();

  // --------------------------
  // SUPABASE COOKIE-AWARE CLIENT
  // --------------------------
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.get("cookie"));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, { ...options, path: "/" });
          });
        },
      },
    }
  );

  // --------------------------
  // LOGIN ACTION
  // --------------------------
  const isEmail = /\S+@\S+\.\S+/.test(identifier);

  let error;
  let data;

  if (isEmail) {
    ({ error, data } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
      options: { captchaToken },
    }));
  } else {
    ({ error, data } = await supabase.auth.signInWithPassword({
      phone: identifier,
      password,
      options: { captchaToken },
    }));
  }

  if (error || !data?.user) {
    return NextResponse.json(
      { error: error?.message ?? "Login failed" },
      { status: 401 }
    );
  }

  // NO PRISMA. NO UPSERT. NO SYNCING.
  return res;
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      return {
        name,
        value: valueParts.join("="),
      };
    })
    .filter((cookie) => cookie.name);
}
