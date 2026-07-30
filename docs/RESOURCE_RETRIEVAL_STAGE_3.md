# Resource Retrieval Stage 3

Stage 3 adds retrieval infrastructure only. It does not connect retrieval to
`/chat`, does not generate grounded answers, does not add citations, and does
not add tutor modes.

## Scope

Implemented:

- `ResourceEmbeddingConfiguration`
- `ResourceChunkEmbedding`
- `ResourceChunk.searchText`
- generated `ResourceChunk.searchVector`
- pgvector storage for exact vector search
- simple PostgreSQL full-text search
- provider-neutral embedding interface
- OpenAI embedding adapter
- fake embedding provider for tests
- CLI-only embedding, search-text rebuild, and evaluation tooling
- RRF hybrid ranking, deterministic tie-breaking, filter enforcement, and
  exact duplicate suppression with alternate provenance retained

Migrations:

- `20260729140000_add_resource_retrieval_stage_3`
- `20260729141000_stage_3_search_text_selected_metadata`

The second migration preserves migration history and rebuilds existing
`searchText` values using selected metadata keys only.

Not implemented in Stage 3:

- chat integration
- grounded prompts
- citations or source previews
- embeddings for chat messages
- RAG answer generation
- query rewriting
- HINT, SOLVE, or MARK modes
- approximate vector indexes
- `pg_trgm`

## Retrieval Eligibility

Keyword search can use any chunk where:

- the parent resource is `PROCESSED`
- the parent resource is `APPROVED`
- `ResourceChunk.version = Resource.activeChunkVersion`

Vector search additionally requires:

- exactly one `ResourceEmbeddingConfiguration` with status `ACTIVE`
- a `COMPLETED` `ResourceChunkEmbedding`
- matching `configurationId`
- matching current `ResourceChunk.contentHash`

Hybrid search combines keyword and vector candidates, but keyword-only
candidates remain eligible when embeddings are incomplete.

## Embedding Configuration Lifecycle

Configuration statuses:

- `BUILDING`
- `READY`
- `ACTIVE`
- `RETIRED`
- `FAILED`

Only one configuration may be `ACTIVE`, enforced by a partial unique index.
Activation recalculates coverage and does not retire the previous active
configuration unless the new one meets the requested coverage threshold and has
no failed active-chunk embeddings.

The previous active configuration remains in the database for rollback. To roll
back, activate the previous completed configuration after validating coverage.

## Dimension Limitation

The first release stores embeddings as `extensions.vector(1536)`, matching
`text-embedding-3-small`.

The metadata records provider, model, dimensions, and version, but the live
table currently only supports 1,536-dimensional vectors. Changing embedding
models or dimensions requires a controlled schema migration and re-indexing plan.
Do not switch embedding dimensions without rebuilding the affected vector data.

## Commands

Rebuild chunk search text:

```bash
npm run resources:rebuild-search-text -- --dry-run
npm run resources:rebuild-search-text -- --limit=10000 --batch-size=200
```

Embed approved active chunks:

```bash
npm run resources:embed-chunks -- --dry-run
npm run resources:embed-chunks -- --limit=100 --batch-size=32
```

Activate a configuration only after evaluation and coverage review:

```bash
npm run resources:embed-chunks -- --activate --min-coverage=1
```

Run retrieval evaluation:

```bash
npm run resources:search -- --mode=keyword --query="WAEC Mathematics question 5"
npm run resources:evaluate-retrieval -- --mode=keyword --split=development
npm run resources:evaluate-retrieval -- --mode=vector --with-vector --split=development
npm run resources:evaluate-retrieval -- --mode=hybrid --with-vector --split=holdout --cases=docs/reports/retrieval-holdout.json
```

The evaluation script defaults to hybrid mode. Add `--mode=keyword`,
`--mode=vector`, or `--mode=hybrid` to compare branches. Add `--with-vector`
only when the configured embedding provider may be used. Normal tests use the
fake provider and do not call paid APIs.

## Evaluation

The runner reports:

- chunk Recall@1, @3, @5
- resource Recall@1, @3, @5
- MRR
- forbidden-result rate
- subject/topic filter accuracy
- correct no-evidence rate
- latency p50, p95, p99
- embedding coverage

Provisional holdout target:

- forbidden-result rate: `0`
- filter accuracy: `100%`
- holdout Recall@5: `>= 0.80`

These targets are provisional until the corpus and labelled development/holdout
sets are representative.

Stage 3 runtime acceptance used a temporary synthetic StudyBuddy-owned corpus
and the fake embedding provider. The fake provider is deterministic and lexical
so offline acceptance can check vector ordering and typo-tolerant cases without
calling paid APIs. It remains blocked in production by provider configuration.

## Full-Text Search

`ResourceChunk.searchText` is denormalized and rebuildable. It includes the
resource title, description, source kind, chunk title, chunk content, chunk type,
question number, page signals, and selected non-sensitive metadata.

`ResourceChunk.searchVector` is a generated tsvector from `searchText` using the
PostgreSQL `simple` config. If resource metadata changes, run the rebuild command
so chunk-local search text reflects the new metadata.

`pg_trgm` is intentionally not installed in Stage 3. Add it only after evaluation
shows a measured need for typo-tolerant title, question-identifier, or exact-term
matching.

## Rollback

Rollback order:

1. Stop embedding/evaluation scripts.
2. Deactivate or retire the Stage 3 embedding configuration if needed.
3. Drop `ResourceChunkEmbedding`.
4. Drop `ResourceEmbeddingConfiguration`.
5. Drop the `ResourceChunk_searchVector_idx` index.
6. Drop `ResourceChunk.searchVector`.
7. Drop `ResourceChunk.searchText`.
8. Drop the Stage 3 enums.

Do not automatically drop the `vector` extension. Supabase extensions may be
shared by other future objects, and extension removal is a database-wide action.

Stage 1 chats, Stage 2 resources/chunks, and legacy past questions are retained
by this rollback path.
