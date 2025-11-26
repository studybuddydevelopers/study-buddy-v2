import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const { identifier, password } = await req.json();

  if (!identifier || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // MUST create an editable response object
  const res = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // correct way to read incoming cookies
          return req.headers
            .get("cookie")
            ?.split("; ")
            .find((c) => c.startsWith(name + "="))
            ?.split("=")[1];
        },
        set(name, value, options) {
          // correctly pushes a Set-Cookie header
          res.cookies.set(name, value, {
            ...options,
            path: "/",
          });
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

  const isEmail = /\S+@\S+\.\S+/.test(identifier);

  let error;

  if (isEmail) {
    ({ error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    }));
  } else {
    ({ error } = await supabase.auth.signInWithPassword({
      phone: identifier,
      password,
    }));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // important: return the same response object with cookies applied
  return res;
}
