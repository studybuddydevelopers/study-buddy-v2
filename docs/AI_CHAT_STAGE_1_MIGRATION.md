# AI Chat Stage 1 Migration

Stage 1 added persistent general AI chat. Its general-chat path is not
resource-grounded. Later stages added separate resource and feature-gated
grounding code, but grounded chat remains disabled.

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

`DELETE /api/v1/ai/chats/:chatId` is ownership-scoped and permanently deletes the
chat from the live database. Database cascades remove its messages, generation
requests, grounding attempts, and citations. The web client requires an explicit
destructive-action confirmation before calling this route.

## Rollback

The original Stage 1 tables now have downstream Stage 4 relationships and
contain live chat history. Do **not** use the original table-drop sequence on a
current database. Disable the affected feature first, preserve necessary data,
and design a reviewed rollback migration against the deployed schema. Legacy
`AiQuestion` and `AiQuestionMessage` remain separate.

## Historical Stage 2 Prerequisites

- Admin approval policy for reusable resources.
- Resource provenance/completeness checks before any migration from `PastQuestion`.
- Separate ingestion worker or admin command for parsing/chunking.
- No auto-approval of existing past questions unless explicit checks pass.

Stage 2 internal ingestion code was subsequently added. Its former
administrator HTTP routes are not exposed by the current app.

Cursor pagination remains a future improvement. Stage 1 uses bounded offset pagination with stable secondary ID ordering.
