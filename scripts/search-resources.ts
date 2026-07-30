import { prisma } from "@/lib/prisma";
import { getConfiguredEmbeddingProvider } from "@/lib/ai/embeddings/provider";
import { PostgresResourceSearchRepository } from "@/lib/resources/retrieval/postgres-resource-search-repository";

interface Args {
  query: string;
  mode: "keyword" | "vector" | "hybrid";
  limit: number;
  withVector: boolean;
  subjectId?: string;
  topicId?: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.query) {
    throw new Error("A query is required. Use --query=\"...\".");
  }

  const repository = new PostgresResourceSearchRepository();
  const filters = {
    ...(args.subjectId ? { subjectId: args.subjectId } : {}),
    ...(args.topicId ? { topicId: args.topicId } : {}),
  };

  const results =
    args.mode === "keyword"
      ? await repository.keywordSearch({
          query: args.query,
          filters,
          limit: args.limit,
        })
      : args.mode === "vector"
        ? await repository.vectorSearch({
            queryEmbedding: await getConfiguredEmbeddingProvider().embedQuery(
              args.query
            ),
            filters,
            limit: args.limit,
          })
        : await repository.hybridSearch({
            query: args.query,
            queryEmbedding: args.withVector
              ? await getConfiguredEmbeddingProvider().embedQuery(args.query)
              : undefined,
            filters,
            limit: args.limit,
          });

  console.log(
    JSON.stringify(
      {
        mode: args.mode,
        query: args.query,
        resultCount: results.length,
        results: results.map((result) => ({
          chunkId: result.id,
          resourceId: result.resourceId,
          resourceTitle: result.resourceTitle,
          chunkType: result.chunkType,
          subjectId: result.subjectId,
          topicId: result.topicId,
          snippet: result.snippet,
          diagnostics: {
            vectorRank: result.vectorRank,
            vectorDistance: result.vectorDistance,
            keywordRank: result.keywordRank,
            keywordScore: result.keywordScore,
            exactSignals: result.exactSignals,
            fusionScore: result.fusionScore,
            alternateProvenance: result.alternateProvenance,
          },
        })),
      },
      null,
      2
    )
  );
}

function parseArgs(values: string[]): Args {
  const mode = readStringArg(values, "--mode");
  return {
    query: readStringArg(values, "--query") ?? "",
    mode: mode === "vector" || mode === "hybrid" ? mode : "keyword",
    limit: readNumberArg(values, "--limit", 5),
    withVector: values.includes("--with-vector"),
    subjectId: readStringArg(values, "--subject-id"),
    topicId: readStringArg(values, "--topic-id"),
  };
}

function readStringArg(values: string[], name: string) {
  const value = values.find((item) => item.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : undefined;
}

function readNumberArg(values: string[], name: string, fallback: number) {
  const value = values.find((item) => item.startsWith(`${name}=`));
  if (!value) return fallback;
  const parsed = Number.parseInt(value.slice(name.length + 1), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Resource search failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
