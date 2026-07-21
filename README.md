# Study Buddy v2

Study Buddy v2 is a Next.js learning platform for exam preparation. It combines practice questions, mock exams, progress tracking, AI-assisted study support, subscriptions, and school/admin workflows in a single app.

## Stack

- Next.js 16 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Supabase Auth
- OpenAI API

## Core Product Areas

- Study materials: subject/topic browsing and topic-level practice drills
- Past questions: answer submission, grading, and explanations
- Mock exams: start, save progress, submit, and grade full exam instances
- Progress: subject progress, practice accuracy, and exam history
- AI: quick chat, saved AI question threads, and study recommendations
- Accounts and billing: auth, profile, subscriptions, and payments
- Admin and schools: content upload, user lookup, and school membership management

## Product Strategy Reminders

- Human tutoring strategy: consider an Uber/Airbnb-style marketplace model for human tutors. The platform can match students with vetted tutors, handle scheduling, trust signals, ratings, and payments, while letting tutor supply scale without Study Buddy directly employing every tutor.

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
- schools
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
- `AiQuestion`, `AiQuestionMessage`, `Recommendation`
- `ProgressTrack`
- `Subscription`, `Transaction`
- `School`, `SchoolStudent`

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

## Environment

The app expects environment variables for:

- Supabase URL and anon key
- database connection strings
- OpenAI API key
- payment provider secrets
- optional cron secret for recommendation generation

## Recommended Docs

- [`CODEBASE_BREAKDOWN.md`](/Users/efeon/study-buddy-v2/CODEBASE_BREAKDOWN.md): broad codebase map
- [`docs/WEBSITE_GUIDE.md`](/Users/efeon/study-buddy-v2/docs/WEBSITE_GUIDE.md): path-by-path app walkthrough
- [`AI_FEATURES_GUIDE.md`](/Users/efeon/study-buddy-v2/AI_FEATURES_GUIDE.md): AI-specific implementation notes
- [`app/api/v1/README.md`](/Users/efeon/study-buddy-v2/app/api/v1/README.md): API contracts
