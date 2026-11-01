# Grounded Chat Stage 4

Status: **DO_NOT_ENABLE**. This document describes implemented code, not an
approved student-facing feature. The persistent general chatbot remains the
supported `/chat` experience. Do not market its answers as grounded in Study
Buddy resources or as carrying verified citations.

## What Exists

- Stage 4 adds a feature-gated TEACH path to the existing persistent chat
  lifecycle. The user message and empty pending assistant message are committed
  before generation; the result is saved in a separate transaction.
- The legacy grounded path retrieves only eligible approved, processed,
  active-version resource chunks. It can refuse when evidence is insufficient
  and validates structured output and server-assigned citation references.
- `AiGroundingAttempt` records bounded attempt metadata. `AiMessageCitation`
  links an accepted assistant response to authorised evidence. Citation
  previews are authenticated, ownership-checked, and bounded; original private
  files and storage locations are not returned.
- Stage 4.1 adds a capability-based pipeline for development evaluation. It
  extracts request requirements and evidence capabilities, decides whether the
  whole request can be answered, and uses a narrower output validator. This
  path is **not wired into normal chat requests**. Production pipeline
  selection remains legacy, and grounded chat itself remains disabled.

No HINT, SOLVE, or MARK tutor mode, unrestricted web search, or unrestricted
model-memory fallback is part of this release.

## Deployment State

Keep these settings in deployed environments:

```env
AI_GROUNDED_CHAT_ENABLED=false
AI_GROUNDING_PIPELINE=legacy
```

`AI_CHAT_PROVIDER` and `AI_CHAT_MODEL` configure general chat generation.
`AI_EMBEDDING_PROVIDER`, `AI_EMBEDDING_MODEL`, `AI_EMBEDDING_DIMENSIONS`, and
`AI_EMBEDDING_VERSION` configure internal embedding workflows. The current
vector column is sized for 1,536 dimensions. Changing the embedding model or
dimensions needs a controlled migration and re-indexing; changing environment
variables alone is not sufficient. Keep provider credentials server-side.

## Validation State

Disclosed suites and synthetic manual reviews have produced useful development
evidence, but they are not a substitute for fresh holdout and live-database
validation. Historical holdouts through v8 are consumed; v8 failed. Do not
repeat consumed splits as fresh acceptance runs or tune against them. The
separate Stage 4.1 database-backed property campaign has not executed and
requires further validation before it can count as acceptance evidence.

The implementation must remain disabled until the relevant development,
adversarial, manual-quality, database-backed, and fresh-holdout gates pass and
an explicit enablement decision is made. Passing code checks or an isolated
schema audit does not satisfy those gates. Preserve historical reports and
one-shot records; do not overwrite them. Use synthetic, authorised material
for evaluations, never real student chats or unapproved documents.

The evaluation harness lives under `lib/ai/grounding/evaluation/` and is
disabled in production. The separate database campaign and runner live on a
validation branch, not in the deployed application. Evaluation commands can
write to the configured database and, with real providers, incur cost; they
must be run only under an approved, bounded protocol against an approved
target. This public guide intentionally does not contain instructions for
rerunning consumed holdouts.

## Boundaries And Operations

- Stage 1 general chat is persistent and provider-neutral, but not
  resource-grounded. See [AI chat migration](AI_CHAT_STAGE_1_MIGRATION.md).
- Stage 2 resource ingestion is internal-only and stores files privately.
  Approval and processing are separate. See [resource ingestion](RESOURCE_INGESTION_STAGE_2.md).
- Stage 3 retrieval uses approved active chunks and a versioned embedding
  configuration. It is not independently student-facing. See
  [resource retrieval](RESOURCE_RETRIEVAL_STAGE_3.md).
- AI routes require normal application authentication and ownership checks.
  Internal evaluation is not an alternative student access path.
- Human review must check whether cited evidence actually supports each
  answer, not merely whether citation identifiers are syntactically valid.

If grounded behavior appears unexpectedly, disable it using the feature flag
and investigate before resuming. Do not drop Stage 1 chats, resource tables,
embeddings, or citation history as a first-line rollback. Database rollback,
if ever needed, requires a reviewed migration and retention plan.
