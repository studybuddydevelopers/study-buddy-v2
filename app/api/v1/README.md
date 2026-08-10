API v1 Reference
================

Conventions
-----------
- All endpoints respond with JSON; errors use `{ "error": string }` and relevant HTTP status.
- Auth uses Supabase session cookies. `requireUser` blocks unauthenticated requests (401). `requireAdmin` additionally requires `isAdmin` and an `adminUser` row (403).
- Paths are shown relative to `/api/v1`.

Auth & Account
--------------
- POST `/signup` — Create a Supabase auth user. Body: `firstName`, `middleNames?`, `lastNames`, `email`, `phoneNumber`, `password`. Sets session cookies, returns `{ success: true }` or `{ error }`.
- POST `/login` — Sign in with `identifier` (email or phone) and `password`. Sets Supabase cookies, returns `{ success: true }` or `{ error }`.
- POST `/logout` — Clears Supabase session cookies. Body unused. Returns `{ ok: true }`.
- POST `/reset-password` — Body: `email`. Triggers Supabase reset flow redirecting to `/auth/password-reset`. Returns `{ ok: true }` or `{ error }`.
- GET `/me` (auth) — Returns user basics, profile, and latest subscription `{ id, createdAt, isAdmin, profile, subscription }`; 404 if no DB user record.

Profile
-------
- GET `/profile` (auth) — Fetch current user profile or `null`.
- PATCH `/profile` (auth) — Partial update/create of profile fields (`firstName`, `middleNames`, `lastNames`, `phoneNumber`, `gradeLevel`, `examYear`, `preferredSubjects`, `avatarUrl`). Returns `{ success: true, profile }`.

Schools (admin)
---------------
- POST `/schools/create` — Body: `name` (req), `location?`, `adminEmail?`. Creates school and returns `{ id, name, location, adminEmail, createdAt, students }`.
- GET `/schools/list` — Query: `search?`, `location?`, `page?=1`, `pageSize?=20` (max 50). Returns `{ schools: [{ id, name, location, adminEmail, studentCount }], pagination }`.
- GET `/schools/:id/students` — Query: `page?=1`, `pageSize?=20` (max 50). Returns `{ schoolId, students: [{ id, userId, joinedAt, profile }], pagination }`; 404 if school missing.
- POST `/schools/:id/students` — Body: `userId`. Adds user to school; 400 if already present (unique constraint), 404 if school/user missing.

AI
--
- POST `/ai/messages` (auth) — Body: `message` (string, req), `subjectId?`, `topicId?`. Returns `{ userMessage, aiResponse, meta }`.
- POST `/ai/chats` (auth) — Body: `title?`, `subjectId?`, `topicId?`. Validates subject/topic rules and creates a persistent general chat. Returns `{ chat }`.
- GET `/ai/chats` (auth) — Query: `page?=1`, `pageSize?=20` (max 50). Lists active chats for the current user ordered by `updatedAt DESC, id DESC`.
- GET `/ai/chats/:chatId` (auth) — Returns one active chat owned by the current user; soft-deleted chats return 404.
- PATCH `/ai/chats/:chatId` (auth) — Body: `title?`, `subjectId?`, `topicId?`. Renames or reclassifies a chat. A topic requires a subject and must belong to that subject. If the subject changes without a valid replacement topic, the existing topic is cleared.
- DELETE `/ai/chats/:chatId` (auth) — Soft-deletes the chat through `deletedAt`; it disappears from normal lists.
- GET `/ai/chats/:chatId/messages` (auth) — Query: `page?=1`, `pageSize?=50` (max 100). Lists messages ordered by `createdAt ASC, id ASC`.
- POST `/ai/chats/:chatId/messages` (auth) — Body: `message` (1–4000 chars), `clientRequestId` (req). Creates/persists one user message, one empty pending assistant message, and one generation request. Duplicate completed/pending requests return existing state. Duplicate failed requests return failed state with `retryRequired`; use retry endpoint.
- POST `/ai/chats/:chatId/requests/:requestId/retry` (auth) — Atomically retries a failed generation request without duplicating the user or assistant message.
- GET `/ai/chats/:chatId/citations/:citationId` (auth) — Stage 4 citation preview. Verifies chat ownership and citation/message/attempt relationships, then returns bounded historical excerpt metadata. Does not expose private storage bucket/path or full original files.
- POST `/ai/recommendations` (auth) — Body: `subjectId?`, `topicId?`, `context?` (string). Validates subject/topic when provided, saves recommendation, returns `{ recommendation }`.
- POST `/ai/questions/create` (auth) — Body: `questionText` (req), `subjectId?`, `topicId?`. Creates thread + first user message, generates/saves AI reply, returns `{ question, messages: [userMessage, aiMessage] }`.
- GET `/ai/questions/list` (auth) — Query: `page?=1`, `pageSize?=20` (max 50). Returns `{ threads: [{ id, questionText, createdAt, subjectId, topicId, lastMessage }], pagination }` for the requesting user.
- POST `/ai/questions/:id/reply` (auth) — Body: `message` (req). User must own thread. Saves user message, generates/saves AI reply, returns `{ userMessage, aiMessage }`.

Stage 1 chat note: `/ai/chats/*` provides persistence, ownership checks, idempotency, retry-safe lifecycle tracking, and a provider-neutral chat adapter. It is not resource-grounded and does not provide citations or StudyBuddy resource retrieval.

Stage 4 grounded chat note: grounded TEACH generation is implemented behind `AI_GROUNDED_CHAT_ENABLED=false` by default. When disabled, Stage 1 general chat behaviour is preserved. When enabled, substantive educational messages retrieve approved active StudyBuddy evidence, validate segment-based structured output and server-controlled citations, persist `AiGroundingAttempt`/`AiMessageCitation` rows, and expose only safe bounded citation previews. Unsupported generated segments fail closed with `UNSUPPORTED_GENERATED_CLAIM` after one constrained regeneration. HINT, SOLVE, MARK, public web search, and unrestricted fallback are not implemented.

Past Questions
--------------
- POST `/past-questions/attempt` (auth) — Body: `questionId` (req), `userAnswer` (string, optional), `timeTakenSeconds?`. Grades exact match, saves attempt, returns `{ attemptId, questionId, isCorrect, score, timeTakenSeconds, attemptedAt }`.
- GET `/past-questions/by-topic` (auth) — Query: `topicId` (req), `page?=1`, `pageSize?=10` (max 25). Returns `{ topic, subject, questions, pagination }`.
- GET `/past-questions/drafts` (auth) — Query: `topicId` (req), `questionId?` repeated or `questionIds?` comma-separated. Returns drafts only for the requested questions when IDs are provided.
- POST `/past-questions/explanation` (auth) — Body: `questionId`. Returns question text, answer, explanation, subject/topic IDs, year, difficulty.
- POST `/past-questions/query` (auth) — Currently behaves like `/past-questions/explanation`: body `questionId`, returns the stored question/answer/explanation payload.

Mock Exams
----------
- GET `/mock-exams/mock-exam-templates` — Lists available templates with subject info.
- POST `/mock-exams/start` (auth) — Body: `templateId`. Creates a mock exam instance for the user, randomly selects questions from the template’s subject, and returns `{ instance, questions (no answers), answers }`.
- POST `/mock-exams/submit` (auth) — Body: `instanceId`, `answers: [{ answerId, userAnswer }]`. User must own instance and not have submitted already. Saves answers, sets `submittedAt`, returns `{ instanceId, submittedAt, answers }`.
- POST `/mock-exams/grade` (auth) — Body: `instanceId`. Requires submitted, ungraded instance owned by user. Grades each answer (exact match to stored answerText), updates totals, returns `{ instanceId, totalScore, graded, answers: [{ id, isCorrect, score }] }`.

Progress
--------
- POST `/progress/subject` (auth) — Body: `subjectId`, `progressPercentage` (number). Upserts a single progress track, returns `{ success: true, progress }`.
- POST `/progress/update` (auth) — Body: `{ updates: [{ subjectId, progressPercentage }] }`. Validates all subjectIds, bulk updates/creates tracks, returns `{ success: true, updated: [{ subjectId, progressPercentage, updatedAt }] }`.
- GET `/progress/full-report` (auth) — Query: `page?=1`, `pageSize?=10` (max 25) for mock-exam history. Returns subject progress list, past-question accuracy totals/per-subject, graded mock-exam stats, paginated mock-exam rows, and AI question usage count.

Subscriptions
-------------
- GET `/subscriptions/list` (auth) — Query: `status?`, `plan?`, `userId?` (admin only), `page?=1`, `pageSize?=20` (max 50). Admins can filter by user; regular users see only their subscriptions. Returns `{ subscriptions, pagination }`.
- GET `/subscriptions/:id/status` (auth) — Admins can read any; users can read only their own. Returns subscription detail `{ id, plan, status, startDate, endDate, renewalMethod, userId }`.

Payments
--------
- POST `/payments/verify` (auth) — Body: `reference`. Calls Paystack verify, records transaction if not already stored, returns `{ provider: "paystack", verified: true, transaction, duplicate? }`.
- POST `/payments/webhook` — Paystack webhook (raw body, signature checked). Requires `metadata.userId` from Paystack payload; creates transaction unless reference already exists. Returns `{ success: true }` or `{ received: true }`.

Admin Content
-------------
- POST `/admin/subjects/create` (admin) — Body: `name` (req), `examCode?`, `description?`. Returns created subject.
- POST `/admin/topics/create` (admin) — Body: `subjectId`, `title` (req), `examOutlineRef?`, `difficulty?`. Returns created topic.
- POST `/admin/curriculum/upload` (admin) — Multipart form: `subjectId`, `file` (PDF). Uploads to Supabase storage and records `{ id, subjectId, fileUrl, uploadedAt }`.
- POST `/admin/past-questions/upload` (admin) — Multipart form with `subjectId`, `questionText`, `answerText` (req); optional `topicId`, `explanationText`, `year`, `questionNumber`, `difficulty`, `image` (png/jpeg). Uploads image if provided, creates question record, returns stored fields.
- POST `/admin/past-questions/batch` (admin) — Body: array of past-question objects (`subjectId`, `questionText`, `answerText`, optional metadata). Inserts each and returns per-index results plus counts.
- GET `/admin/users/query` (admin) — Query: `search?`, `isAdmin?=true|false`, `page?=1`, `pageSize?=20` (max 50). Returns paginated users with limited profile info.

Admin Resources (Stage 2)
-------------------------
- GET `/admin/resources` (admin) — Query: `page?=1`, `pageSize?=20` (max 50), `sourceKind?`, `processingStatus?`, `approvalStatus?`, `subjectId?`, `topicId?`. Lists resources ordered by `updatedAt DESC, id DESC`.
- POST `/admin/resources` (admin) — Multipart form: `file` (PDF, DOCX, Markdown, or plain text), optional `title`, `description`, `subjectId`, `topicId`, `provenance`, `usageRights`. Stores the file in the private resource bucket and creates a `Resource` with `processingStatus = UPLOADED` and `approvalStatus = PENDING_REVIEW`.
- GET `/admin/resources/:resourceId` (admin) — Returns resource metadata plus up to 100 active-version chunks ordered by `chunkIndex`.
- POST `/admin/resources/:resourceId/process` (admin) — Downloads the private object server-side, extracts text, creates versioned structure-aware chunks, and marks the resource `PROCESSED` or `FAILED`. Successful changed content activates a replacement chunk version; failed reprocessing preserves the previous active version.
- POST `/admin/resources/:resourceId/approval` (admin) — Body: `{ action: "APPROVE" | "REJECT", notes? }`. Approves only successfully processed resources with usable active chunks or rejects with notes.
- POST `/admin/resources/migrate-past-questions` (admin) — Body: `{ dryRun?: boolean, limit?: number }`. Builds a migration report for legacy `PastQuestion` rows; with `dryRun: false`, creates resource/chunk records. Legacy rows lacking provenance or usage-rights remain pending admin review.

Stage 2 resource APIs do not expose retrieval, embeddings, vector search, citations, source previews, grounded generation, or tutor modes.

Resource Retrieval (Stage 3)
----------------------------
- Stage 3 retrieval is CLI/internal-only. There are no student-facing or admin-facing HTTP retrieval endpoints yet.
- Retrieval infrastructure lives under `lib/resources/retrieval/*` and scripts:
  - `npm run resources:rebuild-search-text`
  - `npm run resources:embed-chunks`
  - `npm run resources:search`
  - `npm run resources:evaluate-retrieval -- --mode=keyword|vector|hybrid`
- Keyword retrieval, exact vector retrieval, RRF hybrid ranking, filter checks, and evaluation tooling exist for approved processed active chunks.
- `/chat` and `/api/v1/ai/chats/*` do not call retrieval in Stage 3 and must not claim resource grounding.

Grounded Chat (Stage 4)
-----------------------
- Stage 4 integrates retrieval into persistent `/chat` only when `AI_GROUNDED_CHAT_ENABLED=true`.
- New persistence: `AiGroundingAttempt` and `AiMessageCitation`.
- New user-facing API: `GET /ai/chats/:chatId/citations/:citationId`.
- Feature flag remains disabled. The consumed v1.2 holdout failed. The consumed v1.3 `holdout_v2` passed automated gates but lacked retained answer text for mandatory manual review. The v1.3 `manual_quality` run retained answers and failed manual review. The v1.5 `manual_quality` run passed manual review, and fresh `holdout_v3` is prepared with split hash `11f51f4ac9459de796f28a76d79011f983fe929edcca17e006fbb045646ebcb1`, but it has not been executed.

Notes
-----
- This file documents the current implemented API under `app/api/v1`.
- Route handlers rely on Supabase cookie auth plus Prisma-backed user records.
- Some frontend flows use server pages that call these endpoints internally with forwarded cookies.
- If route behavior changes, update this file together with the handler.
