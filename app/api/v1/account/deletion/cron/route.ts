import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  processDueAccountDeletions,
  processInactiveAccountRetention,
} from "@/lib/account-lifecycle";
import { logSecurityEvent } from "@/lib/security/audit-log";

export async function POST(request: Request) {
  const expected = process.env.ACCOUNT_DELETION_CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!secretsMatch(expected, provided)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const inactiveAccounts = await processInactiveAccountRetention();
    const deletions = await processDueAccountDeletions();
    return NextResponse.json(
      { inactiveAccounts, deletions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    logSecurityEvent("account_deletion_cron_failed", "error");
    return NextResponse.json(
      { error: "Deletion processing is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function secretsMatch(expected: string | undefined, provided: string | null) {
  if (!expected || expected.length < 32 || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}
