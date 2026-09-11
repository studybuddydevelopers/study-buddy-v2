# Study Buddy v2

Study Buddy v2 is a Next.js learning platform for exam preparation. It combines practice questions, mock exams, progress tracking, AI-assisted study support, subscriptions, and internal administration in a single app. It does not provide school or teacher accounts.

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
- AI: quick chat, saved AI question threads, and study recommendations
- AI Chat Stage 1: persistent general chat threads with provider-neutral generation, idempotent sends, retry-safe failures, and refresh-safe history. This is not yet resource-grounded RAG.
- AI Chat presentation: streaming-safe Markdown, GitHub-flavoured Markdown, syntax-highlighted code, and inline/block LaTeX render through Streamdown and KaTeX. Chat-title actions use familiar white pencil and bin icons on filled action buttons.
- AI Chat launch mode: use the Stage 1 persistent general chatbot as the production-ready chat experience. Keep grounded/resource-backed WAEC tutor mode disabled until the grounding validation gates pass.
- Resource Ingestion Stage 2: admin-only private resource uploads, extraction, chunking, approval workflows, and legacy past-question migration reports. This is not retrieval or RAG yet.
- Grounded Chat Stage 4: feature-gated TEACH responses that retrieve approved active StudyBuddy evidence, validate segment-based structured output, persist grounding attempts/citations, and show safe source previews. Disabled by default until evaluations pass.
- Accounts and billing: auth, profile, subscriptions, and payments
- Internal administration: content upload and user lookup

## Product Strategy Reminders

- Human tutoring strategy: consider an Uber/Airbnb-style marketplace model for human tutors. The platform can match students with vetted tutors, handle scheduling, trust signals, ratings, and payments, while letting tutor supply scale without Study Buddy directly employing every tutor.

## Product TODOs

- AI tutor/chat safeguards: make the AI tutor more robust against malpractice and misuse. Add detection, reporting, review workflows, and temporary account suspension for repeated consecutive unresolved malpractice/misuse incidents.
- AI tutor/chat relevance: stop the AI from answering unrelated questions and keep responses focused on supported study/tutoring use cases.
- AI tutor/chat UI: make the chat/tutor interface more visually appealing, auto-scroll when new messages arrive, and add a clear visible scrollbar/scroll area for long conversations.
- AI tutor visual identity: change/update the AI tutor image.
- AI Q&A threads: fix the thread counting/updating bug; AI Q&A threads seem to not actually count or update correctly.
- Profile page revamp: redesign the profile page so account details, settings links, avatar, learning preferences, and safety/account actions are clearer.
- Progress page restructuring: reorganise the progress page so study-materials coverage, mock exam history, practice accuracy, goals, and AI activity are easier to scan.
- Sheets data integration: integrate data from sheets into the app through a controlled import/sync workflow, with validation and duplicate handling before records are saved.
- Dashboard page revamp: redesign the dashboard so next actions, weak topics, streaks, recommendations, and last-session entry points are clearer and less cluttered.

## Immediate Implementation Queue

The next engineering task is the approved seven-year transaction lifecycle:
retention-expiry data, documented legal holds, bounded deletion/anonymisation,
privacy-safe evidence, tests, alerting, and a production verification run. The
ordered acceptance checklist is in
[`NEXT_IMPLEMENTATION_TODOS.md`](/Users/efeon/study-buddy-v2/docs/compliance/NEXT_IMPLEMENTATION_TODOS.md).

The current beta estimate, recommended free invite-only scope, launch checks, and
exit criteria are in
[`BETA_READINESS.md`](/Users/efeon/study-buddy-v2/docs/BETA_READINESS.md).

## Legal And Compliance Status

The repository contains a practical compliance draft for the current product,
not a declaration that Study Buddy has completed legal review or regulatory
registration. Public wording must remain aligned with the production service.
The company identity and registered office have been confirmed from the CAC
incorporation records. The public privacy mailbox and its joint co-founder
handlers, Nick Efe Oni and Chijindu Oreh, are confirmed. A strict no-routine-
reading rule for individual AI and WhatsApp conversations is also confirmed,
with only narrow documented exceptions and an audited break-glass workflow
still to be implemented. Optional OpenAI API-data sharing for model improvement
is confirmed as disabled. Future use of separately opted-in, de-identified
conversation data to train or evaluate Study Buddy's own AI is approved in
principle but disabled for the current beta until its consent, child-safety,
DPIA, security, withdrawal and testing gates are complete. Supabase's production
primary project region is confirmed as North EU (Stockholm), Sweden
(`eu-north-1`). The formal privacy lead/DPO appointment, remaining retention
periods, other provider/Supabase processing locations and contracts, transfer
safeguards, and payment rules still require
co-founder decisions and qualified Nigerian legal/privacy review.
Supabase Auth with Resend custom SMTP is the approved production provider path
for account verification and password recovery. Production custom SMTP and live
delivery have been verified; re-test the app-owned callbacks after their next
deployment. The beta uses no advertising, session replay, or behavioural/product
analytics. Only essential application, Cloudflare, Railway, Supabase, and Resend
operational/security logging is approved.

### Public pages

| Page | Current status | Why it must be updated later |
| --- | --- | --- |
| [`/privacy-policy`](/Users/efeon/study-buddy-v2/app/privacy-policy/page.tsx) | Identifies the registered controller, verified privacy mailbox, current Railway/Cloudflare hosting and Supabase Stockholm primary region; covers current data flows and approved age, access, AI-improvement and retention controls | Add the remaining retention periods and other provider/Supabase processing locations and transfer mechanisms |
| [`/terms-of-service`](/Users/efeon/study-buddy-v2/app/terms-of-service/page.tsx) | Identifies the contracting legal entity and covers minors, AI, user content, payments, consumer rights and Nigerian law | Add the final commercial terms; legal review is required before paid/school launch |
| [`/refund-policy`](/Users/efeon/study-buddy-v2/app/refund-policy/page.tsx) | Implemented with a lawful request and complaint framework; future paid subscriptions are confirmed as automatically renewing after clear disclosure and authorisation | Confirm the refund window, cancellation UI, processing targets and any plan-specific rules before accepting payment |
| [`/parent-student-privacy`](/Users/efeon/study-buddy-v2/app/parent-student-privacy/page.tsx) | Implemented as an age-appropriate summary of the live 13+ rule, guardian email decision flow, and disabled future conversation-improvement choice | Re-review the future opt-in with students, parents and a qualified Nigerian privacy adviser before activation or after any material workflow change |
| [`/ai-safety`](/Users/efeon/study-buddy-v2/app/ai-safety/page.tsx) | Implemented with limitations, privacy, academic-integrity, prohibited-use, narrow staff-review authority, future AI-improvement safeguards, and reporting rules | Update after child-safety evaluation, reporting UI, staff-access tooling, escalation owners and any new AI model/use case are implemented |
| [`/cookie-policy`](/Users/efeon/study-buddy-v2/app/cookie-policy/page.tsx) | Accurate for essential auth, local drafts and CAPTCHA; states that advertising/behavioural cookies are not currently used | Update and implement consent controls before adding non-essential analytics, advertising pixels, session replay or similar tracking |
| [`/accessibility`](/Users/efeon/study-buddy-v2/app/accessibility/page.tsx) | Implemented without making an unsupported conformance claim | Add tested WCAG version, scope, methods, failures and remediation dates after an independent accessibility audit |
| [`/content-policy`](/Users/efeon/study-buddy-v2/app/content-policy/page.tsx) | Implemented for permitted use, user submissions, errors and rights complaints | Update after every learning resource has recorded provenance/licensing and the co-founders confirm whether any WAEC relationship exists |

All pages are linked from the responsive footer. The Privacy Policy and Terms
also link directly to the detailed notices relevant to their sections.

### Internal documents

| Document | What is complete | What cannot be completed yet and why |
| --- | --- | --- |
| [`DATA_PROTECTION_IMPACT_ASSESSMENT.md`](/Users/efeon/study-buddy-v2/docs/compliance/DATA_PROTECTION_IMPACT_ASSESSMENT.md) | Scope, data map, preliminary bases, necessity review, risk matrix, mitigations and launch gates | Formal approval requires student/parent consultation, named owners, implemented controls, provider evidence and written residual-risk sign-off |
| [`PARENTAL_AUTHORIZATION_RECORD.md`](/Users/efeon/study-buddy-v2/docs/compliance/PARENTAL_AUTHORIZATION_RECORD.md) | Describes the implemented database record, guardian email decision workflow, feature scope and event history | Online guardian self-service withdrawal and retention automation remain pending; live records stay in the production database, never this repository |
| [`DATA_RETENTION_AND_DELETION_SCHEDULE.md`](/Users/efeon/study-buddy-v2/docs/compliance/DATA_RETENTION_AND_DELETION_SCHEDULE.md) | Data-category inventory, deletion steps, legal-hold rules, active-account conversation retention, approved learning-record and seven-year transaction retention, chat hard deletion, 36-month deactivated-account expiry with four notices, and email-confirmed account deletion | Other periods need legal/finance approval; transaction-expiry/legal-hold tooling, cloud-draft expiry, and provider backup configuration still need completion |
| [`PERSONAL_DATA_BREACH_RESPONSE_PLAN.md`](/Users/efeon/study-buddy-v2/docs/compliance/PERSONAL_DATA_BREACH_RESPONSE_PLAN.md) | Incident stages, statutory decision clock, risk assessment, notice content, child safeguards and closure process | Names, secure channels, provider contacts, breach register location and exercise evidence require organisational setup outside the codebase |
| [`CONVERSATION_ACCESS_POLICY.md`](/Users/efeon/study-buddy-v2/docs/compliance/CONVERSATION_ACCESS_POLICY.md) | Approved no-routine-reading rule, narrow permitted cases, two-founder beta authority, minimum access controls and emergency review rule | The restricted, time-limited, audited break-glass workflow remains to be implemented and tested |
| [`CONVERSATION_AI_IMPROVEMENT_POLICY.md`](/Users/efeon/study-buddy-v2/docs/compliance/CONVERSATION_AI_IMPROVEMENT_POLICY.md) | Records the in-principle decision, current disabled state, off-by-default participation rule, data controls, withdrawal requirements and activation gate | Consent UI/records, de-identification, isolated datasets, lineage/deletion, retention, testing, revised DPIA and legal review remain to be implemented before activation |
| [`PROCESSOR_AND_VENDOR_REGISTER.md`](/Users/efeon/study-buddy-v2/docs/compliance/PROCESSOR_AND_VENDOR_REGISTER.md) | Initial register for Supabase, OpenAI, Meta, Paystack, Railway, Cloudflare, CAPTCHA, email and source-control providers | Contracts/DPAs cannot be created by code; production regions, sub-processors, retention and transfer safeguards must be verified in provider accounts |
| [`SCHOOL_DATA_PROCESSING_SCHEDULE.md`](/Users/efeon/study-buddy-v2/docs/compliance/SCHOOL_DATA_PROCESSING_SCHEDULE.md) | Contract template covering roles, instructions, visibility, security, rights, deletion, incidents and audit | It cannot be signed until both legal entities, controller/processor roles, exact staff visibility, service terms, contacts and retention periods are agreed |
| [`RECORD_OF_PROCESSING_ACTIVITIES.md`](/Users/efeon/study-buddy-v2/docs/compliance/RECORD_OF_PROCESSING_ACTIVITIES.md) | Initial inventory of current controller and possible school-processor activities | Replace preliminary bases/roles with approved decisions and reconcile it against production provider dashboards and configuration before launch |
| [`OPEN_COMPLIANCE_QUESTIONS.md`](/Users/efeon/study-buddy-v2/docs/compliance/OPEN_COMPLIANCE_QUESTIONS.md) | Tracks confirmed answers through question 22 and every remaining decision through question 44 | Work through the open questions in order and reconcile each answer with the product, notices, compliance records, and operating procedures |

### Required non-document work

These items cannot be solved by publishing policies and remain launch work:

- [x] Insert the registered company name, RC number and registered office.
- [x] Publish the verified privacy-request mailbox (`privacy@studybuddyng.com`).
- [x] Assign privacy requests jointly to co-founders Nick Efe Oni and Chijindu Oreh.
- [ ] Formally appoint a privacy lead or DPO; this is separate from sharing request-handling work.
- [x] Set the product minimum to 13 and independent-account age to 18; ages 13–17 require a parent or legal guardian, not a school substitute.
- [x] Build date-of-birth gating, restricted minor accounts, expiring one-time guardian email decisions, separately scoped AI permission, and append-only application events.
- [ ] Add guardian self-service withdrawal; until then, verified withdrawal requests use `privacy@studybuddyng.com` and require an authorised operator to restrict the account and record the event.
- [x] Build reversible deactivation and two-stage permanent deletion with password/typed confirmation, a 24-hour one-time email link, immediate restriction after final confirmation, a 15-day cancellation window, and retryable application/Auth purge.
- [x] Build automatic deletion after 36 months of voluntary deactivation, including warning emails at 90, 60, 15, and 1 day before expiry.
- [x] Configure and production-test Railway's hourly account-lifecycle cron.
- [x] Verify the dedicated runtime role has CRUD access to `User` and `AccountDeletionRequest` after the lifecycle migration.
- [ ] Set the Railway runtime URL to a three-connection Prisma pool (`connection_limit=3&pool_timeout=10&connect_timeout=10`); in the web service, set `DIRECT_URL` to that same restricted URL rather than the migration-owner URL.
- [ ] Verify protected provider backups expire within the approved 90-day maximum and cannot restore deleted accounts to live use.
- [ ] Add seven-year transaction expiry, documented legal-hold controls, and deletion evidence; account deletion already preserves the minimal transaction row while removing its user link.
- [ ] Approve the remaining retention periods and automate cloud-draft expiry and other deletion evidence.
- [x] Confirm the launch position that no school/teacher accounts or school-staff
  access to individual student data are provided.
- [ ] Before any future school service, define and test school roles and
  field-level student visibility, update the DPIA/notices, and execute suitable
  agreements.
- [ ] Verify remaining production provider/Supabase processing locations, DPAs,
  sub-processors and cross-border safeguards; the Supabase primary project region
  is confirmed as North EU (Stockholm), Sweden (`eu-north-1`).
- [x] Enable Resend custom SMTP in the production Supabase Auth dashboard and
  verify that account-verification and password-reset messages are delivered.
- [ ] Re-test the complete verification and password-reset flows after deploying
  the app-owned callbacks and applying the exact production URL/template settings
  below; preserve privacy-safe evidence without email addresses or live tokens.
- [x] Confirm that future paid subscriptions renew automatically after clear
  disclosure and customer authorisation.
- [ ] Confirm cancellation and refund operations before paid launch and
  implement the approved recurring-payment controls.
- [ ] Complete child-focused AI safety tests and a human escalation/reporting workflow.
- [ ] Build the restricted, time-limited and fully audited break-glass workflow
  for exceptional conversation access; do not expose chats through general
  administration or permit routine staff reading.
- [ ] Keep conversation-based AI training/evaluation disabled during beta. Before
  enabling it, implement the separate adult/guardian-and-student opt-in,
  de-identification, isolated datasets, withdrawal/deletion lineage,
  memorisation tests, updated DPIA, legal review and release gate documented in
  `NEXT_IMPLEMENTATION_TODOS.md`.
- [ ] Run an independent WCAG 2.2 AA audit and remediate core-flow barriers.
- [ ] Complete learning-content provenance/licensing records and confirm WAEC relationship status.
- [ ] Appoint incident owners, create secure request/breach registers and run a breach exercise.
- [ ] Have a qualified Nigerian privacy/consumer lawyer or licensed DPCO review the final system and documents.

## Deployment Security TODOs

- [x] Correct `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the production environment so it contains the Supabase publishable key rather than the project URL.
- [x] Rotate the exposed Supabase database credentials and OpenAI API key, then update every deployment/CI environment where they are configured before deploying.
- [x] Replace production `DATABASE_URL`'s `postgres` role with a dedicated runtime role that has data access but no `SUPERUSER`, `CREATEDB`, `CREATEROLE`, replication, ownership, or DDL privileges. Keep the migration-owner `DIRECT_URL` out of the normal web runtime where the deployment setup permits it.

## Deployment Security Operations

- Cookie-authenticated API mutations require an exact trusted `Origin` match.
  Set `APP_ORIGIN` to the production site's canonical HTTPS origin.
- Admin PDF/image/resource uploads are checked using file magic bytes and then
  malware-scanned before storage. PDFs are reconstructed with Ghostscript and
  the sanitized output is scanned again. Production uploads fail closed when
  ClamAV or required PDF reconstruction is unavailable.
- `AdminUser` is the only source of admin authority; the duplicate `User.isAdmin`
  field has been removed. There is no public promotion endpoint.
- A distributed UTC-daily AI token circuit breaker reserves an upper bound
  before every provider call. Configure `AI_GLOBAL_DAILY_TOKEN_BUDGET` for the
  maximum total across all users and Railway replicas.
- Dependabot checks npm and GitHub Actions dependencies, TruffleHog scans pushed
  changes and pull requests for secrets, and the weekly ZAP baseline workflow
  scans the URL in the `STAGING_URL` GitHub repository variable.
- Railway deployment topology, ClamAV setup, structured security-log filters,
  alert thresholds, AI-cost monitoring, and edge-WAF guidance are documented in
  [`docs/RAILWAY_SECURITY_OPERATIONS.md`](/Users/efeon/study-buddy-v2/docs/RAILWAY_SECURITY_OPERATIONS.md).

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
- `/exams/[instanceId]`
- `/progress`
- `/chat`
- auth pages under `/login`, `/sign-up`, `/forgot-password`, `/reset-password/update`

## API Surface

All app APIs live under [`app/api/v1`](/Users/efeon/study-buddy-v2/app/api/v1).

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

Current Stage 4 validation status: `DO_NOT_ENABLE`. The immutable v1.1 development baseline had 20 cases, structured-output success `0.75`, answerability accuracy `0.40`, correct refusal rate `1.00`, unsupported no-evidence answers `0`, and invalid citation rate `0`. The consumed v1.2 holdout failed with fixture hash `61c3388984531ecddbe10d30a4c6926250b971f1061736f2fe31882c9d6d22fc` and remains permanently `DO_NOT_ENABLE`. The consumed v1.3 `holdout_v2` run with fixture hash `1e792aa96ab304f0495120d4b7ead4ff71d059592f2322e52c4e8216037de768` passed automated gates, but manual answer review was not possible because the old report did not retain answer text. The v1.3 `manual_quality` run with fixture hash `ef220918c1688d741378774176255d3f8ffe7093b8c809c0d65cc56f255a296d` and report hash `d915160f1adea981122ffc1323f1b7ab4cbefe936c78ba5835eeff0a69bf5811` failed manual review because of unsupported elaboration and false short-definition refusals. The v1.5 manual-quality run passed manual review (`20 PASS`, `1 PASS_WITH_MINOR_OMISSION`, `0 FAIL`). `holdout_v3` is consumed by a preserved acceptance-harness failure (`RetrievalError: Topic must belong to the selected subject`, split hash `11f51f4ac9459de796f28a76d79011f983fe929edcca17e006fbb045646ebcb1`) and must never be reused as an unbiased acceptance split. Fresh `holdout_v4` is prepared but not executed; its split hash is `7158403b7a60d6e6037a4ead7eae751d80e57b446d9b72ea27ef21df9f9cf5cf`, with 28 cases, 14 supported cases, 14 insufficient-context cases, 26 scoped resources, and 4 metadata-only topics.

Do not enable `AI_GROUNDED_CHAT_ENABLED=true` in production until the development and holdout grounding evaluations pass. Details and rollback: [`docs/GROUNDED_CHAT_STAGE_4.md`](/Users/efeon/study-buddy-v2/docs/GROUNDED_CHAT_STAGE_4.md).

Grounding evaluation command:

```bash
npm run ai:evaluate-grounding -- --split=development
npm run ai:evaluate-grounding -- --split=regression
npm run ai:evaluate-grounding -- --split=manual_quality --write-report --report-format=both
# Provider-free v4 topology check; it must not call OpenAI:
npm run ai:evaluate-grounding -- --split=holdout_v4 --dry-run --confirm-holdout-fixture-hash=7158403b7a60d6e6037a4ead7eae751d80e57b446d9b72ea27ef21df9f9cf5cf
# Do not run until explicitly approved for the one allowed v4 acceptance attempt:
npm run ai:evaluate-grounding -- --split=holdout_v4 --confirm-holdout-fixture-hash=7158403b7a60d6e6037a4ead7eae751d80e57b446d9b72ea27ef21df9f9cf5cf --write-report --report-format=both
```

Review reports are written to ignored local `.grounded-evaluation-reports/`
files and should be kept until manual review is confirmed complete.

## Database And Query Optimizations

Applied DB optimization migration: [`20260726090000_add_query_performance_indexes`](/Users/efeon/study-buddy-v2/prisma/migrations/20260726090000_add_query_performance_indexes/migration.sql). It was deployed to the configured Supabase database on July 27, 2026.

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

- Removed explicit `any` lint debt from API routes and WhatsApp parsing. Shared helpers live in [`lib/type-utils.ts`](/Users/efeon/study-buddy-v2/lib/type-utils.ts).
- API request bodies now parse through `unknown` plus small type guards before field access.
- Caught errors now use a shared `getErrorMessage` helper instead of `err: any`.
- Supabase admin upload cookie callbacks now use typed cookie options from `@supabase/ssr`.
- Internal client navigation warnings were fixed by using `useRouter().push()` instead of `window.location.href` for app routes.
- App request interception uses the Next.js 16 [`proxy.ts`](/Users/efeon/study-buddy-v2/proxy.ts) convention.
- `npm run lint`, `npx tsc --noEmit --pretty false`, `git diff --check`, and `npm run build` were verified after the cleanup.

## Frontend Accessibility, Metadata, And Form Feedback

- The shared layout keeps the navbar and footer outside one page-content `<main>` landmark. Page and reusable policy components do not introduce nested main landmarks.
- Every page route owns a specific browser title and description through [`lib/site-metadata.ts`](/Users/efeon/study-buddy-v2/lib/site-metadata.ts). A coverage test fails when a new page omits the shared metadata policy.
- The shared metadata policy keeps the `| Study Buddy` title suffix consistent and generates matching Open Graph and X/Twitter titles and descriptions.
- Public pages are indexable. Protected learning routes, authentication states, account pages, internal audits/previews, and the 404 page emit `noindex` metadata.
- [`app/robots.ts`](/Users/efeon/study-buddy-v2/app/robots.ts) blocks non-public routes, while [`app/sitemap.ts`](/Users/efeon/study-buddy-v2/app/sitemap.ts) lists only public pages.
- `APP_ORIGIN` supplies the production metadata base, canonical URLs, sitemap URLs, and robots host. Canonical and sitemap URLs are deliberately omitted when that trusted origin is not configured.
- Login and sign-up failures render inside accessible `role="alert"` regions instead of disruptive browser `alert()` dialogs. CAPTCHA, rate-limit, API, and connection failures use the same inline treatment.
- [`components/FormErrorMessage.tsx`](/Users/efeon/study-buddy-v2/components/FormErrorMessage.tsx) provides the shared visual and assistive-technology treatment, and [`lib/client-response-error.ts`](/Users/efeon/study-buddy-v2/lib/client-response-error.ts) safely prefers human-readable API messages over machine error codes.

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

- Next.js is pinned through the stable `^16.3.4` range. Continue running
  `npm audit --audit-level=moderate` and the full test/build checks before
  dependency deployments.

## Environment

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
- private ClamAV upload scanning:
  - `MALWARE_SCAN_REQUIRED=true`
  - `CLAMAV_HOST=clamav.railway.internal`
  - `CLAMAV_PORT=3310`
  - `CLAMAV_TIMEOUT_MS=20000`

## Recommended Docs

- [`CODEBASE_BREAKDOWN.md`](/Users/efeon/study-buddy-v2/CODEBASE_BREAKDOWN.md): broad codebase map
- [`docs/WEBSITE_GUIDE.md`](/Users/efeon/study-buddy-v2/docs/WEBSITE_GUIDE.md): path-by-path app walkthrough
- [`docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md`](/Users/efeon/study-buddy-v2/docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md): mandatory performance, bandwidth, low-data, and resilience rules for future LLM/code changes
- [`docs/RAILWAY_SECURITY_OPERATIONS.md`](/Users/efeon/study-buddy-v2/docs/RAILWAY_SECURITY_OPERATIONS.md): Railway topology, private ClamAV scanning, monitoring/alerts, and edge protection
- [`docs/AI_CHAT_STAGE_1_MIGRATION.md`](/Users/efeon/study-buddy-v2/docs/AI_CHAT_STAGE_1_MIGRATION.md): persistent chat migration, lifecycle, retry, and rollback notes
- [`docs/RESOURCE_INGESTION_STAGE_2.md`](/Users/efeon/study-buddy-v2/docs/RESOURCE_INGESTION_STAGE_2.md): admin resource ingestion, extraction, approval, and past-question migration notes
- [`docs/RESOURCE_RETRIEVAL_STAGE_3.md`](/Users/efeon/study-buddy-v2/docs/RESOURCE_RETRIEVAL_STAGE_3.md): retrieval, embeddings, evaluation, activation, and rollback notes
- [`AI_FEATURES_GUIDE.md`](/Users/efeon/study-buddy-v2/AI_FEATURES_GUIDE.md): AI-specific implementation notes
- [`app/api/v1/README.md`](/Users/efeon/study-buddy-v2/app/api/v1/README.md): API contracts
