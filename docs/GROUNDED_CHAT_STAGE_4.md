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

The corpus is split into `development` and `holdout`. Do not tune thresholds
against holdout cases.

Evaluate a controlled answer export:

```bash
npm run ai:evaluate-grounding -- --answers=docs/reports/grounded-answers.json --split=development
npm run ai:evaluate-grounding -- --answers=docs/reports/grounded-answers.json --split=holdout
```

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
