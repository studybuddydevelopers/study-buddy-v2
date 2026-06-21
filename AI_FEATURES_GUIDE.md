# AI Features Guide

This document lists the current AI features in Study Buddy v2 and where their implementation lives.

## AI Features In Scope

The app currently uses OpenAI for three product behaviors:

- quick AI chat
- persistent AI question threads
- personalized study recommendations

All AI route handlers live under [`app/api/v1/ai`](/Users/efeon/study-buddy-v2/app/api/v1/ai).

## Model Usage

Current routes call `gpt-4o-mini`.

OpenAI is used in:

- [`app/api/v1/ai/messages/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/messages/route.ts)
- [`app/api/v1/ai/questions/create/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/create/route.ts)
- [`app/api/v1/ai/questions/[id]/reply/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/[id]/reply/route.ts)
- [`app/api/v1/ai/recommendations/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/recommendations/route.ts)
- [`app/api/v1/ai/recommendations/cron/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/recommendations/cron/route.ts)

## 1. Quick Chat

Frontend:

- [`app/chat/page.tsx`](/Users/efeon/study-buddy-v2/app/chat/page.tsx)
- [`app/chat/ChatClient.tsx`](/Users/efeon/study-buddy-v2/app/chat/ChatClient.tsx)
- [`components/ChatMessage.tsx`](/Users/efeon/study-buddy-v2/components/ChatMessage.tsx)
- [`components/ChatMessageContainer.tsx`](/Users/efeon/study-buddy-v2/components/ChatMessageContainer.tsx)

Backend:

- [`app/api/v1/ai/messages/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/messages/route.ts)

Behavior:

- requires an authenticated user
- accepts `message` plus optional `subjectId` and `topicId`
- sends a concise tutoring-style prompt to OpenAI
- returns `userMessage`, `aiResponse`, and `meta`
- does not save chat history to the database

## 2. AI Question Threads

This is the persistent AI conversation feature.

Backend files:

- create thread: [`app/api/v1/ai/questions/create/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/create/route.ts)
- list threads: [`app/api/v1/ai/questions/list/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/list/route.ts)
- reply in thread: [`app/api/v1/ai/questions/[id]/reply/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/[id]/reply/route.ts)

Database models:

- `AiQuestion`
- `AiQuestionMessage`

Defined in [`prisma/schema.prisma`](/Users/efeon/study-buddy-v2/prisma/schema.prisma).

Behavior:

- a new thread stores the original question in `AiQuestion`
- both user and AI messages are stored in `AiQuestionMessage`
- reply calls reload earlier messages from the database and pass the thread context back to OpenAI
- thread ownership is enforced before a reply is accepted

## 3. AI Recommendations

Backend files:

- on-demand recommendations: [`app/api/v1/ai/recommendations/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/recommendations/route.ts)
- scheduled generation: [`app/api/v1/ai/recommendations/cron/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/recommendations/cron/route.ts)

Database model:

- `Recommendation`

Behavior:

- `GET /ai/recommendations` returns recent recommendations or generates up to the daily cap if fewer are available
- recommendation generation uses subject-level `ProgressTrack` data as the main personalization input
- generated recommendations are stored in the database
- `POST /ai/recommendations` can generate a recommendation for optional `subjectId`, `topicId`, and `context`
- the cron route generates recommendations in bulk for users and is protected by a secret

Current constraints:

- freshness window is approximately 23 hours
- daily cap is 2 recommendations per user

## AI Data Dependencies

These AI features depend on:

- auth state from [`lib/auth.ts`](/Users/efeon/study-buddy-v2/lib/auth.ts)
- Prisma access via [`lib/prisma.ts`](/Users/efeon/study-buddy-v2/lib/prisma.ts)
- progress data from `ProgressTrack`
- optional subject/topic context from `Subject` and `Topic`

## Environment Variables

Required:

- `OPENAI_API_KEY`

Optional but used for scheduled recommendation generation:

- `RECOMMENDATIONS_CRON_SECRET`

Other runtime dependencies such as Supabase and database credentials are still required because all AI routes sit inside the main authenticated app.

## Practical Notes

- quick chat is stateless
- thread-based AI is stateful
- recommendations are persisted and reused
- AI explanations are constrained more by prompt design than by a dedicated tutoring model layer

## Likely Next Improvements

- richer learner context instead of mostly subject-level progress
- topic-level personalization for recommendations
- explicit evaluation and prompt versioning
- recommendation logging and quality metrics
- unified chat/thread UX instead of separate AI entry points
