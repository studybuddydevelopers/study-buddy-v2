import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  // ---------------------------------------------------------
  // 1. PARSE INPUT
  // ---------------------------------------------------------
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 2. CREATE EDITABLE RESPONSE (for supabase cookies)
  // ---------------------------------------------------------
  let res = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.headers
            .get("cookie")
            ?.split("; ")
            .find((c) => c.startsWith(name + "="))
            ?.split("=")?.[1];
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0, path: "/" });
        },
      },
    }
  );

  // ---------------------------------------------------------
  // 3. SEND PASSWORD RESET EMAIL
  // ---------------------------------------------------------
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/update`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Unable to send reset email: " + error.message },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 4. SUCCESS RESPONSE
  // ---------------------------------------------------------
  return NextResponse.json({ ok: true, email: email });
}
