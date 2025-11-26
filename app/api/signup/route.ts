import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const {
    firstName,
    middleNames,
    lastNames,
    email,
    phoneNumber,
    password,
  } = await req.json();

  if (!firstName || !lastNames || !email || !phoneNumber || !password) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // response object where cookies will be attached
  const res = NextResponse.json({ success: true });

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
            ?.split("=")[1];
        },
        set(name, value, options) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },
        remove(name, options) {
          res.cookies.set(name, "", {
            ...options,
            maxAge: 0,
            path: "/",
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        firstName,
        middleNames,
        lastNames,
        phoneNumber,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return res;
}
