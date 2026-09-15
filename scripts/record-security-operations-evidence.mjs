import { PrismaClient } from "@prisma/client";

const ALLOWED_TYPES = new Set([
  "BACKUP_RESTORE_TEST",
  "PROVIDER_ACCESS_REVIEW",
]);
const prisma = new PrismaClient();

async function main() {
  const [evidenceType, verifiedAtInput, reviewedByInput, referenceInput] =
    process.argv.slice(2);
  if (!ALLOWED_TYPES.has(evidenceType)) {
    throw new Error(
      "Evidence type must be BACKUP_RESTORE_TEST or PROVIDER_ACCESS_REVIEW."
    );
  }
  const verifiedAt = new Date(verifiedAtInput);
  if (!verifiedAtInput || Number.isNaN(verifiedAt.getTime())) {
    throw new Error("Provide a valid ISO-8601 verification date/time.");
  }
  if (verifiedAt > new Date()) {
    throw new Error("Evidence verification time cannot be in the future.");
  }
  const reviewedBy = boundedOptional(reviewedByInput, 160);
  const reference = boundedOptional(referenceInput, 500);
  await prisma.securityOperationsEvidence.upsert({
    where: { evidenceType },
    create: { evidenceType, verifiedAt, reviewedBy, reference },
    update: { verifiedAt, reviewedBy, reference },
  });
  console.info(
    JSON.stringify({
      event: "security_operations_evidence_recorded",
      evidenceType,
      verifiedAt: verifiedAt.toISOString(),
    })
  );
}

function boundedOptional(value, maximum) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maximum) : null;
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        event: "security_operations_evidence_failed",
        reason: error instanceof Error ? error.message : "UNKNOWN",
      })
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
