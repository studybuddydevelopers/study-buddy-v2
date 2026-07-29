# Resource Ingestion Stage 2

Stage 2 adds admin-only resource ingestion and approval plumbing. It deliberately stops before retrieval/RAG.

## Included

- `Resource` and `ResourceChunk` Prisma models.
- Private Supabase Storage uploads through a server-side admin client.
- Processing states: `UPLOADED`, `PROCESSING`, `PROCESSED`, `FAILED`.
- Approval states: `PENDING_REVIEW`, `APPROVED`, `REJECTED`.
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
