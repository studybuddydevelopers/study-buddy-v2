// app/api/v1/login/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase/config";

export async function POST(req: Request) {
  const body = await req.json();
  const { identifier, password } = body;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  if (!identifier || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });
  const supabaseConfig = getServerSupabaseConfig();

  // --------------------------
  // SUPABASE COOKIE-AWARE CLIENT
  // --------------------------
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
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
