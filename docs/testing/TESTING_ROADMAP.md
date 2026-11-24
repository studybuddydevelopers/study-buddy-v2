# Testing baseline and roadmap

Last reviewed: 24 November 2026

Source revision reviewed: `45fbb9d60279c0265dcaea1eb73de23fd376041b`

## Executive finding

Study Buddy has a substantial deterministic test suite, especially around AI
grounding, security helpers, chat behavior, authentication handlers and
isolated accessibility interactions. The principal risk is not a lack of unit
tests. It is the gap between those tests and the assembled service:

- the current Playwright suite does not start Next.js and mocks every request;
- route/workflow tests usually mock authentication, Prisma and providers;
- migration tests inspect schema or SQL text rather than applying every
  migration to disposable PostgreSQL;
- provider contracts and full authenticated release-candidate journeys are not
  automated end to end; and
- coverage, performance, resilience, visual, fuzz/property and recovery gates
  are not yet part of complete CI.

The programme therefore prioritises a real application harness, disposable
database verification, authorization/account-lifecycle journeys and release
evidence before adding broad numbers of more isolated tests.

## Scan basis and limitations

This review inspected application routes and pages, tests, Prisma migrations,
test configuration, CI/security workflows, scripts, AI evaluation tooling and
the public deployment, frontend, security and compliance guidance. It did not
use production credentials, query live customer data, run active attacks, or
perform an independent penetration test.

Snapshot at the reviewed revision:

- 134 test/spec source files: 30 under `app`, 10 under `components`, 77 under
  `lib`, 3 under `prisma`, 5 under `scripts`, 6 Playwright specs, plus root
  configuration/proxy tests;
- 60 API route files, of which 12 have a same-directory `route.test.*` file;
  grouped route tests cover some additional handlers, so the remaining 48 are
  not automatically classified as wholly untested;
- 51 App Router page files;
- CI runs dependency audit, lint, Next type generation, TypeScript, Vitest,
  Node script tests, the isolated Playwright suite and a production build;
- a weekly staging ZAP baseline exists, and a TruffleHog workflow scans pull
  requests and `main` pushes; and
- a live database security verifier exists, but ordinary CI does not create a
  database and run it.

Counts describe test structure, not behavioral completeness. A passing mocked
test cannot prove a deployed integration, and a same-directory test count is
only a triage signal.

## Current evidence by test type

| Test type | Current position | Main gap / required next evidence |
| --- | --- | --- |
| Formatting/static/lint/type/build | Present in full CI | Add explicit config/environment validation and retain exact runtime version across local, CI and Railway |
| Dependency/SCA and secret scanning | npm audit gate, Dependabot and TruffleHog present | Record response SLA, review transitive/runtime exposure, and verify scheduled/manual scan evidence remains current |
| Unit tests | Broad coverage, particularly `lib/ai`, resources and security helpers | Establish coverage baseline and change-based ratchet; target high-risk uncovered branches rather than chasing one global percentage |
| Component tests | Present for shared controls and selected clients | Expand to forms and stateful screens not exercised by the fixture browser or real E2E |
| Handler tests | Present for important auth, webhook, chat, notification and review paths | Build a method-by-method authorization/validation matrix for all 60 route files and cover missing negative paths |
| Workflow integration | Present for selected chat, subscription and written-paper flows | Reduce boundary mocking selectively; rename misleading `e2e` tests unless they become true E2E |
| Schema/migration source assertions | Present for selected AI/resource migrations | Apply the complete migration chain to disposable PostgreSQL, run Prisma drift checks and verify actual grants/RLS/indexes |
| Database integration | Live verifier exists outside ordinary CI | Test runtime and migration roles, cross-account denial, transactions, concurrency, idempotency and rollback compatibility |
| Fixture browser/accessibility | Six Playwright specs across Chromium, WebKit and touch | Keep this fast layer, but do not use it as assembled-app evidence |
| Real Next.js E2E | Not present | Boot the production build and exercise browser-to-route-to-database journeys with provider fakes |
| Provider contract/sandbox | Mostly mocked unit contracts; some production smoke history | Add controlled fake-server contracts and bounded staging sandbox checks for Supabase, Resend, OpenAI, Paystack and WhatsApp |
| Accessibility | axe/keyboard/reflow checks are strong for fixture states; some manual evidence exists | Test real route transitions/authenticated pages; add screen reader, 200%/400% zoom, increased text, reduced motion and physical-device checks |
| Browser/device compatibility | Chromium/WebKit fixture projects; limited touch sizes | Add Firefox and a supported-device/browser matrix against the assembled app; verify mobile keyboard, safe areas and network degradation |
| Visual regression | Not present | Add stable screenshots for critical states with reviewed baselines; do not substitute screenshots for semantic/accessibility assertions |
| Performance/scalability | Rules and manual guidance exist | Establish budgets and run browser performance, API load, spike, soak and database-pool tests only in approved isolated environments |
| Reliability/resilience | Timeouts/retries have unit coverage in places | Add fault injection for provider/database/network failure, duplicate jobs/webhooks, restart behavior and graceful recovery |
| Security SAST/DAST | Dependency, secret and anonymous ZAP baseline present | Evaluate CodeQL or equivalent SAST; add authenticated, authorised staging DAST and manual business-logic testing under rules of engagement |
| Fuzz/property/mutation | Not systematic | Add schema/body/parser/property tests to security-critical pure functions; trial mutation testing on a bounded module before wider use |
| AI/RAG evaluation | Extensive deterministic fixtures, adversarial cases, versioned/consumed holdouts and disabled grounding gates | Add fresh governed benchmarks, approved real-provider runs, human educational review, cost/latency/drift gates and Nigerian-context relevance scoring |
| Academic/content quality | Seed and content logic tests exist | Add duplicate/provenance/licence/syllabus/answer/rubric validation and qualified teacher sampling before publishing real learning material |
| Privacy/compliance | Policies and lifecycle controls exist; selected automated tests present | Prove guardian/withdrawal, DSAR/export, retention, deletion propagation, log redaction and backup behavior in controlled end-to-end checks |
| Operations/observability/DR | Health, cron scripts, monitoring guidance and manual evidence process exists | Test alert delivery, missed-job detection, rollback, backup restoration, recovery objectives and deletion non-resurrection |
| Exploratory/usability/UAT | Ad hoc evidence only | Create scenario charters, learner/support acceptance scripts and a repeatable sign-off record |
| Independent review | Procurement-ready scope exists | Commission separately before large public/paid launch; automation cannot self-certify this gate |

## Product and trust-boundary matrix

Each area needs success, rejection, ownership, retry/duplicate, timeout/failure
and recovery coverage where applicable.

| Area | Existing useful evidence | Highest-priority missing tests |
| --- | --- | --- |
| Registration, verification, login/logout | Handler tests, feedback tests, navbar state tests | Real browser/cookie/redirect journey, expired/reused links, session refresh/revocation, Turnstile-enabled staging, multi-tab state |
| Password recovery and abuse lock | Route/client/helper tests | Complete email-link browser journey, shared-network behavior, alert/lock/recovery timing, replay and revocation against staging Auth |
| Age and guardian authorization | Age/account helper tests and implemented routes | Adult/minor boundary dates, guardian approve/deny/expire/resend/withdrawal, restricted-session enforcement across every AI/WhatsApp route |
| Profile/settings/account lifecycle | Selected component and lifecycle tests | Real persistence, validation/concurrency, deactivate/delete-confirm/cancel/purge, retention notices and scheduled processing |
| Chat, history, citations and reports | Strong service/handler/fixture-browser coverage | Real Next/database journey, cross-account object denial, refresh/retry/idempotency, pagination/search, report-to-support lifecycle |
| Materials, practice and past questions | Resource and progress unit tests | Browser/API/database journeys, draft conflicts, grading correctness, duplicate attempts, source/provenance gates, empty/error states |
| Mock exams and AI marking/review | In-process lifecycle and marking tests | Real database transactions, simultaneous submissions, credit accounting, provider failure, evidence snapshots, learner/support browser journey |
| Progress/dashboard/notifications | Service and selected component/route tests | Database-backed calculation fixtures, read-state concurrency, exact-link behavior and full browser refresh/polling states |
| Payments/subscriptions | Webhook and ownership tests | Paystack test-mode checkout/verify/webhook contract, signature/replay/idempotency, amount/currency/reference integrity, renewal/cancel/refund behavior before enablement |
| WhatsApp | Signature, flow and retention tests | Provider sandbox callback/retry/dedup, consent/age restriction, deletion command and cross-channel identity behavior before enablement |
| Email | Template-generating code and route tests | Link origin/expiry/replay, sender/reply-to, delivery/bounce/suppression, account/guardian/deletion/abuse messages in staging |
| Upload/ingestion/CDR | Scanner/extraction unit tests; no approved public route | Isolated ClamAV/Ghostscript integration, signatures, decompression/output limits and cleanup before any route is exposed |
| Scheduled jobs | Cron script tests | Authenticated invocation, duplicate/late/missed run, partial failure, alerting and database outcome in staging |
| Proxy, CSP and headers | Proxy/config/header unit tests and ZAP baseline | Deployed Cloudflare/Railway header chain, redirect/cookie behavior, CSP violation review and cache separation for authenticated content |

## Prioritised implementation workstreams

The order below is intentional. Create each branch from the latest accepted
testing baseline, not the original baseline commit.

### Priority 0 — make the evidence trustworthy

#### 1. `test/ci-testing-baseline-gate`

- Make pull requests targeting `docs/testing-baseline-and-roadmap` run complete
  CI.
- Publish unit/browser/build artifacts and a machine-readable test summary.
- Add coverage collection, record the initial baseline, and ratchet changed
  high-risk code without inventing an arbitrary repository-wide target.
- Detect committed focused tests and report skipped/quarantined tests.
- Verify the pinned Node version in local guidance, CI and deployment builds.
- Document manual dispatch for sensitive/scheduled jobs.

Exit: a deliberately failing test blocks a test-branch pull request and a
passing exact revision produces auditable artifacts.

#### 2. `test/real-next-e2e-harness`

- Build and start the real Next.js production server under Playwright.
- Use disposable synthetic data and deterministic provider fakes.
- Prove middleware/proxy, cookies, redirects, server/client boundaries, static
  assets and API routing.
- Keep the existing isolated fixture suite as a separate fast command.
- Add Chromium first; expand browsers after the harness is stable.

Exit: a browser can complete one anonymous and one authenticated database-backed
journey against the built application without production credentials.

#### 3. `test/database-migrations-roles-rls`

- Provision disposable PostgreSQL with the required extensions.
- Apply the complete migration chain from an empty database.
- Detect Prisma drift and destructive/incompatible migration behavior.
- Verify migration authority is separate from the least-privilege runtime role.
- Run the existing database security verifier and explicit cross-account/RLS
  negative cases using the real roles.
- Exercise representative indexes, transactions and concurrent/idempotent
  writes.

Exit: empty-to-current migration and runtime-role checks pass automatically,
and failure leaves no shared database state.

#### 4. `test/auth-guardian-account-lifecycle-e2e`

- Cover signup, verification, login, logout, password reset/lock/recovery,
  age verification, guardian decision, restricted account, deactivation,
  deletion confirmation/cancellation and scheduled deletion.
- Include expired/reused/replayed links, refresh/navigation, multi-tab and
  failure/retry states.
- Use provider fakes in CI and bounded Supabase/Resend staging checks separately.

Exit: all launch-critical account states have real-Next browser evidence and
the approved staging smoke subset passes with disposable accounts.

#### 5. `test/api-authorization-validation-matrix`

- Generate and maintain a method-by-method matrix for every first-party route.
- Test unauthenticated, restricted, wrong-owner, support-only, invalid input,
  oversized input and unsupported-method behavior as applicable.
- Verify cookie-authenticated mutations enforce the shared origin/CSRF policy.
- Cover object-level authorization for chats, citations, reports, exams,
  reviews, notifications, subscriptions and profile data.

Exit: every route/method has an explicit authorization and input-validation
expectation; security-critical omissions block CI.

### Priority 1 — release-critical product integrations

#### 6. `test/chat-learning-exam-e2e`

Add database-backed browser journeys for chat/history/search/retry/report,
materials, practice, past questions, mock exams, progress, notifications and
marking reviews. Verify refresh, duplicate submission, partial failure and
cross-account isolation.

#### 7. `test/provider-contracts-and-email`

Use controlled local HTTP fakes for exact request/response, timeout, retry and
error mapping. Add bounded staging contracts for Supabase Auth, Resend, OpenAI,
Paystack and WhatsApp only when the feature is approved. Do not expose provider
credentials or real message content in artifacts.

#### 8. `test/payments-webhooks-scheduled-jobs`

Cover webhook signatures, replay/idempotency and out-of-order delivery;
test-mode checkout verification; renewal/cancellation/refund rules; duplicated
or missed cron runs; and alerting. This work does not enable paid launch.

#### 9. `test/security-negative-fuzz-sast`

Add safe property/fuzz cases for parsers, IDs, bodies, Markdown/HTML and file
metadata; evaluate SAST on the repository; extend ZAP to the approved
authenticated staging application; and verify that the scan reaches the app,
not only the Cloudflare Access page. Keep active/manual testing within signed
scope and never target production.

#### 10. `test/ai-rag-quality-safety-cost`

- Preserve consumed-holdout rules and create fresh versioned evaluation sets.
- Score retrieval coverage/quality, answerability, faithfulness, citation
  validity, conflicting evidence, prompt injection and refusal behavior.
- Add Nigerian-context relevance and age-appropriate explanation rubrics
  without forcing local examples where they reduce accuracy.
- Test marking consistency, correction/review rights and credit accounting.
- Record model/prompt/dataset identity, latency and cost for approved real-
  provider runs; compare candidate to the last accepted baseline.
- Require qualified human sampling for educational correctness and safety.

Exit: automatic scorecards have documented thresholds, fresh hidden cases and
deterministic regression checks; human review and deployment approval remain
separate. Grounded chat stays disabled until its existing gate is explicitly
closed.

### Priority 2 — quality across real operating conditions

#### 11. `test/accessibility-real-app`

Run axe and keyboard checks on the assembled public/authenticated app; add
route-change/focus announcements, errors, dialogs, CAPTCHA and async state. Add
manual screen-reader, zoom/reflow, increased-text, contrast, reduced-motion and
physical-keyboard acceptance with recorded scope.

#### 12. `test/browser-device-visual-network`

Add supported Firefox/Chromium/WebKit and representative phone/tablet/desktop
coverage, mobile keyboard/safe areas, visual baselines for critical states and
slow/offline/reconnect cases. Separate rendering snapshots from behavioral
assertions.

#### 13. `test/performance-load-soak-resilience`

Set private SLOs and public-safe test categories. Measure Web Vitals, payload
sizes, API/database p95/p99 behavior, pool pressure, AI concurrency, webhook
bursts and long sessions. Run load/spike/soak only in an approved isolated
environment. Inject bounded provider timeouts, database interruption and
container restart to prove graceful failure and recovery.

#### 14. `test/content-data-quality`

Validate subject/topic/question relationships, duplicates, answer and mark
consistency, source labels, rights/provenance, syllabus mapping, accessibility
text and import reports. Require qualified teacher sampling before placeholder
content is replaced or genuine past material is published.

#### 15. `test/privacy-retention-recovery-observability`

Exercise privacy requests, guardian withdrawal, retention notices, deletion
across primary stores, log redaction, backup restoration into isolation,
non-resurrection of deleted data, rollback, alert delivery, missed-job alerts
and provider-access review evidence. Keep evidence and live access details in
the restricted register.

### Priority 3 — human acceptance and independent assurance

#### 16. `test/exploratory-usability-uat-charters`

Create repeatable learner, guardian and support charters covering first-use,
recovery, learning tasks, errors, low-data conditions and accessibility. Record
observations and acceptance without copying personal data into tickets.

The independent manual security review and independent accessibility review
are externally scoped assurance activities, not branches that Study Buddy can
self-complete. Their procurement and launch gates remain in their existing
documents.

## Cadence and gating model

| Cadence | Required categories |
| --- | --- |
| Every relevant pull request | Lint/type/build, dependency policy, unit/component/handler tests, changed security regression tests, fixture browser checks where affected |
| Testing-baseline integration | Complete CI, coverage ratchet, real-Next E2E, disposable migration/database checks |
| Staging release candidate | Authenticated core journeys, provider sandbox checks affected by change, deployed headers/CSP, accessibility smoke, migration/runtime-role verification |
| Scheduled | Dependency/secret scan, passive staging DAST, AI drift/quality, performance trend, backup restoration, alert/job checks and access review at their approved frequencies |
| Before public/paid expansion | Full release suite, payment/refund gates if enabled, child/privacy gates, independent manual security review and accepted-risk sign-off |
| After material incident/provider/model/runtime change | Targeted regression, relevant contract/evaluation/recovery checks, documentation and new baseline approval |

## Initial acceptance policy

- All launch-critical E2E journeys must pass on the exact release candidate.
- A flaky pass is not a pass; repeat critical journeys and investigate any
  nondeterminism before promotion.
- No unresolved critical/high security or privacy defect may pass the public or
  paid launch gate.
- Automated accessibility checks must have no unreviewed serious/critical
  violations in scoped pages; manual assistive-technology findings still need
  separate review.
- Coverage is ratcheted from a measured baseline. New security, authorization,
  billing, deletion and AI-accounting logic must include branch/negative-path
  tests even if the global percentage is unchanged.
- Performance and AI quality/cost thresholds are approved privately before
  gating; this public document must not invent or disclose live defensive or
  budget values.
- Failed provider, migration, security, AI or recovery gates cannot be waived by
  a green unit-test job. Any accepted non-blocking risk needs the documented
  owner, reason and review date.

## Documentation maintenance

Update this roadmap when a workstream is opened, merged, superseded or changes
scope. Move only verified facts from “planned” to “present.” Record detailed
results, failures, screenshots, provider responses, accounts and approvals in
the restricted company evidence store. Public bug/fix histories may receive a
plain-language summary after remediation, but must not disclose an exploitable
playbook or live control values.

