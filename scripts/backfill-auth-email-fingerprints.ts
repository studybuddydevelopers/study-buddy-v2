import { prisma } from "../lib/prisma";
import { securityIdentifierHash } from "../lib/security/audit-log";
import { getSupabaseAdminClient } from "../lib/supabase/admin";

const PAGE_SIZE = 1000;

async function main() {
  let page = 1;
  let examined = 0;
  let updated = 0;

  for (;;) {
    const result = await getSupabaseAdminClient().auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (result.error) throw result.error;
    if (result.data.users.length === 0) break;

    for (const authUser of result.data.users) {
      if (!authUser.email) continue;
      examined += 1;
      const change = await prisma.user.updateMany({
        where: { id: authUser.id },
        data: {
          authEmailFingerprint: securityIdentifierHash(authUser.email),
        },
      });
      updated += change.count;
    }

    if (result.data.users.length < PAGE_SIZE) break;
    page += 1;
  }

  console.info(
    JSON.stringify({
      event: "auth_email_fingerprint_backfill_completed",
      examined,
      updated,
    })
  );
}

main()
  .catch((error: unknown) => {
    const reason = error instanceof Error ? error.name : "UNKNOWN";
    console.error(
      JSON.stringify({
        event: "auth_email_fingerprint_backfill_failed",
        reason,
      })
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
