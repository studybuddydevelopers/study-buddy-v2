# Study Buddy v2

Study Buddy v2 is a Next.js learning platform for exam preparation. It combines practice questions, mock exams, progress tracking, AI-assisted study support, subscriptions, and school/admin workflows in a single app.

## Stack

- Next.js 16 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Supabase Auth
- OpenAI API

## Core Product Areas

- Study materials: subject/topic browsing and topic-level practice drills
- Past questions: answer submission, grading, and explanations
- Mock exams: start, save progress, submit, and grade full exam instances
- Progress: subject progress, practice accuracy, and exam history
- AI: quick chat, saved AI question threads, and study recommendations
- AI Chat Stage 1: persistent general chat threads with provider-neutral generation, idempotent sends, retry-safe failures, and refresh-safe history. This is not yet resource-grounded RAG.
- Resource Ingestion Stage 2: admin-only private resource uploads, extraction, chunking, approval workflows, and legacy past-question migration reports. This is not retrieval or RAG yet.
- Grounded Chat Stage 4: feature-gated TEACH responses that retrieve approved active StudyBuddy evidence, validate segment-based structured output, persist grounding attempts/citations, and show safe source previews. Disabled by default until evaluations pass.
- Accounts and billing: auth, profile, subscriptions, and payments
- Admin and schools: content upload, user lookup, and school membership management

## Product Strategy Reminders

- Human tutoring strategy: consider an Uber/Airbnb-style marketplace model for human tutors. The platform can match students with vetted tutors, handle scheduling, trust signals, ratings, and payments, while letting tutor supply scale without Study Buddy directly employing every tutor.

## Product TODOs

- AI tutor/chat safeguards: make the AI tutor more robust against malpractice and misuse. Add detection, reporting, review workflows, and temporary account suspension for repeated consecutive unresolved malpractice/misuse incidents.
- AI tutor/chat relevance: stop the AI from answering unrelated questions and keep responses focused on supported study/tutoring use cases.
- AI tutor/chat UI: make the chat/tutor interface more visually appealing, auto-scroll when new messages arrive, and add a clear visible scrollbar/scroll area for long conversations.
- AI tutor visual identity: change/update the AI tutor image.
- AI Q&A threads: fix the thread counting/updating bug; AI Q&A threads seem to not actually count or update correctly.

## Bandwidth And Low-Data Improvements

Implemented/expected low-bandwidth behavior:

- Low Data Mode lives in Settings and should reduce mobile-data usage across study flows.
- `UserSettings` stores low-data mode and cloud draft sync preferences per user. Existing users were backfilled with default settings in migration `20260726090000_add_query_performance_indexes`.
- Practice answers are saved locally first. Cloud draft sync only runs when the user enables it and Low Data Mode is off.
- Practice and mock-exam question images should be suppressed by default in Low Data Mode and replaced with a small `Load image` button so users only download heavy media when they choose to.
- Shared image rendering should use [`components/Image.tsx`](/Users/efeon/study-buddy-v2/components/Image.tsx) instead of raw `<img>` elements. It uses the custom loader in [`lib/optimized-image.ts`](/Users/efeon/study-buddy-v2/lib/optimized-image.ts), lazy loading, async decoding, responsive `srcSet`s, and bounded quality settings.
- Supabase public storage image URLs are rewritten from `/storage/v1/object/public/...` to `/storage/v1/render/image/public/...` with width, quality, and resize parameters so browsers can choose smaller images for smaller screens.
- Non-transformable images, such as SVGs or unknown external hosts, fall back to their original URL but still go through the shared lazy/async image component.
- Heavy navigation links such as practice routes, mock exam routes, and progress pages should use `prefetch={false}` so Next.js does not silently download route payloads in the background.
- Topic practice should load questions in small pages instead of pulling the full topic bank at once. The user should be able to load more questions deliberately.
- Cloud draft fetching should request drafts only for loaded question IDs, not every draft in a topic.
- User-facing history lists, such as progress mock-exam history, should be paginated with bounded `pageSize` limits.
- Admin and account list endpoints should enforce bounded pagination so a large school, user, AI thread, or subscription table cannot produce huge JSON responses.
- Dashboard and progress summary APIs should use database aggregates (`count`, `groupBy`, or raw aggregate SQL) instead of fetching full attempt/mock rows into application memory.
- Dashboard weekly activity uses a lightweight CSS-rendered bar chart instead of shipping a heavier charting dependency for that widget.

Future low-data work:

- Add an offline/light cache for the current topic's loaded questions and user answers.
- Add compressed image variants or thumbnails for question images, ideally WebP/AVIF where supported.
- Replace remaining external avatar/image requests with local assets or initials-based placeholders.
- Keep using [`docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md`](/Users/efeon/study-buddy-v2/docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md) as the rulebook for future changes.

## Payment Notes

- Paystack payment support exists for subscriptions/billing. `/api/v1/payments/verify` verifies a payment reference after the app sends it, while `/api/v1/payments/webhook` is the server-to-server fallback Paystack calls when payment events happen. The webhook helps record payments even if the user closes the browser, loses connection, or the frontend callback fails after payment.
- The App Router webhook reads the raw request body with `await req.text()` before JSON parsing so Paystack signature verification can use the exact signed payload. The deprecated Page Router `bodyParser` config export was removed.

## Email Delivery Notes

- Use Resend as Supabase Auth's custom SMTP provider before production. Supabase's default Auth email sender is development-only and currently rate-limited to 2 emails per hour.
- Resend SMTP settings for Supabase:
  - host: `smtp.resend.com`
  - port: `587` for STARTTLS, or `465` for implicit TLS
  - username: `resend`
  - password: the Resend API key
  - sender email: use a verified auth-only sending address, for example `no-reply@auth.yourdomain.com`
  - sender name: `Study Buddy`
- Do not commit the Resend API key. Configure it only in the Supabase Dashboard under Authentication SMTP settings, or through the Supabase Management API using a secure local shell environment.
- Verify the sending domain in Resend and configure SPF, DKIM, and DMARC before relying on password reset or verification emails in production.
- Prefer a Supabase recovery email template that uses `token_hash`; it works even when users open reset links in a different browser or device from where they requested the email:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">
  Reset password
</a>
```

## Repo Shape

```text
study-buddy-v2/
├── app/                 # Pages and API routes
├── components/          # Shared UI components
├── lib/                 # Auth, Prisma, Supabase, and feature helpers
├── prisma/              # Schema, migrations, and seed data
├── docs/                # Supporting documentation
└── public/              # Static assets
```

## Main App Routes

- `/` landing page
- `/dashboard`
- `/materials`
- `/materials/practice/[topicId]`
- `/exams`
- `/exams/[instanceId]`
- `/progress`
- `/chat`
- auth pages under `/login`, `/sign-up`, `/forgot-password`, `/reset-password/update`

## API Surface

All app APIs live under [`app/api/v1`](/Users/efeon/study-buddy-v2/app/api/v1).

Main domains:

- auth and account
- profile
- schools
- AI
- past questions
- mock exams
- progress
- subscriptions
- payments
- admin content

See [`app/api/v1/README.md`](/Users/efeon/study-buddy-v2/app/api/v1/README.md) for the route-level reference.

## Database

The schema is defined in [`prisma/schema.prisma`](/Users/efeon/study-buddy-v2/prisma/schema.prisma).

Key models:

- `User`, `UserProfile`, `AdminUser`
- `Subject`, `Topic`, `PastQuestion`
- `PastQuestionAttempt`
- `MockExamTemplate`, `MockExamInstance`, `MockExamAnswer`
- `AiChat`, `AiChatMessage`, `AiGenerationRequest`
- `Resource`, `ResourceChunk`
- `ResourceEmbeddingConfiguration`, `ResourceChunkEmbedding`
- `AiGroundingAttempt`, `AiMessageCitation`
- `AiQuestion`, `AiQuestionMessage`, `Recommendation`
- `ProgressTrack`
- `Subscription`, `Transaction`
- `School`, `SchoolStudent`

## AI Chat Stage 1

Implemented persistent general chat:

- New Stage 1 models: `AiChat`, `AiChatMessage`, and `AiGenerationRequest`.
- Legacy `AiQuestion`, `AiQuestionMessage`, and `/api/v1/ai/questions/*` are unchanged.
- `/chat` now loads saved chat threads and messages after refresh.
- Chat classification is stored at chat level with optional `subjectId` and `topicId`.
- Message sends use `clientRequestId` idempotency on `AiGenerationRequest`.
- Pending assistant placeholders are stored with empty `content` and `status = PENDING`.
- Failed generations store only safe failure codes and can be retried without duplicating the user message.
- New chat routes are thin and delegate lifecycle, transactions, retries, and provider calls to `ChatService`.
- OpenAI-specific code lives in [`lib/ai/chat/openai-provider.ts`](/Users/efeon/study-buddy-v2/lib/ai/chat/openai-provider.ts); tests use `FakeChatModelProvider`.

Stage 1 is intentionally not resource-grounded. It does not add resources, chunks, embeddings, vector search, citations, PDF/DOCX extraction, RAG prompts, source previews, grounding evaluation, or tutor modes.

Migration and rollback notes: [`docs/AI_CHAT_STAGE_1_MIGRATION.md`](/Users/efeon/study-buddy-v2/docs/AI_CHAT_STAGE_1_MIGRATION.md).

## Resource Ingestion Stage 2

Implemented admin-only resource ingestion:

- New Stage 2 models: `Resource` and `ResourceChunk`.
- Admin uploads store files in a private Supabase Storage bucket configured by `SUPABASE_RESOURCE_BUCKET` (default: `resources-private`). No public resource URLs are stored.
- Uploads create `Resource.processingStatus = UPLOADED`; extraction/chunking runs through a separate admin process endpoint or CLI flow.
- Chunks are versioned. `Resource.activeChunkVersion` points at the only active chunk set; replacement chunks become active only after successful processing, and failed reprocessing preserves the previous active chunks.
- Changed extracted content resets approval to `PENDING_REVIEW`; unchanged reprocessing does not create duplicate chunk versions.
- Supported extraction adapters exist for plain text, Markdown, PDF, and DOCX. PDF/DOCX extraction is deliberately best-effort and marked low/failed quality when structure cannot be trusted. OCR is not included in Stage 2.
- Chunking preserves educational structures where possible, including past-question blocks, answer/solution material, headings, syllabus/objective sections, formulas, and mark schemes. Generic token chunking is only a fallback for long ordinary sections.
- Approval is separate from processing. Only `PROCESSED` resources with a usable active chunk set can be approved, and low-quality extraction remains admin-reviewable.
- Legacy `PastQuestion` records can be migrated into `Resource`/`ResourceChunk` using a conservative report-first workflow. Existing past questions are not automatically approved unless explicit provenance, completeness, subject mapping, usable content, duplication, and usage-rights checks all pass. The current legacy model lacks provenance and usage-rights fields, so migrated records normally remain `PENDING_REVIEW`.

Migration/report command:

```bash
npm run resources:migrate-past-questions -- --dry-run --report=docs/reports/past-question-migration-report.json
npm run resources:migrate-past-questions -- --apply --report=docs/reports/past-question-migration-report.json
```

Stage 2 intentionally does not add embeddings, pgvector, keyword search, retrieval, RAG prompts, citations, source previews, grounded generation, or tutor modes. Those remain Stage 3+ work.

## Resource Retrieval Stage 3

Implemented retrieval infrastructure:

- New Stage 3 models: `ResourceEmbeddingConfiguration` and `ResourceChunkEmbedding`.
- `ResourceChunk.searchText` stores denormalized searchable text; `ResourceChunk.searchVector` is a generated PostgreSQL `simple` full-text vector.
- The migration installs `vector` in Supabase's `extensions` schema and stores embeddings as `extensions.vector(1536)` for the first release.
- Embedding configuration lifecycle uses `BUILDING`, `READY`, `ACTIVE`, `RETIRED`, and `FAILED`; only one configuration may be `ACTIVE`.
- Exact vector search only. No HNSW/IVFFlat index is added in Stage 3.
- `pg_trgm` is not installed. Add it only after retrieval evaluation shows a measured need.
- Keyword retrieval works for approved processed active chunks even when embeddings are incomplete.
- Vector retrieval requires the active configuration, completed embedding rows, and matching current chunk content hashes.
- Hybrid retrieval uses Reciprocal Rank Fusion, deterministic tie-breaking, subject/topic filters, and exact duplicate suppression with alternate provenance retained.
- OpenAI-specific embedding code lives in [`lib/ai/embeddings/openai-provider.ts`](/Users/efeon/study-buddy-v2/lib/ai/embeddings/openai-provider.ts); tests use `FakeEmbeddingProvider`.

Stage 3 is intentionally not connected to `/chat`. It does not add grounded prompts, citations, source previews, answer generation, query rewriting, or tutor modes.

Commands:

```bash
npm run resources:rebuild-search-text -- --dry-run
npm run resources:embed-chunks -- --dry-run
npm run resources:search -- --mode=keyword --query="WAEC Mathematics question 5"
npm run resources:evaluate-retrieval -- --mode=hybrid --with-vector --split=development
```

Details, activation rules, evaluation notes, and rollback: [`docs/RESOURCE_RETRIEVAL_STAGE_3.md`](/Users/efeon/study-buddy-v2/docs/RESOURCE_RETRIEVAL_STAGE_3.md).

## Grounded Chat Stage 4

Implemented behind `AI_GROUNDED_CHAT_ENABLED=false` by default:

- Persistent `/chat` can run a grounded TEACH pipeline after the Stage 1 user-message and pending-assistant transaction commits.
- Message classification is deterministic: substantive educational questions require retrieval, conversational messages get fixed non-factual copy, and unsupported modes such as HINT, SOLVE, and MARK are unavailable.
- Retrieval uses the Stage 3 repository and only approved, processed, active-version resources/chunks.
- Evidence sufficiency is versioned and considers result count, keyword/vector signals, RRF rank, exact signals, subject/topic match, score separation, selected-evidence coverage, and citation availability.
- Insufficient evidence uses deterministic refusal and skips the model call.
- The chat provider contract now supports structured generation without importing OpenAI inside routes or services.
- `AiGroundingAttempt` stores bounded diagnostics for every substantive grounded attempt, including retries, selected evidence, final answer segments, and segment validator results where available.
- `AiMessageCitation` stores validated server-controlled labels, historical chunk IDs, content hashes, ranks, and scores.
- Citation previews are bounded, authenticated, ownership-checked, storage-redacted, and indicate when a cited chunk is no longer from the active resource version.

Stage 4 still does not add HINT, SOLVE, MARK, public web search, external browsing, unrestricted fallback, or official WAEC marking claims.

Current Stage 4 validation status: `DO_NOT_ENABLE`. The immutable v1.1 development baseline had 20 cases, structured-output success `0.75`, answerability accuracy `0.40`, correct refusal rate `1.00`, unsupported no-evidence answers `0`, and invalid citation rate `0`. The consumed v1.2 holdout failed with fixture hash `61c3388984531ecddbe10d30a4c6926250b971f1061736f2fe31882c9d6d22fc` and remains permanently `DO_NOT_ENABLE`. The consumed v1.3 `holdout_v2` run with fixture hash `1e792aa96ab304f0495120d4b7ead4ff71d059592f2322e52c4e8216037de768` passed automated gates, but manual answer review was not possible because the old report did not retain answer text. The v1.3 `manual_quality` run with fixture hash `ef220918c1688d741378774176255d3f8ffe7093b8c809c0d65cc56f255a296d` and report hash `d915160f1adea981122ffc1323f1b7ab4cbefe936c78ba5835eeff0a69bf5811` failed manual review because of unsupported elaboration and false short-definition refusals. The v1.5 manual-quality run passed manual review (`20 PASS`, `1 PASS_WITH_MINOR_OMISSION`, `0 FAIL`). Fresh `holdout_v3` is prepared but not executed; its split hash is `11f51f4ac9459de796f28a76d79011f983fe929edcca17e006fbb045646ebcb1` and it must be run only once with explicit hash confirmation.

Do not enable `AI_GROUNDED_CHAT_ENABLED=true` in production until the development and holdout grounding evaluations pass. Details and rollback: [`docs/GROUNDED_CHAT_STAGE_4.md`](/Users/efeon/study-buddy-v2/docs/GROUNDED_CHAT_STAGE_4.md).

Grounding evaluation command:

```bash
npm run ai:evaluate-grounding -- --split=development
npm run ai:evaluate-grounding -- --split=regression
npm run ai:evaluate-grounding -- --split=manual_quality --write-report --report-format=both
# Do not run until explicitly approved:
npm run ai:evaluate-grounding -- --split=holdout_v3 --dry-run --confirm-holdout-fixture-hash=11f51f4ac9459de796f28a76d79011f983fe929edcca17e006fbb045646ebcb1
npm run ai:evaluate-grounding -- --split=holdout_v3 --confirm-holdout-fixture-hash=11f51f4ac9459de796f28a76d79011f983fe929edcca17e006fbb045646ebcb1 --write-report --report-format=both
```

Review reports are written to ignored local `.grounded-evaluation-reports/`
files and should be kept until manual review is confirmed complete.

## Database And Query Optimizations

Applied DB optimization migration: [`20260726090000_add_query_performance_indexes`](/Users/efeon/study-buddy-v2/prisma/migrations/20260726090000_add_query_performance_indexes/migration.sql). It was deployed to the configured Supabase database on July 27, 2026.

Implemented DB/query optimizations:

- Added query-focused indexes for dashboard/progress aggregates, practice materials, AI tutor threads/messages, mock exam resume/history, recommendations, subscriptions, school student lists, admin user listing, subject/topic lookup, and payment verification.
- Added `Transaction.reference` as a unique DB constraint so Paystack duplicate-prevention is enforced by the database, not only by application code.
- Added `ProgressTrack(userId, subjectId)` as a unique DB constraint so each user has one progress row per subject.
- Updated progress update APIs to use direct composite upserts against `ProgressTrack(userId, subjectId)`.
- Backfilled missing `UserSettings` rows for existing users and updated signup to create default settings for future users.
- Refreshed PostgreSQL planner statistics with `ANALYZE` after the audit so row estimates match the current small production dataset more closely.
- Verified the deployed migration: no missing optimization indexes, no duplicate payment references, no duplicate user/subject progress rows, and no orphaned FK data.

Observed DB cleanup candidates, not automatically deleted:

- Old `Recommendation` rows exist past 30 days. Decide a retention policy before deleting or archiving recommendations.
- Two WAEC Mathematics topics currently have no questions: `Variation & Graphs` and `Vectors & Transformation`.

## Code Quality And CI Reliability Optimizations

- Removed explicit `any` lint debt from API routes and WhatsApp parsing. Shared helpers live in [`lib/type-utils.ts`](/Users/efeon/study-buddy-v2/lib/type-utils.ts).
- API request bodies now parse through `unknown` plus small type guards before field access.
- Caught errors now use a shared `getErrorMessage` helper instead of `err: any`.
- Supabase admin upload cookie callbacks now use typed cookie options from `@supabase/ssr`.
- Internal client navigation warnings were fixed by using `useRouter().push()` instead of `window.location.href` for app routes.
- `npm run lint`, `npx tsc --noEmit --pretty false`, `git diff --check`, and `npm run build` were verified after the cleanup.
- `npm run build` still reports the repo-wide Next.js warning that the `middleware` file convention is deprecated in favor of `proxy`; it does not fail the build.

## Local Setup

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Apply migrations:

```bash
npx prisma migrate deploy
```

Generate Prisma client if the schema has changed:

```bash
npx prisma generate
```

Seed the database:

```bash
npx prisma db seed
```

## Dependency Notes

- Next.js is currently using `16.3.0-canary.92` because the latest stable release available during the audit still reported a moderate `npm audit` issue through Next's nested `postcss` dependency. Re-check this periodically and move back to a stable patched Next.js release once `npm audit --audit-level=moderate` stays clean.
- Avoid blindly running `npm audit fix --force` for this issue; npm suggested a breaking downgrade to Next 9 instead of a safe patch.

## Environment

The app expects environment variables for:

- Supabase URL and anon key
- database connection strings
- OpenAI API key
- Stage 1 AI chat config:
  - `AI_CHAT_PROVIDER=openai`
  - `AI_CHAT_MODEL=gpt-4o-mini`
- Stage 3 embedding config:
  - `AI_EMBEDDING_PROVIDER=openai`
  - `AI_EMBEDDING_MODEL=text-embedding-3-small`
  - `AI_EMBEDDING_DIMENSIONS=1536`
  - `AI_EMBEDDING_VERSION=1`
- payment provider secrets
- optional cron secret for recommendation generation
- CAPTCHA frontend config when Supabase Auth CAPTCHA is enabled:
  - `NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha` or `NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile`
  - `NEXT_PUBLIC_CAPTCHA_SITE_KEY=...`

## Recommended Docs

- [`CODEBASE_BREAKDOWN.md`](/Users/efeon/study-buddy-v2/CODEBASE_BREAKDOWN.md): broad codebase map
- [`docs/WEBSITE_GUIDE.md`](/Users/efeon/study-buddy-v2/docs/WEBSITE_GUIDE.md): path-by-path app walkthrough
- [`docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md`](/Users/efeon/study-buddy-v2/docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md): mandatory performance, bandwidth, low-data, and resilience rules for future LLM/code changes
- [`docs/AI_CHAT_STAGE_1_MIGRATION.md`](/Users/efeon/study-buddy-v2/docs/AI_CHAT_STAGE_1_MIGRATION.md): persistent chat migration, lifecycle, retry, and rollback notes
- [`docs/RESOURCE_INGESTION_STAGE_2.md`](/Users/efeon/study-buddy-v2/docs/RESOURCE_INGESTION_STAGE_2.md): admin resource ingestion, extraction, approval, and past-question migration notes
- [`docs/RESOURCE_RETRIEVAL_STAGE_3.md`](/Users/efeon/study-buddy-v2/docs/RESOURCE_RETRIEVAL_STAGE_3.md): retrieval, embeddings, evaluation, activation, and rollback notes
- [`AI_FEATURES_GUIDE.md`](/Users/efeon/study-buddy-v2/AI_FEATURES_GUIDE.md): AI-specific implementation notes
- [`app/api/v1/README.md`](/Users/efeon/study-buddy-v2/app/api/v1/README.md): API contracts
