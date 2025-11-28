// app/api/reset-password/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const body = await req.json();
  const { identifier } = body; // email OR phone

  if (!identifier) {
    return NextResponse.json(
      { error: "Email or phone number is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() {},
        set() {},
        remove() {},
      },
    }
  );

  let error;

  // Decide email vs phone
  if (identifier.includes("@")) {
    // Email password reset
    const result = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
    });
    error = result.error;
  } else {
    // Phone password reset not supported directly — your backend logic can be added later
    return NextResponse.json(
      { error: "Phone-based password resets are not supported yet." },
      { status: 400 }
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
