# Study Buddy v2

Study Buddy v2 is a Next.js learning platform for exam preparation. It combines practice questions, mock exams, progress tracking, AI-assisted study support, and subscriptions in a single app. It does not provide school, teacher, or administrator accounts.

This repository is public. Report vulnerabilities privately through
[`SECURITY.md`](./SECURITY.md); do not open a public issue containing security
details, credentials, personal data, or production evidence.

## Frontend documentation

Frontend documentation was checked against the working tree on **1 November
2026**. Start with the [website guide](docs/WEBSITE_GUIDE.md) for current page
behaviour, branding and breakpoints; the [codebase map](CODEBASE_BREAKDOWN.md)
for responsibilities; the [AI experience guide](AI_FEATURES_GUIDE.md) for saved
chat/rendering; and the [UI checklist](docs/DMCTN_UI_TASTE_GATE.md) for verification.

The [frontend bug and fix history](docs/FRONTEND_BUG_AND_FIX_HISTORY.md) records
recovered UI regressions, accepted corrections, evidence and unresolved reports.
Follow the [frontend change process](docs/FRONTEND_CHANGE_PROCESS.md) for scoped
implementation, verification, documentation and staging-first handoff.
The [UI colour guide](docs/UI_COLOUR_GUIDE.md) lists colour names, hex values,
predominant locations and purposes, including theme tokens and SVG palettes.

These describe code, not deployment or accessibility certification.
Notifications still await staging migration and live checks. Temporary icon
audits/design-preview routes are not product features; the approved icon rollout
is not an open replacement programme. Public examples and screenshots must use
synthetic data and omit recovery URLs, credentials and operational evidence.

## Stack

- Next.js 16 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Supabase Auth
- OpenAI API
- Streamdown + KaTeX for AI response rendering

## Core Product Areas

- Study materials: subject/topic browsing and topic-level practice drills
- Past questions: answer submission, grading, and explanations
- Mock exams: start, save progress, submit, and grade full exam instances
- Progress: subject progress, practice accuracy, and exam history
- AI: persistent general chat, legacy AI question threads, study recommendations, and written-paper marking
- AI Chat Stage 1: persistent general chat threads with provider-neutral generation, idempotent sends, retry-safe failures, and refresh-safe history. This is not yet resource-grounded RAG.
- AI Chat presentation: Markdown, syntax-highlighted code, and inline/block LaTeX render through Streamdown and KaTeX. The current renderer uses static mode; robust Markdown handling does not imply token-streamed transport. Chat-title actions use white pencil and bin icons.
- AI Chat launch mode: the current `/chat` experience is persistent general chat. Keep grounded/resource-backed WAEC tutor mode disabled until the grounding validation gates pass.
- Resource Ingestion Stage 2: internal service and CLI plumbing for private resource extraction, chunking, approval workflows, and legacy past-question migration reports. There is no HTTP administration surface; later stages added separate retrieval and disabled grounding code.
- Grounded Chat Stage 4: feature-gated TEACH responses that retrieve approved active StudyBuddy evidence, validate segment-based structured output, persist grounding attempts/citations, and show safe source previews. Disabled by default until evaluations pass.
- Accounts and billing: auth, profile, subscriptions, and payments
- Notifications: a mobile/desktop bell with an unread count, a paginated inbox, and question-specific marking-review decisions.

### In-app marking-review notifications

`/notifications` replaces the placeholder bell. Support decisions (both upheld
and adjusted marks) create one notification per review, in the same database
transaction as the decision, audit event and any score/progress changes.
`/marking-reviews/[id]` shows only the signed-in learner's case, answer, mark and
support explanation, with a link to that exact question in the marked paper.

Learners can mark individual notifications read/unread or mark all existing
notifications read. Opening a decision marks its notification read after the
page mounts, not during prefetch. Bulk marking uses the inbox's server timestamp
so newer notifications are not silently dismissed. The bell checks the unread
count on entry, focus and every 60 seconds while the page is visible; there is
no push, email delivery, or new external notification provider.

Deployment requirements:

- Apply `20261027090000_add_review_notifications` with the normal staging migration workflow **before** deploying this code; regenerate the Prisma client (included in `npm run build`). This change does not apply the migration automatically.
- Confirm the server's database role can select/insert/update/delete `Notification`. Browser-facing `anon` and `authenticated` roles deliberately have no access; RLS is enabled.
- Notifications begin with decisions made after deployment. Existing decisions remain in Marking reviews and are not retrospectively backfilled.
- Records contain a review link and read state, not another copy of the learner's answer. They cascade-delete with their account or review.
- Check an upheld and an adjusted decision on staging with separate support/learner sessions, then verify the unread badge, exact-question link and read controls. Automated route/lifecycle tests use a mocked database; they do not prove a live migration or browser workflow.

## Product Strategy Reminders

- Human tutoring strategy: consider an Uber/Airbnb-style marketplace model for human tutors. The platform can match students with vetted tutors, handle scheduling, trust signals, ratings, and payments, while letting tutor supply scale without Study Buddy directly employing every tutor.

## Product TODOs

- AI tutor/chat safeguards: make the AI tutor more robust against malpractice and misuse. Add detection, reporting, review workflows, and temporary account suspension for repeated consecutive unresolved malpractice/misuse incidents.
- AI tutor/chat relevance: stop the AI from answering unrelated questions and keep responses focused on supported study/tutoring use cases.
- AI tutor/chat UI: refine the existing saved-chat interface and test its current auto-scroll and dedicated scroll areas with long histories; these are not missing initial features.
- AI tutor visual identity: change/update the AI tutor image.
- AI activity: verify counters across persistent chats and legacy threads before reporting an unresolved counting bug.
- Progress follow-up: validate the implemented separate metrics, daily trends, filters, mobile carousels and compact mock results against learner feedback.
- Sheets data integration: integrate data from sheets into the app through a controlled import/sync workflow, with validation and duplicate handling before records are saved.
- Dashboard follow-up: validate the implemented continuation action, daily tasks, weekly activity and focus-topic layout rather than treating the whole revamp as unstarted.
- Frontend acceptance: clean up remaining nested landmarks in account/settings views and record browser, keyboard, zoom and low-bandwidth checks using the UI checklist. Tests alone do not establish site-wide accessibility conformance.

## Immediate Implementation Queue

The next legal/content action is for Chijindu Oreh to obtain the signed
contractor rights agreement. No contractor material, textbook, or genuine past
examination question may be imported or published until its item-level rights
evidence passes the documented content gate.

The public-safe compliance and engineering work categories are in
[`NEXT_IMPLEMENTATION_TODOS.md`](./docs/compliance/NEXT_IMPLEMENTATION_TODOS.md).
Exact weaknesses, priorities, owners, dates, and remediation evidence belong in
the restricted company tracker, not this public repository.

The current beta estimate, recommended free invite-only scope, launch checks, and
exit criteria are in
[`BETA_READINESS.md`](./docs/BETA_READINESS.md).

The quote-ready scope, provider shortlist, rules of engagement, deliverables and
large-public/paid-launch penetration-test gate are in
[`INDEPENDENT_SECURITY_REVIEW.md`](./docs/INDEPENDENT_SECURITY_REVIEW.md).

## Legal And Compliance Status

The repository contains a practical compliance draft for the current product,
not a declaration that Study Buddy has completed legal review or regulatory
registration. Public wording must remain aligned with the production service.
The company identity and registered office have been confirmed from the CAC
incorporation records. The public privacy mailbox and joint privacy leads,
Nick Efe Oni and Chijindu Oreh, are confirmed. A strict no-routine-
reading rule for individual AI and WhatsApp conversations is also confirmed,
with only narrow documented exceptions and an audited break-glass workflow
still to be implemented. Optional OpenAI API-data sharing for model improvement
is confirmed as disabled. Future use of separately opted-in, de-identified
conversation data to train or evaluate Study Buddy's own AI is approved in
principle but disabled for the current beta until its consent, child-safety,
DPIA, security, withdrawal and testing gates are complete. Supabase's production
primary project region is confirmed as North EU (Stockholm), Sweden
(`eu-north-1`). A working international-transfer policy is adopted: strictly
necessary core-service transfers use section 43(1)(b) contractual necessity,
with guardian requirements for child processing and separate consent for
optional transfers, backed by provider DPAs and technical safeguards. Exact
destination mapping, provider-specific assessments, certified-DPO validation,
and any required NDPC-approved transfer instrument remain open. A separate,
formally designated qualified DPO is required; Chijindu Oreh owns the work of
identifying or engaging that person and coordinating the children-and-AI DPIA
and NDPC work. The remaining retention periods and payment rules require
qualified Nigerian legal/privacy review. For the current direct-to-user
service, Study Buddy is the data controller and meets the NDPC's DCPMI
designation through the education-sector criterion regardless of the current
sub-200 user forecast. The working
tier is MDP-OHL, subject to written confirmation by a licensed DPCO or qualified
Nigerian privacy adviser. Registration is required but has not yet been filed;
the company must also formally designate a qualified DPO.
Supabase Auth with Resend custom SMTP is the approved production provider path
for account verification and password recovery. Production custom SMTP and live
delivery have been verified; re-test the app-owned callbacks after their next
deployment. The beta uses no advertising, session replay, or behavioural/product
analytics. Only essential application, Cloudflare, Railway, Supabase, and Resend
operational/security logging is approved.

### Public pages

| Page | Current status | Why it must be updated later |
| --- | --- | --- |
| [`/privacy-policy`](app/privacy-policy/page.tsx) | Identifies the registered controller, verified privacy mailbox, current Railway/Cloudflare hosting and Supabase Stockholm primary region; covers current data flows and approved age, access, AI-improvement, retention, international-transfer and email-first privacy-rights policies | Add remaining retention periods and verified provider/Supabase processing locations after the provider assessments |
| [`/terms-of-service`](app/terms-of-service/page.tsx) | Identifies the contracting legal entity and covers minors, AI, user content, payments, consumer rights, Nigerian law, and the current absence of textbooks or genuine past-question claims | Add the final commercial terms; legal review is required before paid/school launch |
| [`/refund-policy`](app/refund-policy/page.tsx) | Future paid subscriptions automatically renew after clear disclosure; same-day cancellation automatically refunds prorated unused time; other refunds are limited to duplicate payment, paid service not provided, Study Buddy discontinuation, or Nigerian-law requirements | Implement and test renewal, cancellation, refund and confirmation-email controls and confirm processing targets before accepting payment |
| [`/parent-student-privacy`](app/parent-student-privacy/page.tsx) | Implemented as an age-appropriate summary of the live 13+ rule, guardian email decision flow, and disabled future conversation-improvement choice | Re-review the future opt-in with students, parents and a qualified Nigerian privacy adviser before activation or after any material workflow change |
| [`/ai-safety`](app/ai-safety/page.tsx) | Implemented with limitations, privacy, academic-integrity, prohibited-use, narrow staff-review authority, future AI-improvement safeguards, and reporting rules | Update after child-safety evaluation, reporting UI, staff-access tooling, escalation owners and any new AI model/use case are implemented |
| [`/cookie-policy`](app/cookie-policy/page.tsx) | Accurate for essential auth, local drafts and CAPTCHA; states that advertising/behavioural cookies are not currently used | Update and implement consent controls before adding non-essential analytics, advertising pixels, session replay or similar tracking |
| [`/accessibility`](app/accessibility/page.tsx) | Implemented without making an unsupported conformance claim | Add tested WCAG version, scope, methods, failures and remediation dates after an independent accessibility audit |
| [`/content-policy`](app/content-policy/page.tsx) | Covers permitted use, rights complaints, the current absence of displayed textbooks/genuine past questions, and the absence of a current WAEC relationship | Update only after each future resource has recorded provenance/licensing or an executed WAEC agreement changes the current position |

All pages are linked from the responsive footer. The Privacy Policy and Terms
also link directly to the detailed notices relevant to their sections.

### Compliance documents

The repository contains public-safe policy templates and working compliance
summaries under [`docs/compliance`](./docs/compliance). They cover data
protection assessment, guardian authorisation, retention/deletion, incident
response, conversation access, vendor processing, international transfers,
data-subject rights, future school processing, content rights, and processing
records.

These documents are not legal sign-off and do not contain the live registers,
executed agreements, production evidence, provider-console screenshots,
personal contact details, current findings, or detailed remediation tickets.
Those records must be held in the restricted company compliance system.

### Non-document launch work

Policies alone do not make the service ready. The public-safe work categories
and launch gates are in
[`NEXT_IMPLEMENTATION_TODOS.md`](./docs/compliance/NEXT_IMPLEMENTATION_TODOS.md).
Exact gaps, owners, target dates, test accounts, evidence, and accepted risks
belong in the private tracker so this public repository does not advertise the
current defensive posture.

## Deployment Security Baseline

- Browser-delivered Supabase configuration contains only the public project URL
  and publishable key.
- Server credentials are stored in the deployment secret manager, rotated when
  exposure is suspected, and separated between staging and production.
- The production web service uses a dedicated runtime database identity without
  schema ownership, DDL, role/database creation, replication, or superuser
  authority. Migration authority is kept out of the normal web runtime.

## Deployment Security Operations

- Cookie-authenticated mutations require trusted-origin validation, sensitive
  requests have bounded inputs and timeouts, and server-side authorization is
  required independently of UI visibility.
- The web runtime uses a dedicated least-privilege database identity. Migration
  authority, provider administration keys, scheduled jobs, and malware scanning
  are isolated from the public web service.
- Dormant ingestion libraries are not an approved upload surface. Any future
  upload route must pass a new threat review and staging verification before it
  is enabled.
- Application-level AI budgets and account-aware abuse limits remain in place
  even when edge protections or CAPTCHA are enabled.
- Dependabot, secret scanning, and an approved non-production ZAP baseline form
  part of the release checks. Authenticated or active penetration testing needs
  separately signed rules of engagement.
- Exact production values, internal service addresses, thresholds, access
  rosters, scan evidence, and open findings are deliberately not documented in
  this public repository. See the public-safe [deployment guide](./docs/DEPLOYMENT.md),
  [Railway operations standard](./docs/RAILWAY_SECURITY_OPERATIONS.md), and
  [security policy](./SECURITY.md).

## Bandwidth And Low-Data Improvements

Current implementation and rules for future work (not proof of measured data savings):

- Low Data Mode lives in Settings and should reduce mobile-data usage across study flows.
- `UserSettings` stores low-data mode and cloud draft sync preferences per user. Existing users were backfilled with default settings in migration `20260726090000_add_query_performance_indexes`.
- Practice answers are saved locally first. Cloud draft sync only runs when the user enables it and Low Data Mode is off.
- Practice and mock-exam question images should be suppressed by default in Low Data Mode and replaced with a small `Load image` button so users only download heavy media when they choose to.
- Shared image rendering should use [`components/Image.tsx`](components/Image.tsx) instead of raw `<img>` elements. It uses the custom loader in [`lib/optimized-image.ts`](lib/optimized-image.ts), lazy loading, async decoding, responsive `srcSet`s, and bounded quality settings.
- Supabase public storage image URLs are rewritten from `/storage/v1/object/public/...` to `/storage/v1/render/image/public/...` with width, quality, and resize parameters so browsers can choose smaller images for smaller screens.
- Non-transformable images, such as SVGs or unknown external hosts, fall back to their original URL but still go through the shared lazy/async image component.
- Heavy navigation links such as practice routes, mock exam routes, and progress pages should use `prefetch={false}` so Next.js does not silently download route payloads in the background.
- Topic practice should load questions in small pages instead of pulling the full topic bank at once. The user should be able to load more questions deliberately.
- Cloud draft fetching should request drafts only for loaded question IDs, not every draft in a topic.
- User-facing history lists, such as progress mock-exam history, should be paginated with bounded `pageSize` limits.
- User-facing chat, subscription, review and notification lists should use bounded pagination. This rule does not imply that a school or general administrator interface exists.
- Dashboard and progress summary APIs should use database aggregates (`count`, `groupBy`, or raw aggregate SQL) instead of fetching full attempt/mock rows into application memory.
- Dashboard weekly activity uses a lightweight CSS-rendered bar chart instead of shipping a heavier charting dependency for that widget.

Future low-data work:

- Add an offline/light cache for the current topic's loaded questions and user answers.
- Add compressed image variants or thumbnails for question images, ideally WebP/AVIF where supported.
- Replace remaining external avatar/image requests with local assets or initials-based placeholders.
- Keep using [`docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md`](docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md) as the rulebook for future changes.

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
- Guardian authorisation email is sent directly by the app through Resend. Set
  `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM` (for example,
  `Study Buddy Privacy <no-reply@updates.studybuddyng.com>`),
  `TRANSACTIONAL_EMAIL_REPLY_TO=privacy@studybuddyng.com`, and
  `GUARDIAN_AUTHORIZATION_TTL_HOURS=72` in Railway. The sender domain must be
  verified in Resend. Prefer a dedicated sending subdomain such as
  `updates.studybuddyng.com` so the existing Microsoft 365 mail domain keeps its
  own reputation and DNS configuration. These values are separate from the
  Supabase custom-SMTP settings used for account verification and password
  recovery.
- Prefer a Supabase recovery email template that uses `token_hash`; it works even when users open reset links in a different browser or device from where they requested the email:

Set **Authentication → URL Configuration** to these production values:

- Site URL: `https://studybuddyng.com`
- Redirect URL: `https://studybuddyng.com/auth/password-reset`

Keep localhost entries only for local development; never use a localhost URL as
the production Site URL. In Railway, set `APP_ORIGIN=https://studybuddyng.com`
without quotes, a trailing path, or a localhost port.

Set the **Confirm signup** template's button/link target to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm email
</a>
```

Set the **Reset password** template's button/link target to:

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
- `/exams/category/[category]`
- `/exams/[instanceId]`
- `/progress`
- `/chat`
- `/profile` and `/settings` (profile details, study preferences, account management)
- `/marking-reviews` and `/marking-reviews/[id]`
- `/notifications` (implemented; staging verification pending)
- auth pages under `/login`, `/sign-up`, `/forgot-password`, `/reset-password/update`

The [website guide](docs/WEBSITE_GUIDE.md) also covers public policies,
age/guardian, account-security and deletion-state screens.

## API Surface

All app APIs live under [`app/api/v1`](app/api/v1).

Main domains:

- auth and account
- profile
- AI
- past questions
- mock exams
- progress
- subscriptions
- payments
- admin content

See [`app/api/v1/README.md`](app/api/v1/README.md) for the route-level reference.

## Database

The schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma).

Key models:

- `User`, `UserProfile`
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
- OpenAI-specific code lives in [`lib/ai/chat/openai-provider.ts`](lib/ai/chat/openai-provider.ts); tests use `FakeChatModelProvider`.

Stage 1 general chat is not resource-grounded. Later stages added internal resource and grounding code, but that code is not enabled for ordinary chat.

Migration and rollback notes: [`docs/AI_CHAT_STAGE_1_MIGRATION.md`](docs/AI_CHAT_STAGE_1_MIGRATION.md).

## Resource Ingestion Stage 2

Implemented internal resource-ingestion infrastructure (not exposed over HTTP):

- New Stage 2 models: `Resource` and `ResourceChunk`.
- The service layer stores files in a private Supabase Storage bucket configured by `SUPABASE_RESOURCE_BUCKET` (default: `resources-private`). No public resource URLs are stored.
- Ingestion creates `Resource.processingStatus = UPLOADED`; extraction/chunking is available to separately controlled CLI/internal tooling only.
- Chunks are versioned. `Resource.activeChunkVersion` points at the only active chunk set; replacement chunks become active only after successful processing, and failed reprocessing preserves the previous active chunks.
- Changed extracted content resets approval to `PENDING_REVIEW`; unchanged reprocessing does not create duplicate chunk versions.
- Supported extraction adapters exist for plain text, Markdown, PDF, and DOCX. PDF/DOCX extraction is deliberately best-effort and marked low/failed quality when structure cannot be trusted. OCR is not included in Stage 2.
- Chunking preserves educational structures where possible, including past-question blocks, answer/solution material, headings, syllabus/objective sections, formulas, and mark schemes. Generic token chunking is only a fallback for long ordinary sections.
- Approval is separate from processing. Only `PROCESSED` resources with a usable active chunk set can be approved, and low-quality extraction still requires human review through future separately authorised tooling.
- Legacy `PastQuestion` records can be migrated into `Resource`/`ResourceChunk` using a conservative report-first workflow. Existing past questions are not automatically approved unless explicit provenance, completeness, subject mapping, usable content, duplication, and usage-rights checks all pass. The current legacy model lacks provenance and usage-rights fields, so migrated records normally remain `PENDING_REVIEW`.

Migration/report command:

```bash
npm run resources:migrate-past-questions -- --dry-run --report=docs/reports/past-question-migration-report.json
npm run resources:migrate-past-questions -- --apply --report=docs/reports/past-question-migration-report.json
```

That was the Stage 2 delivery boundary; later stages added retrieval and feature-gated grounding code. The ingestion service is still internal-only.

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
- OpenAI-specific embedding code lives in [`lib/ai/embeddings/openai-provider.ts`](lib/ai/embeddings/openai-provider.ts); tests use `FakeEmbeddingProvider`.

Stage 3 itself was retrieval-only. Later Stage 4 code can connect retrieval to `/chat` behind a disabled feature flag; normal chat does not use it.

Commands:

```bash
npm run resources:rebuild-search-text -- --dry-run
npm run resources:embed-chunks -- --dry-run
npm run resources:search -- --mode=keyword --query="WAEC Mathematics question 5"
npm run resources:evaluate-retrieval -- --mode=hybrid --with-vector --split=development
```

Details, activation rules, evaluation notes, and rollback: [`docs/RESOURCE_RETRIEVAL_STAGE_3.md`](docs/RESOURCE_RETRIEVAL_STAGE_3.md).

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

Current status: **DO_NOT_ENABLE**. Earlier synthetic holdouts, including v8, are consumed and cannot be reused as fresh acceptance evidence. Stage 4.1's capability pipeline is under separate evaluation; it is not wired into ordinary `/chat` requests. The database-backed evaluation campaign remains incomplete. Passing disclosed tests or a schema inspection does not authorize enablement.

Keep `AI_GROUNDED_CHAT_ENABLED=false` and `AI_GROUNDING_PIPELINE=legacy` in deployed environments. Do not describe general-chat answers as citation-backed or based on approved Study Buddy resources. Grounded launch requires a separately approved evaluation, human answer review, security review, and deployment decision. See [`docs/GROUNDED_CHAT_STAGE_4.md`](docs/GROUNDED_CHAT_STAGE_4.md) for the architecture and current gate; do not run consumed holdout splits again.

## Database And Query Optimizations

Applied DB optimization migration: [`20260726090000_add_query_performance_indexes`](prisma/migrations/20260726090000_add_query_performance_indexes/migration.sql). It was deployed to the configured Supabase database on July 27, 2026.

Implemented DB/query optimizations:

- Added query-focused indexes for dashboard/progress aggregates, practice materials, AI tutor threads/messages, mock exam resume/history, recommendations, subscriptions, admin user listing, subject/topic lookup, and payment verification.
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

- Removed explicit `any` lint debt from API routes and WhatsApp parsing. Shared helpers live in [`lib/type-utils.ts`](lib/type-utils.ts).
- API request bodies now parse through `unknown` plus small type guards before field access.
- Caught errors now use a shared `getErrorMessage` helper instead of `err: any`.
- Supabase admin upload cookie callbacks now use typed cookie options from `@supabase/ssr`.
- Internal client navigation warnings were fixed by using `useRouter().push()` instead of `window.location.href` for app routes.
- App request interception uses the Next.js 16 [`proxy.ts`](proxy.ts) convention.
- `npm run lint`, `npx tsc --noEmit --pretty false`, `git diff --check`, and `npm run build` were verified after the cleanup.

## Frontend Accessibility, Metadata, And Form Feedback

- The shared layout keeps the navbar and footer outside its page-content `<main>`. New pages must not nest another main landmark; some existing account/settings views still need cleanup. This is a requirement, not a claim of complete compliance.
- Every page route has metadata through its page or route-specific layout using [lib/site-metadata.ts](lib/site-metadata.ts). A coverage test checks adoption of the shared policy, not the quality of every description.
- The shared metadata policy keeps the `| Study Buddy` title suffix consistent and generates matching Open Graph and X/Twitter titles and descriptions.
- Public pages are indexable. Protected learning routes, authentication states, account pages and the 404 page use non-indexing metadata. Temporary audit/preview routes have been removed.
- [app/robots.ts](app/robots.ts) contains crawler directives, while [app/sitemap.ts](app/sitemap.ts) lists public pages. Neither is an access-control mechanism.
- `APP_ORIGIN` supplies the production metadata base, canonical URLs, sitemap URLs, and robots host. Canonical and sitemap URLs are deliberately omitted when that trusted origin is not configured.
- Login and sign-up failures render inside accessible `role="alert"` regions instead of disruptive browser `alert()` dialogs. CAPTCHA, rate-limit, API, and connection failures use the same inline treatment.
- [`components/FormErrorMessage.tsx`](components/FormErrorMessage.tsx) provides the shared visual and assistive-technology treatment, and [`lib/client-response-error.ts`](lib/client-response-error.ts) safely prefers human-readable API messages over machine error codes.

## Local Setup

Use local or disposable development services. Do not point seed commands,
experiments, or ordinary local development at the production database.

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

- Treat `package-lock.json` as the deployable dependency record. Review
  Dependabot and `npm audit` results, then run the full test, lint, and production
  build checks before dependency deployments. Do not deploy with an unresolved
  critical/high advisory affecting the production runtime.

## Environment

Use [`.env.example`](./.env.example) as the configuration schema. Its values are
placeholders or development examples, not production recommendations. Store real
values in the deployment secret manager and keep production limits, internal
addresses, alert routing, and access lists in the restricted operations record.

The app expects environment variables for:

- Supabase URL and anon key
- database connection strings
- OpenAI API key
- Stage 1 AI chat config:
  - `AI_CHAT_PROVIDER=openai`
  - `AI_CHAT_MODEL=gpt-4o-mini`
- Production ungrounded chatbot config:
  - `AI_GROUNDED_CHAT_ENABLED=false`
  - `AI_GROUNDING_PIPELINE=legacy`
  - Do not market this mode as resource-grounded, citation-backed, or guaranteed WAEC-source-backed. It is the persistent general chatbot.
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
- production application origin and optional additional CSRF origins:
  - `APP_ORIGIN=https://app.example.com`
  - `CSRF_TRUSTED_ORIGINS=`
- password-reset account, shared-network, and global abuse limits;
- private malware scanning and document reconstruction settings;
- AI usage budgets and provider timeouts; and
- security-reporting and scheduled-job settings.

Only `NEXT_PUBLIC_*` values are intended for browser delivery, and they must
never contain a secret. Never paste a real environment export into an issue,
README, screenshot, or commit.

## Recommended Docs

- [`SECURITY.md`](./SECURITY.md): vulnerability reporting and public-repository safety
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md): public-safe deployment process and release gates
- [`docs/DEPLOYMENT_SECURITY_CHANGE_PROCESS.md`](./docs/DEPLOYMENT_SECURITY_CHANGE_PROCESS.md): required process for changing deployment, security, infrastructure, providers, configuration, and recovery controls
- [`docs/DEPLOYMENT_SECURITY_FIX_HISTORY.md`](./docs/DEPLOYMENT_SECURITY_FIX_HISTORY.md): public-safe record of deployment/security bugs, fixes, verification and open follow-up
- [`docs/RAILWAY_SECURITY_OPERATIONS.md`](./docs/RAILWAY_SECURITY_OPERATIONS.md): public-safe Railway operating standard
- [`docs/BETA_READINESS.md`](./docs/BETA_READINESS.md): public-safe beta gates
- [`CODEBASE_BREAKDOWN.md`](./CODEBASE_BREAKDOWN.md): broad codebase map
- [`docs/WEBSITE_GUIDE.md`](./docs/WEBSITE_GUIDE.md): path-by-path app walkthrough
- [`docs/UI_COLOUR_GUIDE.md`](./docs/UI_COLOUR_GUIDE.md): complete source-backed colour inventory, predominant uses and purposes
- [`docs/FRONTEND_CHANGE_PROCESS.md`](./docs/FRONTEND_CHANGE_PROCESS.md): process for frontend changes, regression checks, documentation and staging-first handoff
- [`docs/FRONTEND_BUG_AND_FIX_HISTORY.md`](./docs/FRONTEND_BUG_AND_FIX_HISTORY.md): frontend bugs, UX corrections, evidence and unresolved reports
- [`docs/DMCTN_UI_TASTE_GATE.md`](./docs/DMCTN_UI_TASTE_GATE.md): Study Buddy responsive, accessibility and UI-state checklist
- [`docs/QUY_TRINH_CURSOR.md`](./docs/QUY_TRINH_CURSOR.md): scoped frontend contributor workflow and prompt template
- [`docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md`](./docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md): mandatory performance, bandwidth, low-data, and resilience rules for future LLM/code changes
- [`docs/AI_CHAT_STAGE_1_MIGRATION.md`](./docs/AI_CHAT_STAGE_1_MIGRATION.md): persistent chat migration, lifecycle, retry, and rollback notes
- [`docs/AI_BUG_AND_FIX_HISTORY.md`](./docs/AI_BUG_AND_FIX_HISTORY.md): public-safe AI issue history, fixes and open validation gaps
- [`docs/AI_CHANGE_PROCESS.md`](./docs/AI_CHANGE_PROCESS.md): required process for changing AI behavior, providers, resources, evaluation or release claims
- [`docs/RESOURCE_INGESTION_STAGE_2.md`](./docs/RESOURCE_INGESTION_STAGE_2.md): resource ingestion, extraction, approval, and migration notes
- [`docs/RESOURCE_RETRIEVAL_STAGE_3.md`](./docs/RESOURCE_RETRIEVAL_STAGE_3.md): retrieval, embeddings, evaluation, activation, and rollback notes
- [`AI_FEATURES_GUIDE.md`](./AI_FEATURES_GUIDE.md): learner-facing chat, maths rendering, marking and review behaviour
- [`app/api/v1/README.md`](./app/api/v1/README.md): API contracts
