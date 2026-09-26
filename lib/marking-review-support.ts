import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const MARKING_REVIEW_SUPPORT_EMAIL_DOMAIN = "studybuddyng.com";

type MarkingReviewSupportIdentity = {
  userId: string;
  email?: string | null;
  emailConfirmedAt?: string | null;
};

function configuredSupportUserIds() {
  return new Set(
    (process.env.MARKING_REVIEW_SUPPORT_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isMarkingReviewSupportUser({
  userId,
  email,
  emailConfirmedAt,
}: MarkingReviewSupportIdentity) {
  if (configuredSupportUserIds().has(userId)) return true;
  if (!email || !emailConfirmedAt) return false;

  const [localPart, domain, ...unexpectedParts] = email
    .trim()
    .toLowerCase()
    .split("@");

  return (
    unexpectedParts.length === 0 &&
    Boolean(localPart) &&
    domain === MARKING_REVIEW_SUPPORT_EMAIL_DOMAIN
  );
}

export async function requireMarkingReviewSupport() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth;

  if (
    !isMarkingReviewSupportUser({
      userId: auth.dbUser.id,
      email: auth.user.email,
      emailConfirmedAt: auth.user.email_confirmed_at,
    })
  ) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "SUPPORT_ACCESS_REQUIRED",
          message: "This page is restricted to Study Buddy support.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }

  return auth;
}
