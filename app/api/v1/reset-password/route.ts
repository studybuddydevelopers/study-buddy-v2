// app/api/v1/reset-password/route.ts
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(req: Request) {
  const body = await req.json();
  const { email } = body;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  const res = new NextResponse();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.headers
            .get("cookie")
            ?.split("; ")
            .find((c) => c.startsWith(name + "="))
            ?.split("=")?.[1] ?? null;
        },
        set(name: string, value: string, options?: CookieOptions) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },
        remove(name: string, options?: CookieOptions) {
          res.cookies.set(name, "", { ...options, maxAge: 0, path: "/" });
        },
      },
    }
  );

  // ⭐ IMPORTANT ⭐
  // emailRedirectTo makes Supabase put the PKCE token into *your* redirect URL
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/password-reset`,
    captchaToken,
    // emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/password-reset`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
