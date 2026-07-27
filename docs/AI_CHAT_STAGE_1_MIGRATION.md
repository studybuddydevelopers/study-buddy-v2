# AI Chat Stage 1 Migration

Stage 1 adds persistent general AI chat. It does not add resource ingestion, retrieval, embeddings, citations, or grounded RAG behaviour.

## Migration

Migration folder:

```text
prisma/migrations/20260727120000_add_ai_chat_stage_1/
```

It creates:

- `AiChat`
- `AiChatMessage`
- `AiGenerationRequest`
- `AiChatRole`
- `AiChatMessageStatus`
- `AiGenerationRequestStatus`
- `AiGenerationFailureCode`

Legacy `AiQuestion`, `AiQuestionMessage`, and `/api/v1/ai/questions/*` remain unchanged.

## Lifecycle

`POST /api/v1/ai/chats/:chatId/messages` writes one completed user message, one pending assistant placeholder with empty `content`, and one pending generation request in a short transaction. The model call happens only after that transaction commits.

On success, a second transaction completes the assistant message and generation request. On failure, it stores only a safe failure code and leaves assistant `content` empty.

Idempotency is enforced by unique `(chatId, clientRequestId)` on `AiGenerationRequest`.

Duplicate request behaviour:

- `COMPLETED`: return existing user message, assistant message, and request.
- `PENDING`: return existing pending state without another model call.
- `FAILED`: return failed state with `retryRequired`; caller must use retry endpoint.

Retry endpoint:

```text
POST /api/v1/ai/chats/:chatId/requests/:requestId/retry
```

Retry atomically acquires only failed requests by updating `status = PENDING` and incrementing `attemptCount`. It resets the existing assistant message to empty pending content in the same transaction. Provider generation only starts if that conditional update changed exactly one row.

## Rollback

Rollback removes only Stage 1 chat data and enums:

```sql
DROP TABLE IF EXISTS "AiGenerationRequest";
DROP TABLE IF EXISTS "AiChatMessage";
DROP TABLE IF EXISTS "AiChat";
DROP TYPE IF EXISTS "AiGenerationFailureCode";
DROP TYPE IF EXISTS "AiGenerationRequestStatus";
DROP TYPE IF EXISTS "AiChatMessageStatus";
DROP TYPE IF EXISTS "AiChatRole";
```

This does not affect legacy `AiQuestion`/`AiQuestionMessage` data.

## Future Stage 2 Prerequisites

- Admin approval policy for reusable resources.
- Resource provenance/completeness checks before any migration from `PastQuestion`.
- Separate ingestion worker or admin command for parsing/chunking.
- No auto-approval of existing past questions unless explicit checks pass.

Cursor pagination remains a future improvement. Stage 1 uses bounded offset pagination with stable secondary ID ordering.
