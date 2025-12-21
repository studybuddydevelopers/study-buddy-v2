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

  // 3. Initialize subject progress at 0% for all subjects
  const subjects = await prisma.subject.findMany({ select: { id: true } });
  if (subjects.length > 0) {
    const existing = await prisma.progressTrack.findMany({
      where: { userId },
      select: { subjectId: true },
    });
    const existingSet = new Set(existing.map((e) => e.subjectId));
    const newTracks = subjects
      .filter((s) => !existingSet.has(s.id))
      .map((s) => ({
        userId,
        subjectId: s.id,
        progressPercentage: 0,
      }));
    if (newTracks.length > 0) {
      await prisma.progressTrack.createMany({ data: newTracks });
    }
  }

  return res; // return SAME RESPONSE INSTANCE
}
