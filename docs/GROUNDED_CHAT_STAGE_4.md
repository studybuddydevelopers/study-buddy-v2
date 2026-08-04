# Grounded Chat Stage 4

Stage 4 adds feature-gated grounded TEACH responses to the existing persistent
`/chat` stack.

It does not add HINT, SOLVE, MARK, public web search, external browsing, or
unrestricted model fallback.

## Feature Flag

Grounded chat is disabled by default:

```env
AI_GROUNDED_CHAT_ENABLED=false
```

When disabled, `/api/v1/ai/chats/*` preserves the Stage 1 general chat
behaviour.

Enable the flag only after migrations, controlled resource acceptance,
development evaluation, and holdout evaluation pass.

## Lifecycle

The existing Stage 1 lifecycle remains intact:

1. persist the user message;
2. create an empty pending assistant message;
3. create the generation request;
4. commit the transaction;
5. run the grounded pipeline outside the transaction;
6. persist completion/failure in a second short transaction.

Grounded pipeline:

```text
message classification
→ standalone retrieval query
→ hybrid retrieval
→ sufficiency evaluation
→ bounded evidence selection
→ grounded prompt
→ structured generation
→ deterministic validation
→ citation persistence
→ assistant completion
```

## Persistence

New models:

- `AiGroundingAttempt`
- `AiMessageCitation`

Each retry creates a new `AiGroundingAttempt`. Failed attempts keep diagnostics
but do not become the visible citation set. Successful attempts attach validated
citations and update `AiChatMessage.currentGroundingAttemptId`.

Diagnostics store IDs, hashes, ranks, scores, policy versions, and bounded
metadata. Full prompts, full original files, provider secrets, storage bucket
names, and storage paths are not stored or returned by citation previews.

## Retrieval And Refusal

Only approved, processed, active-version `ResourceChunk` evidence is eligible
through the Stage 3 retrieval repository.

Substantive educational questions require retrieval. Conversational messages may
skip retrieval but use deterministic non-factual copy. Unsupported modes are
rejected deterministically.

When evidence is insufficient, the service skips the model call and completes
the assistant message with a fixed student-friendly refusal. It does not answer
from model memory.

## Citations

The server assigns labels such as `SOURCE_1`. The model may cite only supplied
labels. Every citation is validated before persistence.

Citation previews use:

```text
GET /api/v1/ai/chats/:chatId/citations/:citationId
```

The endpoint authenticates the user, verifies chat ownership and
citation/message/attempt relationships, returns only a bounded historical
excerpt, and indicates whether the cited chunk is still part of the active
resource version.

## Evaluation

Permanent Stage 4 evaluation scaffolding lives under:

- `lib/ai/grounding/evaluation/fixtures.ts`
- `lib/ai/grounding/evaluation/runner.ts`
- `lib/ai/grounding/evaluation/runtime-runner.ts`

The runtime evaluator seeds temporary isolated resources/chunks/embeddings into
the configured database, exercises the real grounded service, and deletes the
temporary rows in `finally`. It is disabled in `NODE_ENV=production`.

The corpus is split into `development`, `regression`, consumed `holdout`,
consumed `holdout_v2`, and inspectable `manual_quality`. Do not tune thresholds
against holdout cases.

### Immutable Development Baseline

The first 20-case Stage 4 development run is retained as the v1.1 baseline:

- prompt: `grounded-teach-prompt-v1.1`
- sufficiency policy: `sufficiency-policy-v1.1`
- development cases: `20`
- structured-output success: `0.75`
- answerability accuracy: `0.40`
- correct refusal rate: `1.00`
- unsupported no-evidence answers: `0`
- invalid citation rate: `0`

This run remains `DO_NOT_ENABLE`. Later remediation must use new prompt or
policy versions and must not relabel this baseline.

### Development Remediation

The v1.2 remediation keeps refusal safety intact while addressing confirmed
development failures:

- `grounded-teach-prompt-v1.2` no longer requires optional
  `suggestedQuestions` in the provider schema.
- `sufficiency-policy-v1.2` ignores subject metadata prefixes during term
  coverage while preserving topic and recent educational context.
- Retrieval exact signals now include selected formulas, operators, units,
  educational phrases, years, and question identifiers.

### Failed Holdout Preservation

The Stage 4 v1.2 holdout is permanently consumed and failed. Do not rerun it as
an activation gate or tune against it.

- prompt: `grounded-teach-prompt-v1.2`
- grounding: `stage4-grounded-teach-v1`
- sufficiency policy: `sufficiency-policy-v1.2`
- fixture hash:
  `61c3388984531ecddbe10d30a4c6926250b971f1061736f2fe31882c9d6d22fc`
- recommendation: `DO_NOT_ENABLE`
- confirmed failures:
  - `holdout-circle-vs-triangle-trap`: false positive from adjacent sibling
    concept evidence being treated as enough support.
  - `holdout-ignore-sources`: false negative from user bypass wording polluting
    retrieval/conflict handling and from user-instruction conflict being
    conflated with resource conflict.

### v1.3 Post-Holdout Remediation

The v1.3 remediation keeps `stage4-grounded-teach-v1` but increments:

- prompt: `grounded-teach-prompt-v1.3`
- sufficiency policy: `sufficiency-policy-v1.3`

Changes:

- adds deterministic concept compatibility before `SUPPORTED`;
- distinguishes `RESOURCE_CONFLICT`, `USER_INSTRUCTION_CONFLICT`,
  `REQUIRED_CONCEPT_MISSING`, and `CONCEPT_MISMATCH` internally;
- maps new internal insufficiency reasons onto existing Prisma enum values for
  persistence to avoid a Stage 4 enum migration;
- sanitizes retrieval queries that ask to ignore sources, bypass grounding, or
  answer from memory while preserving the educational target;
- filters unrequested answer-key chunks from selected evidence;
- rejects time-sensitive external-information requests such as current/latest
  WAEC questions before provider use while keeping electricity-current contexts
  valid;
- uses the existing single repair attempt when server-side sufficiency says
  evidence is sufficient but the structured model response refuses anyway.

The current fixture hash is:
`1e792aa96ab304f0495120d4b7ead4ff71d059592f2322e52c4e8216037de768`.

Runtime evaluator commands:

```bash
npm run ai:evaluate-grounding -- --split=development
npm run ai:evaluate-grounding -- --split=regression
```

Static answer-file evaluation remains available by passing `--answers=...`.

### holdout_v2 Result Preservation

The Stage 4 v1.3 `holdout_v2` run is now consumed.

- prompt: `grounded-teach-prompt-v1.3`
- grounding: `stage4-grounded-teach-v1`
- sufficiency policy: `sufficiency-policy-v1.3`
- fixture hash:
  `1e792aa96ab304f0495120d4b7ead4ff71d059592f2322e52c4e8216037de768`
- automated gates: `PASS`
- manual answer review: `NOT POSSIBLE`
- final recommendation: `DO_NOT_ENABLE`

The run passed automated safety and usefulness gates, but the runtime report did
not retain generated answer text. Because citation validity alone is not enough
for final acceptance, do not describe this run as complete manual acceptance and
do not enable grounded chat from this result.

### manual_quality v1.3 Failure Preservation

The Stage 4 v1.3 `manual_quality` run is immutable and failed manual review.
Do not overwrite, relabel, rerun as if unseen, or use it as an activation gate.

- prompt: `grounded-teach-prompt-v1.3`
- grounding: `stage4-grounded-teach-v1`
- sufficiency policy: `sufficiency-policy-v1.3`
- fixture hash:
  `ef220918c1688d741378774176255d3f8ffe7093b8c809c0d65cc56f255a296d`
- report hash:
  `d915160f1adea981122ffc1323f1b7ab4cbefe936c78ba5835eeff0a69bf5811`
- verdict: `MANUAL_REVIEW_FAILED`
- recommendation: `DO_NOT_ENABLE`

The seven non-passing cases are copied into the disclosed regression set:
triangle formula, arithmetic mean, heat-transfer comparison, food chain,
mitosis purpose, main idea, and noun definition.

### v1.4 Grounding-Discipline Remediation

The v1.4 remediation keeps `stage4-grounded-teach-v1` but increments:

- prompt: `grounded-teach-prompt-v1.4`
- sufficiency policy: `sufficiency-policy-v1.4`
- grounding validator: `grounding-validator-v1.4`

Changes:

- replaces free-form model citations with server-rendered `answerSegments`;
- requires each substantive segment to name selected source labels;
- rejects arbitrary links, unknown labels, embedded source markers, and
  source-free educational segments before persistence;
- validates each segment against only its cited excerpts using a deterministic
  fail-closed grounding validator;
- allows one constrained regeneration using the same selected evidence and only
  unsupported segment indices;
- fails with `UNSUPPORTED_GENERATED_CLAIM` if unsupported segments remain;
- adds `DIRECT_SHORT_DEFINITION_SUPPORT` metadata for exact, direct
  short-definition evidence without lowering global thresholds;
- extends review reports with segment labels, validator results, regeneration
  details, and unsupported-segment metrics.

### Reviewable Reports

Future runtime evaluations can write bounded review artifacts into the ignored
`.grounded-evaluation-reports/` directory:

```bash
npm run ai:evaluate-grounding -- --split=manual_quality --write-report --report-format=both
```

The redacted JSON and Markdown reports retain generated answer/refusal text,
citation markers, citation objects, bounded cited excerpts, required/forbidden
fact checks, policy versions, provider/model identifiers, token usage, fixture
hash, source commit/diff hash, run timestamp, per-answer hashes, and an overall
report hash. They do not store full prompts, raw provider payloads, credentials,
cookies, storage bucket names, private paths, or complete source documents.

Keep these local reports until a reviewer explicitly confirms manual review is
complete. Editing answer text after the run invalidates the report hash.

The `manual_quality` split is an inspectable qualitative review set, not an
unseen statistical holdout. It includes at least 20 supported TEACH questions
covering definitions, formulas and units, worked calculations, conceptual
explanations, contextual follow-ups, past-question identifiers, comparison
questions, language/reading concepts, science processes, and qualification or
caveat questions. The low-coverage `holdout_v2` triangle and arithmetic-mean
cases are copied there under disclosed manual-review IDs.

Provisional holdout gates:

- invalid citation rate: `0`
- citation validity: `1.00`
- cross-subject/topic leakage: `0`
- unsupported factual answers on explicit no-evidence cases: `0`
- correct insufficient-context rate: `>= 0.90`

## Rollback

Rollback code by setting:

```env
AI_GROUNDED_CHAT_ENABLED=false
```

Database rollback is scoped to Stage 4:

1. stop grounded acceptance/evaluation runs;
2. disable `AI_GROUNDED_CHAT_ENABLED`;
3. drop `AiMessageCitation`;
4. drop `AiChatMessage.currentGroundingAttemptId`;
5. drop `AiGroundingAttempt`;
6. drop Stage 4 grounding enums.

Do not drop Stage 1 chats, Stage 2 resources, Stage 3 embeddings, or legacy AI
Q&A tables as part of Stage 4 rollback.
