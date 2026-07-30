import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getConfiguredEmbeddingProvider } from "@/lib/ai/embeddings/provider";
import { ResourceEmbeddingRepository } from "@/lib/resources/retrieval/resource-embedding-repository";
import { PostgresResourceSearchRepository } from "@/lib/resources/retrieval/postgres-resource-search-repository";
import { retrievalEvaluationCases } from "@/lib/resources/retrieval/evaluation/fixtures";
import { runRetrievalEvaluation } from "@/lib/resources/retrieval/evaluation/runner";
import type {
  RetrievalEvaluationCase,
  RetrievalEvaluationSplit,
} from "@/lib/resources/retrieval/evaluation/types";
import type { RetrievalFilters } from "@/lib/resources/retrieval/types";

type EvaluationMode = "keyword" | "vector" | "hybrid";

interface Args {
  casesFile?: string;
  split: RetrievalEvaluationSplit | "all";
  limit: number;
  withVector: boolean;
  mode: EvaluationMode;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = args.casesFile
    ? await readCases(args.casesFile)
    : retrievalEvaluationCases;
  const searchRepository = new PostgresResourceSearchRepository();
  const embeddingRepository = new ResourceEmbeddingRepository();
  const activeConfig = await searchRepository.getActiveEmbeddingConfiguration();
  const coverage = activeConfig
    ? await embeddingRepository.recalculateCoverage(activeConfig.id)
    : {
        eligibleChunkCount: 0,
        completedChunkCount: 0,
        failedChunkCount: 0,
      };
  const provider =
    args.mode === "vector" || args.withVector
      ? getConfiguredEmbeddingProvider()
      : null;
  const report = await runRetrievalEvaluation({
    repository: {
      hybridSearch: async (input) => {
        if (args.mode === "keyword") {
          return searchRepository.keywordSearch(input);
        }
        if (args.mode === "vector") {
          if (!provider) throw new Error("Vector evaluation requires a provider.");
          return searchRepository.vectorSearch({
            queryEmbedding: await provider.embedQuery(input.query),
            filters: input.filters,
            limit: input.limit,
          });
        }
        return searchRepository.hybridSearch({
          ...input,
          queryEmbedding: provider
            ? await provider.embedQuery(input.query)
            : undefined,
        });
      },
    },
    cases,
    split: args.split,
    limit: args.limit,
    embeddingCoverage: coverage,
  });

  console.log(JSON.stringify({ mode: args.mode, ...report }, null, 2));
}

function parseArgs(values: string[]): Args {
  return {
    casesFile: readStringArg(values, "--cases"),
    split: readSplit(values),
    limit: readNumberArg(values, "--limit", 5),
    withVector: values.includes("--with-vector"),
    mode: readMode(values),
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

function readSplit(values: string[]): RetrievalEvaluationSplit | "all" {
  const value = readStringArg(values, "--split");
  if (value === "development" || value === "holdout") return value;
  return "all";
}

function readMode(values: string[]): EvaluationMode {
  const value = readStringArg(values, "--mode");
  if (value === "keyword" || value === "vector" || value === "hybrid") {
    return value;
  }
  return "hybrid";
}

async function readCases(filePath: string) {
  const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("Evaluation cases file must contain a JSON array.");
  }
  return parsed.map(normalizeCase) as RetrievalEvaluationCase[];
}

function normalizeCase(input: RetrievalEvaluationCase & RetrievalFilters) {
  const filters = input.filters ?? {
    ...(input.subjectId ? { subjectId: input.subjectId } : {}),
    ...(input.topicId ? { topicId: input.topicId } : {}),
    ...(input.chunkTypes ? { chunkTypes: input.chunkTypes } : {}),
    ...(input.sourceKinds ? { sourceKinds: input.sourceKinds } : {}),
  };

  return {
    ...input,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Retrieval evaluation failed."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
