import { NextResponse } from "next/server";
import { z } from "zod";
import { GuardianWithdrawalConflict, requireGuardianWithdrawalOperator, withdrawGuardianAuthorisation } from "@/lib/guardian-withdrawal";
import { parseJsonObjectRequest, REQUEST_LIMITS } from "@/lib/security/request-body";

const verifiedWithdrawal = z.object({
  authorizationId: z.string().uuid(),
  caseReference: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/),
  verified: z.literal(true),
}).strict();

export async function POST(request: Request) {
  const auth = await requireGuardianWithdrawalOperator();
  if ("errorResponse" in auth) return auth.errorResponse;
  const body = await parseJsonObjectRequest(request, REQUEST_LIMITS.publicFormJson);
  if (!body.ok) return body.response;
  const input = verifiedWithdrawal.safeParse(body.data);
  if (!input.success) {
    return NextResponse.json(
      { error: "INVALID_WITHDRAWAL", message: "Enter the authorisation ID and private case reference, and confirm verification." },
      { status: 400 },
    );
  }
  try {
    const notices = await withdrawGuardianAuthorisation({ ...input.data, operatorUserId: auth.dbUser.id });
    return NextResponse.json(
      { restricted: true, ...notices },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (!(error instanceof GuardianWithdrawalConflict)) throw error;
    return NextResponse.json({ error: "WITHDRAWAL_CONFLICT", message: error.message }, { status: 409 });
  }
}
