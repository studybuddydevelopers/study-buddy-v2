import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

function configuredSupportUserIds() {
  return new Set(
    (process.env.MARKING_REVIEW_SUPPORT_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isMarkingReviewSupportUser(userId: string) {
  return configuredSupportUserIds().has(userId);
}

export async function requireMarkingReviewSupport() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth;

  if (!isMarkingReviewSupportUser(auth.dbUser.id)) {
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
