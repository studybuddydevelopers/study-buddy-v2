# AI Change Process

Last reviewed: 1 November 2026.

This process applies to every change that can affect an AI result, AI data,
AI cost, or what the product claims about AI. It is an AI-specific companion to
the mandatory [deployment and security change process](DEPLOYMENT_SECURITY_CHANGE_PROCESS.md),
not a shortcut around it. This public guide contains no production secrets,
private evaluation material, internal addresses, defensive thresholds, or
instructions for bypassing controls. Keep those in the restricted change record.

## Current release boundary

- `/chat` is persistent **general** AI chat. Its answers are not verified
  against approved Study Buddy resources.
- Resource ingestion and retrieval are internal capabilities, not a public
  content-management or student search surface.
- Grounded TEACH and Stage 4.1 capability evaluation code exist, but grounded
  chat remains **DO_NOT_ENABLE**. `AI_GROUNDED_CHAT_ENABLED=false`; the normal
  deployed pipeline remains legacy. Passing disclosed tests does not change
  this decision.
- Written-exam AI marking, recommendations, and optional WhatsApp tutoring
  have their own data, eligibility, cost, and review obligations.

Before editing, confirm the actual code path and current deployment state.
Do not infer a released feature from a Prisma model, route, fixture, or
historical report alone. See the [AI guide](../AI_FEATURES_GUIDE.md),
[Stage 4 status](GROUNDED_CHAT_STAGE_4.md), and
[AI issue history](AI_BUG_AND_FIX_HISTORY.md).

## Classify the change

| Change area | Minimum review and evidence |
| --- | --- |
| AI documentation or presentation | Verify claims against current code and release state; test relevant rendering, accessibility, narrow layout, and low-data behavior. No provider run is needed for copy-only changes. |
| Chat API, lifecycle, ownership, retention, or access | Separate reviewer; tests for authorization, validation, idempotency, pending/failed/retry states, pagination, and deletion as applicable. Check privacy and migration effects. |
| Provider, model, prompt, or generation format | Separate reviewer; record provider/model and prompt version privately; offline contract tests, bounded approved real-provider evaluation with synthetic data, quality/safety/cost review, and a rollback target. |
| Resource ingestion, extraction, chunking, or approval | Separate reviewer; verify provenance and usage rights, extraction quality, versioning, private storage, access rules, and the approval decision before any content becomes retrievable. |
| Embeddings, retrieval, or ranking | Separate reviewer; verify authorized scope, filters, index/configuration compatibility, coverage, retrieval quality, latency, and cost. A model or dimension change needs a controlled rebuild/migration, not just an environment edit. |
| Grounding, citations, or tutor modes | Treat as unreleased safety-sensitive behavior. Require the separately approved staged evaluation and explicit enablement decision; do not turn on a feature flag as part of an ordinary code merge. |
| AI marking, credits, recommendations, or WhatsApp | Verify eligibility/consent, billing or usage accounting, human review/correction paths, data minimization, retention, and provider disclosures for the affected flow. |
| Evaluation harness or fixture | Review isolation, cleanup, reproducibility, candidate identity, and data exposure. A harness correction does not convert a failed or consumed holdout into a pass. |

If a change spans areas, apply every relevant control. Treat auth, child data,
secrets, uploads, provider settings, and financial effects as security-sensitive
under the parent process even when the code diff is small.

## Required workflow

1. **Record and scope.** Create a private change record with owner, reviewer,
   purpose, affected paths and environments, data and cost impact, expected
   behavior, stop conditions, rollback, and verification plan. Record the
   candidate revision and any behavior/fixture identity needed for evaluation.
   Keep real values, case-level findings, and approvals outside this repo.
2. **Inspect dependencies.** Trace the request from UI or job through API,
   service, provider, storage, and database. Check whether the change also
   affects legacy AI-question routes, written marking, recommendations,
   WhatsApp, retention, or public product copy. Preserve ownership boundaries.
3. **Implement narrowly.** Keep routes thin and provider SDKs in adapters.
   Keep relational writes in services, retrieval/vector SQL in its repository,
   and external provider calls outside long database transactions. Validate
   input/output, bound work, use safe error codes, and do not log secrets,
   student content, or raw provider payloads. Add a regression test for a bug.
4. **Verify without paid calls first.** Run focused tests using fake providers,
   then `npm test`, `npm run lint`, `npx tsc --noEmit --pretty false`,
   `npm run build`, and `git diff --check` when applicable. Check the UI in a
   browser for presentation changes. Run Prisma validation/migration checks for
   schema changes. An unexplained failure blocks promotion.
5. **Use real providers only with explicit approval.** Use bounded, synthetic,
   authorized material in an isolated environment. Freeze the exact candidate
   and evaluation inputs before the run. Record quality, safety, latency,
   usage, cost, and human-review outcomes privately. Do not submit real student
   chats or unapproved resources. Do not rerun consumed one-shot holdouts or
   tune against their expected answers.
6. **Review the release.** Deploy the same reviewed revision to protected
   staging. Verify migrations, runtime access, success/failure/retry paths,
   privacy-safe logging, limits, billing and monitoring relevant to the
   change. For grounded chat, a fresh acceptance result and explicit
   authorization are required in addition to all other gates. Staging success
   alone does not enable an unreleased mode.
7. **Close or stop.** Record the result and evidence privately, update public
   behavior docs and the [AI issue history](AI_BUG_AND_FIX_HISTORY.md), and
   identify remaining work. If a safety, correctness, privacy, authorization,
   cost, or candidate-integrity gate fails, stop that promotion. Preserve the
   failed result rather than quietly changing the candidate and continuing.

## Specific change rules

### General chat and frontend

Check persisted message order, ownership, chat classification lock, request
idempotency, safe pending/error display, retry without duplicate user turns,
and refresh behavior. For rendering changes, check lists, tables, code, maths,
unsafe markup handling, accessibility, mobile overflow, and low-data behavior.
Do not add wording that calls general chat source-grounded or officially
endorsed merely because grounded code exists.

### Providers, models, and prompts

Chat and embedding providers are independently configured. Keep credentials
server-side, record model/prompt versions and output contracts, and compare
the candidate with its predecessor on representative supported and refusal
cases. Do not assume a new model fixes grounding or marking failures without
evaluation. Update `.env.example` with variable names/placeholders only;
never commit live values or an environment export.

### Resources and retrieval

Record ownership, provenance, rights, subject/topic mapping, quality warnings,
approval, and active version before embedding or retrieval. Processing is not
approval. Reprocessing or metadata changes require checks that the active
chunk/search representation is current. Embedding model/dimension changes
require a compatible schema and controlled re-indexing plan. Do not add a
public upload or approval route without a new threat/privacy review.

### Grounding and evaluation

Keep unreleased grounding disabled while developing. Evaluate requirement
extraction, evidence capability/selection, whole-request answerability,
citations, factual support, refusals, adversarial content, and teaching
quality as separate layers. Human review must compare answers with authorized
evidence; a valid citation ID alone is insufficient. Preserve consumed
holdout markers and historical failures. Evaluation fixes require their own
tests and a new approved candidate; they do not authorize rerunning a used
acceptance split. Never expose case-level prompts, answer keys, hostile text,
or private corpus content in public docs.

### Marking and other AI flows

For written marking, verify scoring boundaries, credit reservation/retry,
explanations, learner review requests, and the distinction between practice
feedback and official grades. For recommendations or WhatsApp, verify the
specific consent, access, retention, rate/cost and deletion rules. A chat-only
test does not validate these separate flows.

## Release and rollback

Do not enable grounded chat, change an embedding configuration, publish a new
resource corpus, or change a provider in production solely because tests pass.
Require the named owner/reviewer and applicable safety, privacy, legal and
deployment approvals. Keep rollout bounded and observe errors, quality, and
cost without exposing student content in logs.

For a bad release, use the approved feature/configuration rollback or prior
compatible application revision, then investigate. Preserve chats, resources,
embeddings, citations, and evaluation records unless a separate reviewed data
retention/migration plan requires changes. Do not drop tables, broaden
privileges, disable abuse controls, or reuse a consumed holdout to recover a
failed gate. Escalate suspected data exposure under the incident process.

## Documentation and evidence map

| What changed | Public update | Restricted evidence |
| --- | --- | --- |
| Learner-facing AI behavior | [AI guide](../AI_FEATURES_GUIDE.md), API reference and relevant UI copy | Browser review, representative synthetic transcripts |
| Chat schema/lifecycle | [Stage 1 notes](AI_CHAT_STAGE_1_MIGRATION.md) | Migration, runtime and rollback evidence |
| Resource processing | [Stage 2 notes](RESOURCE_INGESTION_STAGE_2.md) | Rights, extraction and approval records |
| Embeddings/retrieval | [Stage 3 notes](RESOURCE_RETRIEVAL_STAGE_3.md) | Coverage, retrieval and index verification |
| Grounding/evaluation | [Stage 4 status](GROUNDED_CHAT_STAGE_4.md) | Frozen candidate, full metrics, human review, one-shot record |
| Bug or failed gate | [AI issue history](AI_BUG_AND_FIX_HISTORY.md) | Reproduction, logs, case-level findings, corrective verification |
| Provider/security/privacy/deployment | [Security change process](DEPLOYMENT_SECURITY_CHANGE_PROCESS.md) and applicable policy | Credentials, contracts, incident and release approvals |

This process is complete for a change only when the affected behavior is
verified, privacy and public claims still match reality, the release decision
is recorded, and the public/private records are updated in their proper places.
