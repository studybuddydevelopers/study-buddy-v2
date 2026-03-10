import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    // 1) Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2) Compare password with hashed password in DB
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3) Create JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET missing in .env");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      secret,
      { expiresIn: "7d" }
    );

    // 4) Send JSON + HttpOnly cookie
    const res = NextResponse.json({
      user: { id: user.id, email: user.email },
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
