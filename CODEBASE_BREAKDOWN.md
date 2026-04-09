# Study Buddy v2 Codebase Breakdown

This document is a high-level map of the codebase: what the app does, how it is structured, and where the main responsibilities live.

## What the Application Does

Study Buddy v2 is an exam-preparation platform for secondary-school learners. The current product centers on:

- account creation and login
- student profile capture
- subject/topic practice
- mock exams with scoring
- progress and performance reporting
- AI chat and recommendation features
- subscription and payment handling
- school/admin workflows

## Tech Stack

- framework: Next.js 16 App Router
- language: TypeScript
- UI: React 18 + Tailwind CSS
- database: PostgreSQL via Prisma
- auth: Supabase SSR auth with cookies
- AI: OpenAI

## Top-Level Structure

```text
app/          Pages, layouts, route handlers
components/   Reusable UI building blocks
lib/          Shared helpers and clients
prisma/       Schema, migrations, seeds
docs/         Supplemental project documentation
```

## Main Architectural Pattern

- most user-facing pages are App Router pages under `app/`
- server-side route handlers live under `app/api/v1/`
- Prisma is the application data layer
- Supabase manages auth identity; Prisma stores app-specific user data
- feature areas are split by domain: materials, exams, progress, chat, admin, schools

## Frontend Areas

### Public pages

- landing page: [`app/page.tsx`](/Users/efeon/study-buddy-v2/app/page.tsx)
- about/contact/legal pages under [`app/`](/Users/efeon/study-buddy-v2/app)

### Auth pages

- login: [`app/login`](/Users/efeon/study-buddy-v2/app/login)
- sign-up: [`app/sign-up`](/Users/efeon/study-buddy-v2/app/sign-up)
- forgot/reset password flows
- email verification and access-state pages

### Authenticated product pages

- dashboard: [`app/dashboard`](/Users/efeon/study-buddy-v2/app/dashboard)
- materials: [`app/materials`](/Users/efeon/study-buddy-v2/app/materials)
- exams: [`app/exams`](/Users/efeon/study-buddy-v2/app/exams)
- progress: [`app/progress`](/Users/efeon/study-buddy-v2/app/progress)
- chat: [`app/chat`](/Users/efeon/study-buddy-v2/app/chat)

## Backend Areas

All current APIs are implemented under [`app/api/v1`](/Users/efeon/study-buddy-v2/app/api/v1).

### Auth and account

- signup, login, logout, reset password, current user

### Profile

- read and update current user profile

### Materials and past questions

- materials overview
- questions by topic
- answer attempt submission
- question explanations

### Mock exams

- list templates
- start exam
- fetch exam instance
- save progress
- submit
- grade

### Progress

- full report
- per-subject progress upsert
- bulk progress updates

### AI

- quick chat messages
- question thread creation
- thread replies
- thread listing
- recommendations
- recommendation cron

### Admin, schools, subscriptions, payments

- content/admin upload flows
- school creation and student membership
- subscription lookup
- payment verification and webhook handling

## Shared Libraries

- Prisma client: [`lib/prisma.ts`](/Users/efeon/study-buddy-v2/lib/prisma.ts)
- auth guards: [`lib/auth.ts`](/Users/efeon/study-buddy-v2/lib/auth.ts)
- session helper: [`lib/getSession.ts`](/Users/efeon/study-buddy-v2/lib/getSession.ts)
- browser Supabase client: [`lib/supabaseClient.ts`](/Users/efeon/study-buddy-v2/lib/supabaseClient.ts)
- study materials display mapping: [`lib/materials-display.ts`](/Users/efeon/study-buddy-v2/lib/materials-display.ts)
- mock-exam choice generation: [`lib/mock-exam-multiple-choice.ts`](/Users/efeon/study-buddy-v2/lib/mock-exam-multiple-choice.ts)

## Database Model Overview

The schema lives in [`prisma/schema.prisma`](/Users/efeon/study-buddy-v2/prisma/schema.prisma).

### User and access

- `User`
- `UserProfile`
- `AdminUser`

### Learning content

- `Subject`
- `Topic`
- `PastQuestion`
- `CurriculumFile`

### Learning activity

- `PastQuestionAttempt`
- `MockExamTemplate`
- `MockExamInstance`
- `MockExamAnswer`
- `ProgressTrack`

### AI

- `AiQuestion`
- `AiQuestionMessage`
- `Recommendation`

### Commercial and institutional

- `Subscription`
- `Transaction`
- `School`
- `SchoolStudent`

## Seed Data

Seed orchestration is in [`prisma/seed/index.ts`](/Users/efeon/study-buddy-v2/prisma/seed/index.ts).

Supporting seed files:

- [`prisma/seed/subjects.ts`](/Users/efeon/study-buddy-v2/prisma/seed/subjects.ts)
- [`prisma/seed/topics.ts`](/Users/efeon/study-buddy-v2/prisma/seed/topics.ts)
- [`prisma/seed/questions.ts`](/Users/efeon/study-buddy-v2/prisma/seed/questions.ts)
- [`prisma/seed/mockTemplates.ts`](/Users/efeon/study-buddy-v2/prisma/seed/mockTemplates.ts)

## Where To Start

If you are new to the repo:

1. read [`README.md`](/Users/efeon/study-buddy-v2/README.md)
2. read [`docs/WEBSITE_GUIDE.md`](/Users/efeon/study-buddy-v2/docs/WEBSITE_GUIDE.md)
3. inspect [`prisma/schema.prisma`](/Users/efeon/study-buddy-v2/prisma/schema.prisma)
4. inspect [`app/api/v1/README.md`](/Users/efeon/study-buddy-v2/app/api/v1/README.md)
