# Study Buddy v2 — How the website works

This document explains architecture, styling, and behavior of the app, with **exact file paths** for each area. Paths are relative to the repository root unless noted.

---

## 1. Tech stack

| Layer | Technology | Where it shows up |
|--------|------------|-------------------|
| Framework | **Next.js** (App Router) | `app/` |
| UI | **React** + **Tailwind CSS** | `app/**/*.tsx`, `components/`, `app/globals.css` |
| Auth | **Supabase** (SSR cookies) | `app/layout.tsx`, `lib/auth.ts`, `lib/supabaseClient.ts`, `lib/getSession.ts` |
| Database | **PostgreSQL** via **Prisma** | `prisma/schema.prisma`, `lib/prisma.ts` |
| AI | **OpenAI** (API routes) | `app/api/v1/ai/**` |

---

## 2. App shell, layout, and global styling

### 2.1 Root layout and metadata

- **`app/layout.tsx`** — Root layout for every page: imports `globals.css`, creates a Supabase server client with `cookies()`, calls `getUser()`, passes `user` into `ClientLayoutWrapper`. Sets `metadata` (title, description, favicon). Uses `runtime = "nodejs"`.

### 2.2 Global layout wrapper (Nav + Footer)

- **`app/ClientLayoutWrapper.tsx`** — Client component wrapping all page content. Provides `UserContext`, renders **`components/NavBar.tsx`**, `children` inside `Suspense`, then **`components/Footer.tsx`**.

### 2.3 Global CSS and design tokens

- **`app/globals.css`** — Tailwind layers, **CSS custom properties** for the design system:
  - `--primary-*` (purple scale)
  - `--secondary-*` (navy / cool neutrals)
  - `--accent-*` (light UI neutrals)
  - semantic `--success`, `--warning`, `--error`, `--info`
  - `--background`, `--foreground`, font stacks  
  Typography and base `html` / `body` rules live here.

### 2.4 Tailwind

- **`tailwind.config.js`**, **`postcss.config.js`** / **`postcss.config.mjs`** — wire Tailwind into the build. Utility classes are used throughout (e.g. `bg-primary-500`, `border-accent-200`).

**Styling pattern:** Pages compose **shared components** (`Heading1`–`Heading6`, `Paragraph`, `Button`, `Card`, `ProgressBar`, etc.) plus Tailwind utility classes. There is no separate CSS-in-JS theme file beyond `globals.css`.

---

## 3. Navigation and chrome

- **`components/NavBar.tsx`** — Logo link (home vs dashboard when logged in), main nav links for authenticated users (Dashboard, Study Materials, Mock Exams, Progress, Chat), sign-in / sign-up / logout, mobile menu. Active route styling via `usePathname()`.
- **`components/Footer.tsx`** — Footer links: About Us, Contact, Privacy, Terms; copyright. Defaults include `/about-us`, `/contact-us`, etc.
- **`components/Logo.tsx`**, **`components/LogoIcon.tsx`**, **`components/LogoName.tsx`** — Brand assets.

### Route protection (reference)

- **`proxy.ts`** (repo root) — Defines **intended** `protectedPaths` (e.g. `/dashboard`, `/materials`, `/exams`, `/progress`, `/chat`) and `guestOnlyPaths`. If you rename this file to `middleware.ts` and export a default matcher, it can enforce redirects; as shipped it may exist only as a reference—**individual pages and API routes still rely on session checks where needed.**

---

## 4. Authentication and user context

- **`lib/auth.ts`** — `requireUser()`: reads Supabase session from cookies, loads `User` from Prisma, returns either `{ dbUser, ... }` or `{ errorResponse }` for API routes.
- **`lib/supabaseClient.ts`** — Browser Supabase client (client components).
- **`app/api/v1/login/route.ts`**, **`app/api/v1/logout/route.ts`**, **`app/api/v1/signup/route.ts`** — Server-side auth flows tied to your backend user creation.
- **`app/api/v1/me/route.ts`** — Current user + profile payload for the dashboard.

**Client usage:** **`app/ClientLayoutWrapper.tsx`** passes `user` into **`NavBar`**. Some pages use **`useUser()`** from the same file’s `UserContext` where needed.

---

## 5. Typography and UI building blocks

Headings share **`components/AbstractHeading.tsx`**; paragraphs use **`components/Paragraph.tsx`** (variants: default, muted, success, error, etc.).

| Component | File |
|-----------|------|
| Heading1–Heading6 | `components/Heading1.tsx` … `Heading6.tsx` (thin wrappers over `AbstractHeading`) |
| Paragraph | `components/Paragraph.tsx` |
| Button | `components/Button.tsx` |
| Card | `components/Card.tsx` |
| Progress bar | `components/ProgressBar.tsx` |
| Form fields | `components/TextField.tsx`, `SelectField.tsx`, `MultiSelectField.tsx`, etc. |
| Chat UI | `components/ChatMessage.tsx`, `components/ChatMessageContainer.tsx` |
| Images | `components/Image.tsx` |

---

## 6. Public marketing and legal pages

| Section | Files |
|---------|--------|
| **Landing** | `app/page.tsx` (server) → `app/ClientLanding.tsx` (hero, features, CTAs) |
| **About Us** | `app/about-us/page.tsx` |
| **Contact** (placeholder) | `app/contact-us/page.tsx` |
| **Privacy** | `app/privacy-policy/page.tsx` |
| **Terms** | `app/terms-of-service/page.tsx` |
| **Demo** | `app/demo-showcase/page.tsx` |

---

## 7. Auth screens (sign-in / sign-up / password)

| Flow | Files |
|------|--------|
| Login | `app/login/page.tsx`, `app/login/LoginClient.tsx` |
| Sign up | `app/sign-up/page.tsx`, `app/sign-up/SignUpClient.tsx` |
| Forgot password | `app/forgot-password/page.tsx`, `app/forgot-password/ForgotPasswordClient.tsx` |
| Reset password UI | `app/reset-password/update/page.tsx`, `ResetPasswordUpdateClient.tsx` |
| Email check | `app/check-email/page.tsx`, `CheckEmailClient.tsx` |
| Verify email | `app/verify-email/page.tsx`, `ClientEmailVerify.tsx` |
| Unauthorized | `app/unauthorized/page.tsx`, `UnauthorizedClient.tsx` |
| Already logged in | `app/already-logged-in/page.tsx`, `AlreadyLoggedInClient.tsx` |
| Auth callback | `app/auth/password-reset/route.ts` (if used) |

---

## 8. Authenticated app sections

### 8.1 Dashboard

- **`app/dashboard/page.tsx`** — Server page: fetches `/api/v1/me`, `/api/v1/progress/full-report`, `/api/v1/ai/recommendations` with cookies, passes data to client.
- **`app/dashboard/DashboardClient.tsx`** — Welcome, subject **ProgressBar** list from `ProgressTrack`, AI recommendations, quick links (chat, exams).
- **`app/dashboard/dashboard.types.ts`** — TypeScript types for API responses (`MeResponse`, `ProgressFullReport`, etc.).

### 8.2 Study materials (topics + progress + practice)

- **`app/materials/page.tsx`** — Fetches **`GET /api/v1/materials/overview`**, renders **`app/materials/MaterialsClient.tsx`**.
- **`app/materials/MaterialsClient.tsx`** — Lists subjects (Math, English Reading, English Writing) with 10 topics each, progress bars, **Practice this topic** button.
- **`lib/materials-display.ts`** — `MATERIALS_SUBJECT_ORDER`, `MATERIALS_SUBJECT_LABELS` map DB `examCode` to display names.
- **`app/api/v1/materials/overview/route.ts`** — Topics + coverage stats for the three SAT subjects.
- **Topic practice drill**
  - **`app/materials/practice/[topicId]/page.tsx`** — Loads topic from Prisma for title/breadcrumb.
  - **`app/materials/practice/[topicId]/TopicPracticeClient.tsx`** — Loads questions, submits answers, shows explanations.
  - **`app/api/v1/past-questions/by-topic/route.ts`** — Lists `PastQuestion` rows for a topic (no answers in list).
  - **`app/api/v1/past-questions/attempt/route.ts`** — Saves attempt, grades short answer.
  - **`app/api/v1/past-questions/explanation/route.ts`** — Full question + answer + explanation after practice.

### 8.3 Mock exams

- **`app/exams/page.tsx`** — Fetches **`GET /api/v1/mock-exams/mock-exam-templates`**, renders **`app/exams/MockExamsClient.tsx`**.
- **`app/exams/MockExamsClient.tsx`** — Starts exam via **`POST /api/v1/mock-exams/start`**, navigates to instance.
- **`app/exams/[instanceId]/page.tsx`** — Fetches **`GET /api/v1/mock-exams/instance`**, renders **`app/exams/ExamInstanceClient.tsx`**.
- **`app/exams/ExamInstanceClient.tsx`** — Multiple-choice UI (A–D), autosave **`POST /api/v1/mock-exams/save-progress`**, submit + **`POST /api/v1/mock-exams/submit`** + **`POST /api/v1/mock-exams/grade`**, optional **`POST /api/v1/progress/subject`** after grade.
- **`lib/mock-exam-multiple-choice.ts`** — Deterministic 4-option MCQ generation per instance + question.
- **API routes:** `app/api/v1/mock-exams/start/route.ts`, `instance/route.ts`, `save-progress/route.ts`, `submit/route.ts`, `grade/route.ts`, `mock-exam-templates/route.ts`.

### 8.4 Progress report

- **`app/progress/page.tsx`** — Fetches **`GET /api/v1/progress/full-report`**.
- **`app/progress/ProgressClient.tsx`** — Study materials coverage, mock exam table (score, %, duration), practice accuracy by subject, subject goals, AI thread count.
- **`app/api/v1/progress/full-report/route.ts`** — Aggregates `ProgressTrack`, materials bank coverage, graded mocks (timing from `startedAt` / `submittedAt`), `PastQuestionAttempt`, AI counts.
- **`app/api/v1/progress/subject/route.ts`**, **`app/api/v1/progress/update/route.ts`** — Upsert subject-level progress (used e.g. after mocks).

### 8.5 Chat (AI Q&A)

- **`app/chat/page.tsx`**, **`app/chat/ChatClient.tsx`** — Chat UI; uses **`app/api/v1/ai/messages/route.ts`** and related question/thread APIs under **`app/api/v1/ai/questions/`**.

---

## 9. Past questions and content APIs (summary)

| Purpose | File |
|---------|------|
| Attempt (practice grading) | `app/api/v1/past-questions/attempt/route.ts` |
| Explanation | `app/api/v1/past-questions/explanation/route.ts` |
| Query (legacy / thin) | `app/api/v1/past-questions/query/route.ts` |
| By topic (for materials practice) | `app/api/v1/past-questions/by-topic/route.ts` |

**Admin / ingestion:** `app/api/v1/admin/past-questions/upload/route.ts`, `batch/route.ts`, plus `admin/subjects/create/route.ts`, `admin/topics/create/route.ts`, `admin/curriculum/upload/route.ts`, `admin/users/query/route.ts`.

---

## 10. Other API domains (reference)

- **AI recommendations:** `app/api/v1/ai/recommendations/route.ts`, `app/api/v1/ai/recommendations/cron/route.ts`
- **Profile:** `app/api/v1/profile/route.ts`
- **Schools (B2B):** `app/api/v1/schools/*/route.ts`
- **Subscriptions / payments:** `app/api/v1/subscriptions/**`, `app/api/v1/payments/**`
- **Docs in repo:** `app/api/v1/README.md` — route list and behaviors

---

## 11. Data model and seed content

- **`prisma/schema.prisma`** — Single source of truth: `User`, `UserProfile`, `Subject`, `Topic`, `PastQuestion`, `PastQuestionAttempt`, `MockExamTemplate`, `MockExamInstance`, `MockExamAnswer`, `ProgressTrack`, `AiQuestion`, `Recommendation`, `Subscription`, schools, etc.
- **`lib/prisma.ts`** — Shared `PrismaClient` instance.
- **Seed:** **`prisma/seed/index.ts`** orchestrates **`prisma/seed/subjects.ts`**, **`topics.ts`**, **`questions.ts`**, **`mockTemplates.ts`** — populates subjects, topics (10 per subject + `sortOrder`), generated practice questions, mock templates.

---

## 12. Global UX utilities

- **`app/loading.tsx`** — App Router loading UI.
- **`app/error.tsx`** — Error boundary UI.
- **`app/not-found.tsx`**, **`app/NotFoundClient.tsx`** — 404 experience.

---

## 13. How the pieces connect (short flows)

1. **Landing** → **`ClientLanding.tsx`** → sign-up / login.
2. **Study materials** → **`materials/overview`** builds topic list → user opens **`/materials/practice/[topicId]`** → **`by-topic`** + **`/attempt`** + **`/explanation`**.
3. **Mock exam** → **`/mock-exams/start`** creates instance + answers → **`ExamInstanceClient`** uses **`buildMockExamMcqChoices`** → submit → grade → optional **`progress/subject`**.
4. **Progress** → **`full-report`** reads attempts, mocks, materials scope (`MATERIALS_SUBJECT_ORDER` in **`full-report/route.ts`** and **`lib/materials-display.ts`**).

---

## 14. Updating this guide

When you add pages or APIs, append rows to the tables above with the **exact path** of new `page.tsx` / `route.ts` / components so the map stays accurate. For deeper API contracts, keep **`app/api/v1/README.md`** in sync with behavior changes.
