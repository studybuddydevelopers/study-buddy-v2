// app/api/v1/signup/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

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

  // MUST be created before supabase so cookies attach to it
  let res = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,          // ✅ FIXED
    process.env.SUPABASE_ANON_KEY!,     // ✅ FIXED
    {
      cookies: {
        get(name) {
          return (
            req.headers
              .get("cookie")
              ?.split("; ")
              .find((c) => c.startsWith(`${name}=`))
              ?.split("=")[1] ?? null
          );
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

  // 1. Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, middleNames, lastNames, phoneNumber },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID missing" }, { status: 500 });
  }

  // 2. Seed Prisma DB
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      profile: {
        create: {
          firstName,
          middleNames,
          lastNames,
          phoneNumber,
          preferredSubjects: [],
        },
      },
    },
    update: {},
  });

  return res; // return SAME RESPONSE INSTANCE
}
