import { prisma } from "@/lib/prisma";
import { embedApprovedResourceChunks } from "@/lib/resources/retrieval/embedding-service";
import { ResourceEmbeddingRepository } from "@/lib/resources/retrieval/resource-embedding-repository";

interface Args {
  dryRun: boolean;
  limit: number;
  batchSize: number;
  maxBatchTokens: number;
  leaseMs: number;
  activate: boolean;
  minCoverageRatio: number;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = new ResourceEmbeddingRepository();
  const report = await embedApprovedResourceChunks({
    repository,
    dryRun: args.dryRun,
    limit: args.limit,
    batchSize: args.batchSize,
    maxBatchTokens: args.maxBatchTokens,
    leaseMs: args.leaseMs,
  });

  let activation:
    | { activated: true; configurationId: string }
    | { activated: false; reason: string }
    | undefined;

  if (args.activate && !args.dryRun) {
    try {
      const active = await repository.activateConfiguration({
        configurationId: report.configurationId,
        minCoverageRatio: args.minCoverageRatio,
      });
      activation = { activated: true, configurationId: active.id };
    } catch (error) {
      activation = {
        activated: false,
        reason:
          error instanceof Error
            ? error.message
            : "Embedding configuration activation failed.",
      };
    }
  }

  console.log(JSON.stringify({ ...report, activation }, null, 2));
}

function parseArgs(values: string[]): Args {
  return {
    dryRun: values.includes("--dry-run"),
    limit: readNumberArg(values, "--limit", 100),
    batchSize: readNumberArg(values, "--batch-size", 32),
    maxBatchTokens: readNumberArg(values, "--max-batch-tokens", 8_000),
    leaseMs: readNumberArg(values, "--lease-ms", 300_000),
    activate: values.includes("--activate"),
    minCoverageRatio: readRatioArg(values, "--min-coverage", 1),
  };
}

function readNumberArg(values: string[], name: string, fallback: number) {
  const value = values.find((item) => item.startsWith(`${name}=`));
  if (!value) return fallback;
  const parsed = Number.parseInt(value.slice(name.length + 1), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readRatioArg(values: string[], name: string, fallback: number) {
  const value = values.find((item) => item.startsWith(`${name}=`));
  if (!value) return fallback;
  const parsed = Number.parseFloat(value.slice(name.length + 1));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Embedding run failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
