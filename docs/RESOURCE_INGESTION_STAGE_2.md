# Resource Ingestion Stage 2

Stage 2 adds admin-only resource ingestion and approval plumbing. It deliberately stops before retrieval/RAG.

## Included

- `Resource` and `ResourceChunk` Prisma models.
- Private Supabase Storage uploads through a server-side admin client.
- Processing states: `UPLOADED`, `PROCESSING`, `PROCESSED`, `FAILED`.
- Approval states: `PENDING_REVIEW`, `APPROVED`, `REJECTED`.
- Versioned active chunk sets through `Resource.activeChunkVersion`.
- Extraction adapters for plain text, Markdown, PDF, and DOCX.
- Structure-aware chunking for educational material.
- Admin approval/rejection workflow.
- Conservative legacy `PastQuestion` migration and reporting.

## Not Included

No embeddings, pgvector, keyword search, hybrid retrieval, RAG prompts, citations, source previews, grounded generation, or tutor modes are implemented in Stage 2.

## Private Storage

Set:

```env
SUPABASE_RESOURCE_BUCKET="resources-private"
```

The bucket should be private. The application stores only bucket/path metadata in `Resource`; it does not store public resource URLs.

## Processing Flow

1. Admin uploads a file to `POST /api/v1/admin/resources`.
2. The route validates metadata and stores the file privately.
3. The database record is created as `UPLOADED` and `PENDING_REVIEW`.
4. Admin calls `POST /api/v1/admin/resources/:resourceId/process`.
5. The processing service downloads the private object, extracts text, chunks it, and marks the resource `PROCESSED` or `FAILED`.
6. Admin calls `POST /api/v1/admin/resources/:resourceId/approval`.

The upload route does not perform large extraction/chunking work.

## Versioning And Reprocessing

`ResourceChunk.version` stores historical chunk sets. `Resource.activeChunkVersion` selects the active set. Processing creates replacement chunks under a new version and switches `activeChunkVersion` in the success transaction. If processing fails, the previous active chunk version remains addressable.

If extracted content changes, approval is reset to `PENDING_REVIEW`. If extracted content is unchanged, processing refreshes metadata without creating another duplicate chunk version.

Approval requires `PROCESSED`, non-failed extraction quality, and at least one chunk in the active chunk version. `LOW` quality resources, such as best-effort PDF/DOCX extraction, may be approved only through explicit admin review.

## Extraction Quality

Plain text and Markdown can be high quality when text is usable. PDF and DOCX are best-effort adapters in v1 and include warnings. Scanned PDFs are marked failed and require a future OCR workflow.

Low-quality extraction is not automatically approved.

## Legacy Past Questions

Run a report first:

```bash
npm run resources:migrate-past-questions -- --dry-run --report=docs/reports/past-question-migration-report.json
```

Apply only after reviewing the report:

```bash
npm run resources:migrate-past-questions -- --apply --report=docs/reports/past-question-migration-report.json
```

Auto-approval requires explicit checks for provenance, completeness, subject mapping, usable extracted content, duplication, and access/usage rights. Existing `PastQuestion` rows do not store provenance or usage-rights fields, so they normally migrate as `PENDING_REVIEW`.

## Rollback

Rollback drops Stage 2 tables/enums only:

- `ResourceChunk`
- `Resource`
- `ResourceChunkType`
- `ResourceExtractionQuality`
- `ResourceApprovalStatus`
- `ResourceProcessingStatus`
- `ResourceSourceKind`

Legacy `PastQuestion` rows are not renamed or deleted by Stage 2.
