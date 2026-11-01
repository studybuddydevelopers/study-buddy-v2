API v1 Reference
================

Frontend contracts checked against source on 1 November 2026. This is not a
deployment record or a guarantee that every feature is enabled. See the
[website guide](../../../docs/WEBSITE_GUIDE.md) for page behaviour and the
[security policy](../../../SECURITY.md) for safe reporting. Examples must use
synthetic data; do not publish session cookies, recovery links or live identifiers.

Conventions
-----------
- App endpoints generally respond with JSON; errors use `{ "error": string }` and relevant HTTP status, sometimes with additional display fields. Handle non-JSON network failures too.
- Authenticated routes use the current Supabase session and server-side account checks. Handle sign-in, verification and restricted-account states; a visible button is not permission to perform an action.
- Browser mutations must follow the application's same-origin and JSON request requirements. Reuse existing clients rather than bypassing validation.
- Marking-review support is restricted to authorised staff; there is no general administrator dashboard.
- Paths are shown relative to `/api/v1`.

Auth & Account
--------------
- POST `/signup` — Submit the account form: names, email, phone, password, date of birth, terms acceptance, and guardian/CAPTCHA fields when required. On success, follow the response's `X-Study-Buddy-Next` destination for verification or guardian authorisation; do not assume unrestricted access immediately after signup.
- POST `/login` — Sign in with `identifier` (email or phone) and `password`. Sets Supabase cookies, returns `{ success: true }` or `{ error }`.
- POST `/logout` — Clears Supabase session cookies. Body unused. Returns `{ ok: true }`.
- GET `/account/lifecycle` (auth, including restricted accounts) — Returns the current account status and any scheduled permanent-deletion date.
- POST `/account/lifecycle` (auth, including restricted accounts) — Body action is `DEACTIVATE`, `REQUEST_DELETION`, `REACTIVATE`, or `CANCEL_DELETION`. `REQUEST_DELETION` requires the current password and exact `confirmation: "DELETE"`, then sends a 24-hour one-time email link without restricting the account. Deactivation, reactivation, and cancellation clear the browser session.
- POST `/account/deletion/confirm` — Public token exchange used by the email-confirmation page. A valid unused token immediately locks the account, starts the 15-day cancellation window, schedules the retryable purge, clears any browser session, and sends the final pending-deletion notice.
- Scheduled account lifecycle processing is server-to-server, not a frontend action. Keep its credentials and operating procedure out of client code and public examples.
- POST `/reset-password` — Body: `email`. Requests password-reset instructions. Keep the acknowledgement neutral, show inline errors, and respect retry guidance without implying whether an account exists.
- POST `/account/security/password-reset-lock` — Exchanges the security-alert link token after explicit learner confirmation. Display incomplete-link, working, success and failure states; opening a page must not perform the action.
- POST `/account/security/password-reset-recovery` — Exchanges the recovery link token after explicit confirmation and requests the next recovery step. Never log or display the token in diagnostic UI.
- POST `/account/security/password-reset-recovery/complete` (recovery session) — Completes recovery when server-side checks pass; do not infer completion solely from a client-side success screen.
- GET `/me` (auth) — Returns user basics, profile, and latest subscription `{ id, createdAt, profile, subscription }`; 404 if no DB user record.

Profile
-------
- GET `/profile` (auth) — Fetch current user profile or `null`.
- PATCH `/profile` (auth) — Validated partial update/create of profile fields (`firstName`, `middleNames`, `lastNames`, `phoneNumber`, `gradeLevel`, `examYear`, `preferredSubjects`, `avatarUrl`). Optional fields accept `null` to clear them; preferred-subject IDs must exist. Returns `{ success: true, profile }`.

Settings and summaries
----------------------
- GET `/settings` (auth) — Returns `{ settings }` with `cloudPracticeDraftsEnabled`, `lowDataModeEnabled` and `updatedAt`.
- PATCH `/settings` (auth) — Partial update of the two boolean preferences. Returns `{ success: true, settings }`. Keep local preference state in sync through the existing provider.
- GET `/dashboard/stats` (auth) — Supplies dashboard activity, continuation and topic-insight summaries. This is not an AI-generation request.
- GET `/materials/overview` (auth) — Supplies subject/topic availability and learner activity for the materials screen. Empty results must render a useful empty state.

Notifications
-------------
- GET `/notifications` (auth) — Query: `limit?=20` (maximum 50), `cursor?`. Returns `{ notifications, unreadCount, nextCursor, asOf }`. Pass `nextCursor` back unchanged to load older items; stop when it is `null`.
- GET `/notifications?countOnly=true` (auth) — Returns `{ unreadCount }` for the bell. A failed request is an unknown count, not evidence of zero unread items.
- PATCH `/notifications` (auth) — Body `{ id, read }` marks one item read/unread. Body `{ all: true, before }` marks items read up to the list response's `asOf` timestamp; use that value for `before` so later arrivals remain unread.
- Current notifications concern marking-review decisions. Follow the returned destination to the exact learner review case. This is an in-app inbox, not browser push or an email-preference system.

Notification source and automated checks exist; this documentation update did
not verify the required migration or live staging behaviour.

AI
--
- POST `/ai/messages` (auth) — Body: `message` (string, req), `subjectId?`, `topicId?`. Returns `{ userMessage, aiResponse, meta }`.
- POST `/ai/chats` (auth) — Body: `title?`, `subjectId?`, `topicId?`. Validates subject/topic rules and creates a persistent general chat. Returns `{ chat }`.
- GET `/ai/chats` (auth) — Query: `page?=1`, `pageSize?=20` (max 50). Lists active chats for the current user ordered by `updatedAt DESC, id DESC`.
- GET `/ai/chats/:chatId` (auth) — Returns one chat owned by the current user; deleted chats return 404.
- PATCH `/ai/chats/:chatId` (auth) — Body: `title?`, `subjectId?`, `topicId?`. An empty chat may be reclassified; a topic requires its subject. After the first user message, classification changes return 409, but renaming remains allowed.
- DELETE `/ai/chats/:chatId` (auth) — Permanently deletes the owned chat and its cascading messages, generation requests, grounding attempts, and citations after the client confirmation screen.
- GET `/ai/chats/:chatId/messages` (auth) — Query: `page?=1`, `pageSize?=50` (max 100). Lists messages ordered by `createdAt ASC, id ASC`.
- POST `/ai/chats/:chatId/messages` (auth) — Body: `message` (1–4000 chars), `clientRequestId` (req). Creates/persists one user message, one empty pending assistant message, and one generation request. Duplicate completed/pending requests return existing state. Duplicate failed requests return failed state with `retryRequired`; use retry endpoint.
- POST `/ai/chats/:chatId/requests/:requestId/retry` (auth) — Atomically retries a failed generation request without duplicating the user or assistant message.
- GET `/ai/chats/:chatId/citations/:citationId` (auth) — Stage 4 citation preview. Verifies chat ownership and citation/message/attempt relationships, then returns bounded historical excerpt metadata. Does not expose private storage bucket/path or full original files.
- POST `/ai/recommendations` (auth) — Body: `subjectId?`, `topicId?`, `context?` (string). Validates subject/topic when provided, saves recommendation, returns `{ recommendation }`.
- POST `/ai/questions/create` (auth) — Body: `questionText` (req), `subjectId?`, `topicId?`. Creates thread + first user message, generates/saves AI reply, returns `{ question, messages: [userMessage, aiMessage] }`.
- GET `/ai/questions/list` (auth) — Query: `page?=1`, `pageSize?=20` (max 50). Returns `{ threads: [{ id, questionText, createdAt, subjectId, topicId, lastMessage }], pagination }` for the requesting user.
- POST `/ai/questions/:id/reply` (auth) — Body: `message` (req). User must own thread. Saves user message, generates/saves AI reply, returns `{ userMessage, aiMessage }`.

General-chat note: `/ai/chats/*` provides persistence, ownership checks, idempotency, retry-safe lifecycle tracking, and a provider-neutral chat adapter. With grounded chat disabled, answers are not based on approved Study Buddy resources and must not be described as verified or citation-backed.

Grounded-chat note: the Stage 4 TEACH path and citation preview route exist but are **not approved for enablement**. Keep `AI_GROUNDED_CHAT_ENABLED=false`. Stage 4.1's capability pipeline is evaluation-only and is not wired into ordinary chat. HINT, SOLVE, MARK, public web search, and unrestricted fallback are not implemented.

Past Questions
--------------
- POST `/past-questions/attempt` (auth) — Body: `questionId` (req), `userAnswer` (string, optional), `timeTakenSeconds?`. Grades exact match, saves attempt, returns `{ attemptId, questionId, isCorrect, score, timeTakenSeconds, attemptedAt }`.
- GET `/past-questions/by-topic` (auth) — Query: `topicId` (req), `page?=1`, `pageSize?=10` (max 25). Returns `{ topic, subject, questions, pagination }`.
- GET `/past-questions/drafts` (auth) — Query: `topicId` (req), `questionId?` repeated or `questionIds?` comma-separated. Returns drafts only for the requested questions when IDs are provided.
- POST `/past-questions/explanation` (auth) — Body: `questionId`. Returns question text, answer, explanation, subject/topic IDs, year, difficulty.
- POST `/past-questions/query` (auth) — Currently behaves like `/past-questions/explanation`: body `questionId`, returns the stored question/answer/explanation payload.

Mock Exams
----------
- GET `/mock-exams/mock-exam-templates` (auth) — Lists templates with subject, format, duration, marks and question counts. Use `canStart`, `startBlockedReason`, `aiCreditsRequired`, `aiCreditsRemaining` and `aiCreditsResetAt` to explain eligibility; the server rechecks on start.
- POST `/mock-exams/start` (auth) — Body: `templateId`. Creates an instance and returns `{ instance, questions, answers }` without revealing model answers during the attempt. A written paper reserves 5 AI credits; a new attempt at the same template costs another 5. Show insufficient-credit feedback before navigation.
- GET `/mock-exams/instance` (auth) — Query: `instanceId`. Loads the learner's paper, answer state and available result/review information.
- POST `/mock-exams/save-progress` (auth) — Body: `instanceId`, `answers: [{ answerId, userAnswer }]`. Saves unfinished work; it does not submit the paper.
- POST `/mock-exams/submit` (auth) — Body: `instanceId`, `answers: [{ answerId, userAnswer }]`. User must own instance and not have submitted already. Saves answers, sets `submittedAt`, returns `{ instanceId, submittedAt, answers }`.
- POST `/mock-exams/grade` (auth) — Body: `instanceId`. Scores a submitted objective paper against stored answers; written papers use AI marking instead.
- POST `/mock-exams/ai-mark` (auth with AI access) — Body: `instanceId`. Marks a submitted written paper and returns its result. Failed marking is retryable on the same reserved instance without charging another 5 credits. Do not create a replacement attempt to retry a marking failure.
- GET `/mock-exams/marking-reviews` (auth) — Lists up to 50 marking-review cases owned by the learner, including reference, status and decision.
- POST `/mock-exams/marking-reviews` (auth) — Body: `answerId`, `reason`. Creates one tracked review case per AI-marked written answer and snapshots the exam, question, learner answer, model answer, marking guide, AI rationale and original score.

Marking Review Support
----------------------
- GET `/support/marking-reviews` (authorised support) — Query: `status=PENDING|RESOLVED|ALL`. Returns the restricted review queue with case evidence and audit events.
- PATCH `/support/marking-reviews/:id` (authorised support) — Body: `decision` (`UPHOLD` or `ADJUST`), `note`, and integer `score` for an adjustment. Resolves a pending case once. An adjustment updates the answer, recalculates the paper total and updates the subject progress record when this is the learner's latest graded paper in that subject. The decision and learner notification are recorded atomically.

Progress
--------
- POST `/progress/subject` (auth) — Body: `subjectId`, `progressPercentage` (number). Upserts a single progress track, returns `{ success: true, progress }`.
- POST `/progress/update` (auth) — Body: `{ updates: [{ subjectId, progressPercentage }] }`. Validates all subjectIds, bulk updates/creates tracks, returns `{ success: true, updated: [{ subjectId, progressPercentage, updatedAt }] }`.
- GET `/progress/full-report` (auth) — Query: `range=7d|30d|90d` (default `30d`), `subject?`, `topic?`, plus `page?=1`, `pageSize?=10` (max 25) for mock-exam history. Returns report filters, subject/topic insights, daily trend data, practice accuracy, graded mock results and AI activity. Keep coverage, accuracy and mock performance distinct; daily points are not multi-day buckets or proof of mastery.

Subscriptions
-------------
- GET `/subscriptions/list` (auth) — Query: `status?`, `plan?`, `page?=1`, `pageSize?=20` (max 50). Users see only their own subscriptions. Returns `{ subscriptions, pagination }`.
- GET `/subscriptions/:id/status` (auth) — Users can read only their own subscription. Returns subscription detail `{ id, plan, status, startDate, endDate, renewalMethod, userId }`.

Payments
--------
- POST `/payments/verify` (auth) — Body: `reference`. Calls Paystack verify, records transaction if not already stored, returns `{ provider: "paystack", verified: true, transaction, duplicate? }`.
- POST `/payments/webhook` — Paystack webhook (raw body, signature checked). Requires `metadata.userId` from Paystack payload; creates transaction unless reference already exists. Returns `{ success: true }` or `{ received: true }`.

Internal Resources (Stage 2)
----------------------------
The former `/admin/*` content, upload, processing, approval and user-query HTTP
routes have been removed. Resource ingestion service code and controlled CLI
utilities remain for future internal workflows, but they are not reachable as
an application HTTP administration surface.

Resource Retrieval (Stage 3)
----------------------------
- Stage 3 retrieval is CLI/internal-only. There are no student-facing or operator-facing HTTP retrieval endpoints yet.
- Retrieval infrastructure lives under `lib/resources/retrieval/*` and scripts:
  - `npm run resources:rebuild-search-text`
  - `npm run resources:embed-chunks`
  - `npm run resources:search`
  - `npm run resources:evaluate-retrieval -- --mode=keyword|vector|hybrid`
- Keyword retrieval, exact vector retrieval, RRF hybrid ranking, filter checks, and evaluation tooling exist for approved processed active chunks.
- `/chat` and `/api/v1/ai/chats/*` do not call retrieval in Stage 3 and must not claim resource grounding.

Grounded Chat (Stage 4)
-----------------------
- Stage 4 code can integrate retrieval into persistent `/chat` only when `AI_GROUNDED_CHAT_ENABLED=true`; this is not an approved deployment setting.
- New persistence: `AiGroundingAttempt` and `AiMessageCitation`.
- New user-facing API: `GET /ai/chats/:chatId/citations/:citationId`.
- Feature flag remains disabled. Historical holdouts through v8 are consumed, and the latest failed. The Stage 4.1 capability path remains under separate evaluation; it is not a deployed chat mode. Do not rerun consumed holdouts or infer readiness from disclosed-suite results.

Notes
-----
- This file documents the current implemented API under `app/api/v1`.
- Route handlers rely on Supabase cookie auth plus Prisma-backed user records.
- Some frontend flows use server pages that call these endpoints internally with forwarded cookies.
- If route behavior changes, update this file together with the handler.
