import {
  Prisma,
  ResourceApprovalStatus,
  ResourceChunkEmbeddingStatus,
  ResourceEmbeddingConfigurationStatus,
  ResourceProcessingStatus,
  type PrismaClient,
} from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { RetrievalError } from "./errors";
import { boundedLimit, validateRetrievalFilters } from "./filters";
import { mergeHybridResults } from "./ranking";
import { buildBoundedSnippet } from "./search-text";
import {
  DEFAULT_BRANCH_CANDIDATE_LIMIT,
  DEFAULT_RETRIEVAL_LIMIT,
  MAX_BRANCH_CANDIDATE_LIMIT,
  MAX_RETRIEVAL_LIMIT,
  type HybridSearchInput,
  type KeywordSearchInput,
  type ResourceSearchRepository,
  type RetrievalFilters,
  type RetrievedChunk,
  type VectorSearchInput,
} from "./types";

type QueryablePrisma = Pick<
  PrismaClient,
  "$queryRaw" | "resourceEmbeddingConfiguration" | "subject" | "topic"
>;

interface ChunkRow {
  id: string;
  resourceId: string;
  resourceTitle: string;
  sourceKind: RetrievedChunk["sourceKind"];
  chunkIndex: number;
  chunkType: RetrievedChunk["chunkType"];
  title: string | null;
  content: string;
  contentHash: string;
  subjectId: string | null;
  topicId: string | null;
  questionNumber: string | null;
  keywordScore: number | null;
  vectorDistance: number | null;
}

export class PostgresResourceSearchRepository
  implements ResourceSearchRepository
{
  constructor(private readonly prisma: QueryablePrisma = defaultPrisma) {}

  async getActiveEmbeddingConfiguration() {
    return this.prisma.resourceEmbeddingConfiguration.findFirst({
      where: { status: ResourceEmbeddingConfigurationStatus.ACTIVE },
      orderBy: [{ activatedAt: "desc" }, { id: "desc" }],
    });
  }

  async keywordSearch(input: KeywordSearchInput) {
    const query = normalizeQuery(input.query);
    if (!query) return [];

    const limit = boundedLimit(
      input.limit,
      DEFAULT_BRANCH_CANDIDATE_LIMIT,
      MAX_BRANCH_CANDIDATE_LIMIT
    );
    await validateRetrievalFilters(this.prisma, input.filters);

    const exact = extractExactQueryParts(query);
    const rows = await this.prisma.$queryRaw<ChunkRow[]>`
      SELECT
        c."id",
        c."resourceId",
        r."title" AS "resourceTitle",
        r."sourceKind",
        c."chunkIndex",
        c."chunkType",
        c."title",
        c."content",
        c."contentHash",
        c."subjectId",
        c."topicId",
        c."questionNumber",
        ts_rank_cd(c."searchVector", websearch_to_tsquery('simple'::regconfig, ${query}))::float AS "keywordScore",
        NULL::float AS "vectorDistance"
      FROM "ResourceChunk" c
      JOIN "Resource" r ON r."id" = c."resourceId"
      WHERE ${eligibleChunkSql(input.filters)}
        AND (
          c."searchVector" @@ websearch_to_tsquery('simple'::regconfig, ${query})
          ${exactSignalSql(exact)}
        )
      ORDER BY
        ${exactSortSql(exact)} DESC,
        ts_rank_cd(c."searchVector", websearch_to_tsquery('simple'::regconfig, ${query})) DESC,
        r."id" ASC,
        c."chunkIndex" ASC,
        c."id" ASC
      LIMIT ${limit}
    `;

    return rows.map((row, index) =>
      toRetrievedChunk(row, {
        keywordRank: index + 1,
        vectorRank: null,
        exactSignals: collectExactSignals(query, row),
      })
    );
  }

  async vectorSearch(input: VectorSearchInput) {
    const limit = boundedLimit(
      input.limit,
      DEFAULT_BRANCH_CANDIDATE_LIMIT,
      MAX_BRANCH_CANDIDATE_LIMIT
    );
    await validateRetrievalFilters(this.prisma, input.filters);

    const configuration = input.configurationId
      ? await this.prisma.resourceEmbeddingConfiguration.findFirst({
          where: {
            id: input.configurationId,
            status: ResourceEmbeddingConfigurationStatus.ACTIVE,
          },
        })
      : await this.getActiveEmbeddingConfiguration();

    if (!configuration) {
      throw new RetrievalError(
        "NO_ACTIVE_EMBEDDING_CONFIGURATION",
        "No active embedding configuration is available."
      );
    }

    if (input.queryEmbedding.length !== configuration.dimensions) {
      throw new RetrievalError(
        "DIMENSION_MISMATCH",
        "Query embedding dimensions do not match the active configuration."
      );
    }

    if (!input.queryEmbedding.every(Number.isFinite)) {
      throw new RetrievalError("INVALID_INPUT", "Query embedding is invalid.");
    }

    const vectorLiteral = toVectorLiteral(input.queryEmbedding);
    const rows = await this.prisma.$queryRaw<ChunkRow[]>`
      SELECT
        c."id",
        c."resourceId",
        r."title" AS "resourceTitle",
        r."sourceKind",
        c."chunkIndex",
        c."chunkType",
        c."title",
        c."content",
        c."contentHash",
        c."subjectId",
        c."topicId",
        c."questionNumber",
        NULL::float AS "keywordScore",
        (e."embedding" <=> ${vectorLiteral}::extensions.vector)::float AS "vectorDistance"
      FROM "ResourceChunkEmbedding" e
      JOIN "ResourceChunk" c ON c."id" = e."resourceChunkId"
      JOIN "Resource" r ON r."id" = c."resourceId"
      WHERE ${eligibleChunkSql(input.filters)}
        AND e."configurationId" = ${configuration.id}
        AND e."status" = ${ResourceChunkEmbeddingStatus.COMPLETED}::"ResourceChunkEmbeddingStatus"
        AND e."contentHash" = c."contentHash"
      ORDER BY
        e."embedding" <=> ${vectorLiteral}::extensions.vector ASC,
        r."id" ASC,
        c."chunkIndex" ASC,
        c."id" ASC
      LIMIT ${limit}
    `;

    return rows.map((row, index) =>
      toRetrievedChunk(row, {
        keywordRank: null,
        vectorRank: index + 1,
        exactSignals: [],
      })
    );
  }

  async hybridSearch(input: HybridSearchInput) {
    const outputLimit = boundedLimit(
      input.limit,
      DEFAULT_RETRIEVAL_LIMIT,
      MAX_RETRIEVAL_LIMIT
    );
    const keywordLimit = boundedLimit(
      input.keywordLimit,
      DEFAULT_BRANCH_CANDIDATE_LIMIT,
      MAX_BRANCH_CANDIDATE_LIMIT
    );
    const vectorLimit = boundedLimit(
      input.vectorLimit,
      DEFAULT_BRANCH_CANDIDATE_LIMIT,
      MAX_BRANCH_CANDIDATE_LIMIT
    );

    const [keywordResults, vectorResults] = await Promise.all([
      this.keywordSearch({
        query: input.query,
        filters: input.filters,
        limit: keywordLimit,
      }),
      input.queryEmbedding
        ? this.vectorSearch({
            queryEmbedding: input.queryEmbedding,
            filters: input.filters,
            limit: vectorLimit,
          }).catch((error) => {
            if (
              error instanceof RetrievalError &&
              error.code === "NO_ACTIVE_EMBEDDING_CONFIGURATION"
            ) {
              return [];
            }
            throw error;
          })
        : Promise.resolve([]),
    ]);

    return mergeHybridResults({
      keywordResults,
      vectorResults,
      limit: outputLimit,
      rrfK: input.rrfK,
    });
  }
}

function eligibleChunkSql(filters: RetrievalFilters | undefined) {
  return Prisma.sql`
    r."processingStatus" = ${ResourceProcessingStatus.PROCESSED}::"ResourceProcessingStatus"
    AND r."approvalStatus" = ${ResourceApprovalStatus.APPROVED}::"ResourceApprovalStatus"
    AND r."activeChunkVersion" IS NOT NULL
    AND c."version" = r."activeChunkVersion"
    ${filterSql(filters)}
  `;
}

function filterSql(filters: RetrievalFilters | undefined) {
  if (!filters) return Prisma.empty;

  const clauses: Prisma.Sql[] = [];
  if (filters.subjectId) {
    clauses.push(Prisma.sql`c."subjectId" = ${filters.subjectId}`);
  }
  if (filters.topicId) {
    clauses.push(Prisma.sql`c."topicId" = ${filters.topicId}`);
  }
  if (filters.resourceIds?.length) {
    clauses.push(Prisma.sql`r."id" IN (${Prisma.join(filters.resourceIds)})`);
  }
  if (filters.chunkTypes?.length) {
    clauses.push(
      Prisma.sql`c."chunkType" IN (${Prisma.join(
        filters.chunkTypes.map(
          (chunkType) => Prisma.sql`${chunkType}::"ResourceChunkType"`
        )
      )})`
    );
  }
  if (filters.sourceKinds?.length) {
    clauses.push(
      Prisma.sql`r."sourceKind" IN (${Prisma.join(
        filters.sourceKinds.map(
          (sourceKind) => Prisma.sql`${sourceKind}::"ResourceSourceKind"`
        )
      )})`
    );
  }

  if (clauses.length === 0) return Prisma.empty;
  return Prisma.sql`AND ${Prisma.join(clauses, " AND ")}`;
}

function exactSignalSql(exact: ExactQueryParts) {
  const clauses: Prisma.Sql[] = [];
  for (const phrase of exact.quotedPhrases) {
    clauses.push(Prisma.sql`c."searchText" ILIKE ${`%${phrase}%`}`);
  }
  for (const year of exact.years) {
    clauses.push(Prisma.sql`c."searchText" ILIKE ${`%${year}%`}`);
  }
  for (const questionNumber of exact.questionNumbers) {
    clauses.push(Prisma.sql`c."questionNumber" = ${questionNumber}`);
    clauses.push(
      Prisma.sql`c."searchText" ILIKE ${`%Question ${questionNumber}%`}`
    );
  }
  for (const phrase of exact.educationalPhrases) {
    clauses.push(Prisma.sql`c."searchText" ILIKE ${`%${phrase}%`}`);
  }
  for (const expression of exact.symbolicExpressions) {
    clauses.push(Prisma.sql`c."searchText" ILIKE ${`%${expression}%`}`);
  }
  for (const unit of exact.units) {
    clauses.push(Prisma.sql`c."searchText" ILIKE ${`%${unit}%`}`);
  }

  if (clauses.length === 0) return Prisma.empty;
  return Prisma.sql`OR ${Prisma.join(clauses, " OR ")}`;
}

function exactSortSql(exact: ExactQueryParts) {
  const clauses: Prisma.Sql[] = [];
  for (const phrase of exact.quotedPhrases) {
    clauses.push(
      Prisma.sql`CASE WHEN c."searchText" ILIKE ${`%${phrase}%`} THEN 1 ELSE 0 END`
    );
  }
  for (const year of exact.years) {
    clauses.push(
      Prisma.sql`CASE WHEN c."searchText" ILIKE ${`%${year}%`} THEN 1 ELSE 0 END`
    );
  }
  for (const questionNumber of exact.questionNumbers) {
    clauses.push(
      Prisma.sql`CASE WHEN c."questionNumber" = ${questionNumber} OR c."searchText" ILIKE ${`%Question ${questionNumber}%`} THEN 1 ELSE 0 END`
    );
  }
  for (const phrase of exact.educationalPhrases) {
    clauses.push(
      Prisma.sql`CASE WHEN c."searchText" ILIKE ${`%${phrase}%`} THEN 1 ELSE 0 END`
    );
  }
  for (const expression of exact.symbolicExpressions) {
    clauses.push(
      Prisma.sql`CASE WHEN c."searchText" ILIKE ${`%${expression}%`} THEN 1 ELSE 0 END`
    );
  }
  for (const unit of exact.units) {
    clauses.push(
      Prisma.sql`CASE WHEN c."searchText" ILIKE ${`%${unit}%`} THEN 1 ELSE 0 END`
    );
  }

  if (clauses.length === 0) return Prisma.sql`0::integer`;
  return Prisma.join(clauses, " + ");
}

function toRetrievedChunk(
  row: ChunkRow,
  options: {
    keywordRank: number | null;
    vectorRank: number | null;
    exactSignals: string[];
  }
): RetrievedChunk {
  const bestBranchRank = Math.min(
    options.keywordRank ?? Number.MAX_SAFE_INTEGER,
    options.vectorRank ?? Number.MAX_SAFE_INTEGER
  );

  return {
    id: row.id,
    resourceId: row.resourceId,
    resourceTitle: row.resourceTitle,
    sourceKind: row.sourceKind,
    chunkIndex: row.chunkIndex,
    chunkType: row.chunkType,
    title: row.title,
    content: row.content,
    snippet: buildBoundedSnippet(row.content),
    contentHash: row.contentHash,
    subjectId: row.subjectId,
    topicId: row.topicId,
    questionNumber: row.questionNumber,
    vectorRank: options.vectorRank,
    vectorDistance: row.vectorDistance,
    keywordRank: options.keywordRank,
    keywordScore: row.keywordScore,
    exactSignals: options.exactSignals,
    fusionScore: 0,
    bestBranchRank,
    alternateProvenance: [],
  };
}

interface ExactQueryParts {
  quotedPhrases: string[];
  years: string[];
  questionNumbers: string[];
  educationalPhrases: string[];
  symbolicExpressions: string[];
  units: string[];
}

function extractExactQueryParts(query: string): ExactQueryParts {
  const normalized = normalizeQuery(query);
  const quotedPhrases = Array.from(query.matchAll(/"([^"]{2,80})"/g)).map(
    (match) => match[1].trim()
  );
  const years = Array.from(query.matchAll(/\b(19[0-9]{2}|20[0-9]{2})\b/g)).map(
    (match) => match[1]
  );
  const questionNumbers = Array.from(
    query.matchAll(/\b(?:question|q)\s*#?\s*([0-9]{1,3})\b/gi)
  ).map((match) => match[1]);
  const symbolicExpressions = extractSymbolicExpressions(normalized);
  const educationalPhrases = extractEducationalExactPhrases(normalized);
  const units = extractExactUnits(normalized);

  return {
    quotedPhrases: Array.from(new Set(quotedPhrases)),
    years: Array.from(new Set(years)),
    questionNumbers: Array.from(new Set(questionNumbers)),
    educationalPhrases: Array.from(new Set(educationalPhrases)),
    symbolicExpressions: Array.from(new Set(symbolicExpressions)),
    units: Array.from(new Set(units)),
  };
}

function collectExactSignals(query: string, row: ChunkRow) {
  const exact = extractExactQueryParts(query);
  const haystack = `${row.questionNumber ?? ""}\n${row.title ?? ""}\n${row.content}`.toLowerCase();
  const signals: string[] = [];

  for (const phrase of exact.quotedPhrases) {
    if (haystack.includes(phrase.toLowerCase())) {
      signals.push(`quoted:${phrase}`);
    }
  }
  for (const year of exact.years) {
    if (haystack.includes(year)) signals.push(`year:${year}`);
  }
  for (const questionNumber of exact.questionNumbers) {
    if (row.questionNumber === questionNumber || haystack.includes(`question ${questionNumber}`)) {
      signals.push(`question:${questionNumber}`);
    }
  }
  for (const phrase of exact.educationalPhrases) {
    if (haystack.includes(phrase.toLowerCase())) {
      signals.push(`phrase:${phrase}`);
    }
  }
  for (const expression of exact.symbolicExpressions) {
    if (haystack.includes(expression.toLowerCase())) {
      signals.push(`expression:${expression}`);
    }
  }
  for (const unit of exact.units) {
    if (haystack.includes(unit.toLowerCase())) {
      signals.push(`unit:${unit}`);
    }
  }

  return signals;
}

function extractEducationalExactPhrases(query: string) {
  const normalized = query.toLowerCase();
  const phrases = [
    "area of a triangle",
    "area of a circle",
    "ohm's law",
    "ohms law",
    "potential difference",
    "linear equation",
    "fair die",
    "percentage discount",
    "sale price",
    "litmus paper",
    "blue litmus",
    "red litmus",
    "photosynthesis",
    "main idea",
    "supporting details",
    "equivalent ratios",
    "highest common factor",
    "positive direction",
    "blue counters",
  ];

  return phrases.filter((phrase) => normalized.includes(phrase));
}

function extractSymbolicExpressions(query: string) {
  const expressions = Array.from(
    query.matchAll(
      /\b(?:[a-z]\s*[+\-]\s*\d+\s*=\s*\d+|[a-z]\s*=\s*[a-z]\s*(?:x|\*)\s*[a-z]|[a-z]\s*=\s*pi\s*[a-z]\^2|1\/2|\d+\s*:\s*\d+)\b/gi
    )
  ).map((match) => match[0].replace(/\s+/g, " ").trim());

  const toRatios = Array.from(
    query.matchAll(/\b(\d+)\s+to\s+(\d+)\b/gi)
  ).map((match) => `${match[1]}:${match[2]}`);

  return [...expressions, ...toRatios];
}

function extractExactUnits(query: string) {
  const normalized = query.toLowerCase();
  const units = [
    "volts",
    "voltage",
    "amperes",
    "current",
    "resistance",
    "ohms",
    "kilograms",
    "cubic metres",
    "kilograms per cubic metre",
    "newtons",
  ];

  return units.filter((unit) => normalized.includes(unit));
}

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, 1_000);
}

function toVectorLiteral(vector: number[]) {
  return `[${vector.map((value) => Number(value).toPrecision(12)).join(",")}]`;
}
