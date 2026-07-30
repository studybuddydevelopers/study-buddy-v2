import { prisma } from "@/lib/prisma";
import { buildResourceChunkSearchText } from "@/lib/resources/retrieval/search-text";

interface Args {
  dryRun: boolean;
  limit: number;
  batchSize: number;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let scanned = 0;
  let updated = 0;
  let cursor: string | undefined;

  while (scanned < args.limit) {
    const chunks = await prisma.resourceChunk.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      orderBy: [{ id: "asc" }],
      take: Math.min(args.batchSize, args.limit - scanned),
      include: {
        resource: {
          select: {
            title: true,
            description: true,
            sourceKind: true,
            subjectId: true,
            topicId: true,
            contentHash: true,
          },
        },
      },
    });

    if (chunks.length === 0) break;
    scanned += chunks.length;
    cursor = chunks[chunks.length - 1]?.id;

    for (const chunk of chunks) {
      const nextSearchText = buildResourceChunkSearchText({
        resource: chunk.resource,
        chunk,
      });
      if (chunk.searchText === nextSearchText) continue;
      updated += 1;
      if (!args.dryRun) {
        await prisma.resourceChunk.update({
          where: { id: chunk.id },
          data: { searchText: nextSearchText },
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        scanned,
        updated,
      },
      null,
      2
    )
  );
}

function parseArgs(values: string[]): Args {
  return {
    dryRun: values.includes("--dry-run"),
    limit: readNumberArg(values, "--limit", 10_000),
    batchSize: readNumberArg(values, "--batch-size", 200),
  };
}

function readNumberArg(values: string[], name: string, fallback: number) {
  const value = values.find((item) => item.startsWith(`${name}=`));
  if (!value) return fallback;
  const parsed = Number.parseInt(value.slice(name.length + 1), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Search rebuild failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
