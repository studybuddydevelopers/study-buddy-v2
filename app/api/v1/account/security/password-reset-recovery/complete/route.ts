import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  completePasswordResetSecurityRecovery,
  PasswordResetSecurityError,
} from "@/lib/password-reset-security";

export async function POST() {
  const auth = await requireAuthenticatedUser({
    allowPasswordResetSecurityRecovery: true,
  });
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const result = await completePasswordResetSecurityRecovery(auth.dbUser.id);
    return NextResponse.json(
      { ok: true, securityLockCleared: result.completed },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof PasswordResetSecurityError &&
      error.code === "RECOVERY_NOT_VERIFIED"
        ? "The password recovery session could not be verified. Use the newest reset email or contact security@studybuddyng.com."
        : "The password was changed, but the account security lock could not be cleared. Contact security@studybuddyng.com.";
    return NextResponse.json(
      { error: "SECURITY_LOCK_CLEAR_FAILED", message },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
