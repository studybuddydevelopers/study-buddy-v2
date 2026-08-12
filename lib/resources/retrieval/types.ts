import {
  ResourceChunkType,
  ResourceSourceKind,
  type ResourceEmbeddingConfiguration,
} from "@prisma/client";

export interface RetrievalFilters {
  subjectId?: string;
  topicId?: string;
  resourceIds?: string[];
  chunkTypes?: ResourceChunkType[];
  sourceKinds?: ResourceSourceKind[];
}

export interface KeywordSearchInput {
  query: string;
  filters?: RetrievalFilters;
  limit?: number;
}

export interface VectorSearchInput {
  queryEmbedding: number[];
  filters?: RetrievalFilters;
  configurationId?: string;
  limit?: number;
}

export interface HybridSearchInput {
  query: string;
  queryEmbedding?: number[];
  filters?: RetrievalFilters;
  keywordLimit?: number;
  vectorLimit?: number;
  limit?: number;
  rrfK?: number;
}

export interface RetrievedChunk {
  id: string;
  resourceId: string;
  resourceTitle: string;
  sourceKind: ResourceSourceKind;
  chunkIndex: number;
  chunkType: ResourceChunkType;
  title: string | null;
  content: string;
  snippet: string;
  contentHash: string;
  subjectId: string | null;
  topicId: string | null;
  questionNumber: string | null;
  vectorRank: number | null;
  vectorDistance: number | null;
  keywordRank: number | null;
  keywordScore: number | null;
  exactSignals: string[];
  fusionScore: number;
  bestBranchRank: number;
  alternateProvenance: Array<{
    resourceId: string;
    chunkId: string;
    resourceTitle: string;
  }>;
}

export interface ResourceSearchRepository {
  keywordSearch(input: KeywordSearchInput): Promise<RetrievedChunk[]>;
  vectorSearch(input: VectorSearchInput): Promise<RetrievedChunk[]>;
  hybridSearch(input: HybridSearchInput): Promise<RetrievedChunk[]>;
  getActiveEmbeddingConfiguration(): Promise<ResourceEmbeddingConfiguration | null>;
}

export const DEFAULT_RETRIEVAL_LIMIT = 5;
export const DEFAULT_BRANCH_CANDIDATE_LIMIT = 30;
export const MAX_RETRIEVAL_LIMIT = 20;
export const MAX_BRANCH_CANDIDATE_LIMIT = 50;
export const DEFAULT_RRF_K = 60;
