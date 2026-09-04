import { NextResponse } from "next/server";
import { isRecord } from "@/lib/type-utils";
import {
  parseJsonRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";
import {
  enforceRateLimitRules,
  getClientIp,
} from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const parsedBody = await parseJsonRequest(req, REQUEST_LIMITS.publicFormJson);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, subject, message } = body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof subject !== "string" ||
    typeof message !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !subject.trim() ||
    !message.trim()
  ) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (name.length > 120 || email.length > 320 || subject.length > 200 || message.length > 5_000) {
    return NextResponse.json({ error: "One or more fields are too long" }, { status: 400 });
  }

  const rateLimitResponse = await enforceRateLimitRules([
    {
      scope: "contact:ip",
      identifier: getClientIp(req.headers),
      limit: 5,
      windowMs: 60 * 60_000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  console.info("[contact-form] accepted", { messageLength: message.length });

  return NextResponse.json({ success: true });
}
