// app/api/v1/login/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const body = await req.json();
  const { identifier, password } = body;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  if (!identifier || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });

  // --------------------------
  // SUPABASE COOKIE-AWARE CLIENT
  // --------------------------
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.headers
            .get("cookie")
            ?.split("; ")
            .find((c) => c.startsWith(name + "="))
            ?.split("=")?.[1] ?? null;
        },
        set(name, value, options) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },
        remove(name, options) {
          res.cookies.set(name, "", { ...options, maxAge: 0, path: "/" });
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
