# Study Buddy v2 Website Guide

This guide maps the current website implementation to the codebase using exact file locations.

## 1. Stack

| Layer | Technology | Main location |
|--------|------------|---------------|
| Framework | Next.js 16 App Router | `app/` |
| UI | React 18 + Tailwind CSS | `app/**/*.tsx`, `components/`, `app/globals.css` |
| Auth | Supabase SSR cookies | `app/layout.tsx`, `lib/auth.ts`, `lib/getSession.ts`, `lib/supabaseClient.ts` |
| Database | Prisma + PostgreSQL | `prisma/schema.prisma`, `lib/prisma.ts` |
| AI | OpenAI API | `app/api/v1/ai/**` |

## 2. App Shell

- [`app/layout.tsx`](/Users/efeon/study-buddy-v2/app/layout.tsx): root layout, metadata, global CSS, server-side user lookup
- [`app/ClientLayoutWrapper.tsx`](/Users/efeon/study-buddy-v2/app/ClientLayoutWrapper.tsx): wraps content with nav, footer, and user context
- [`app/globals.css`](/Users/efeon/study-buddy-v2/app/globals.css): Tailwind layers and design tokens

## 3. Navigation and Branding

- [`components/NavBar.tsx`](/Users/efeon/study-buddy-v2/components/NavBar.tsx): main navigation and auth-aware links
- [`components/Footer.tsx`](/Users/efeon/study-buddy-v2/components/Footer.tsx): footer links
- [`components/Logo.tsx`](/Users/efeon/study-buddy-v2/components/Logo.tsx)
- [`components/LogoIcon.tsx`](/Users/efeon/study-buddy-v2/components/LogoIcon.tsx)
- [`components/LogoName.tsx`](/Users/efeon/study-buddy-v2/components/LogoName.tsx)

## 4. Auth and Session Flow

- [`lib/auth.ts`](/Users/efeon/study-buddy-v2/lib/auth.ts): `requireUser()` and `requireAdmin()` for route handlers
- [`lib/getSession.ts`](/Users/efeon/study-buddy-v2/lib/getSession.ts): session helper
- [`lib/supabaseClient.ts`](/Users/efeon/study-buddy-v2/lib/supabaseClient.ts): browser client
- [`app/api/v1/signup/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/signup/route.ts)
- [`app/api/v1/login/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/login/route.ts)
- [`app/api/v1/logout/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/logout/route.ts)
- [`app/api/v1/me/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/me/route.ts)
- [`app/api/v1/reset-password/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/reset-password/route.ts)
- [`app/auth/password-reset/route.ts`](/Users/efeon/study-buddy-v2/app/auth/password-reset/route.ts)

## 5. Shared UI Building Blocks

- headings: [`components/Heading1.tsx`](/Users/efeon/study-buddy-v2/components/Heading1.tsx) through [`components/Heading6.tsx`](/Users/efeon/study-buddy-v2/components/Heading6.tsx)
- text: [`components/Paragraph.tsx`](/Users/efeon/study-buddy-v2/components/Paragraph.tsx), [`components/Caption.tsx`](/Users/efeon/study-buddy-v2/components/Caption.tsx), [`components/Small.tsx`](/Users/efeon/study-buddy-v2/components/Small.tsx)
- forms: [`components/TextField.tsx`](/Users/efeon/study-buddy-v2/components/TextField.tsx), [`components/SelectField.tsx`](/Users/efeon/study-buddy-v2/components/SelectField.tsx), [`components/MultiSelectField.tsx`](/Users/efeon/study-buddy-v2/components/MultiSelectField.tsx)
- general UI: [`components/Button.tsx`](/Users/efeon/study-buddy-v2/components/Button.tsx), [`components/Card.tsx`](/Users/efeon/study-buddy-v2/components/Card.tsx), [`components/Badge.tsx`](/Users/efeon/study-buddy-v2/components/Badge.tsx), [`components/ProgressBar.tsx`](/Users/efeon/study-buddy-v2/components/ProgressBar.tsx), [`components/Table.tsx`](/Users/efeon/study-buddy-v2/components/Table.tsx)
- chat UI: [`components/ChatMessage.tsx`](/Users/efeon/study-buddy-v2/components/ChatMessage.tsx), [`components/ChatMessageContainer.tsx`](/Users/efeon/study-buddy-v2/components/ChatMessageContainer.tsx)

## 6. Public Pages

- landing: [`app/page.tsx`](/Users/efeon/study-buddy-v2/app/page.tsx), [`app/ClientLanding.tsx`](/Users/efeon/study-buddy-v2/app/ClientLanding.tsx)
- about: [`app/about-us/page.tsx`](/Users/efeon/study-buddy-v2/app/about-us/page.tsx)
- contact: [`app/contact-us/page.tsx`](/Users/efeon/study-buddy-v2/app/contact-us/page.tsx)
- privacy: [`app/privacy-policy/page.tsx`](/Users/efeon/study-buddy-v2/app/privacy-policy/page.tsx)
- terms: [`app/terms-of-service/page.tsx`](/Users/efeon/study-buddy-v2/app/terms-of-service/page.tsx)
- demo: [`app/demo-showcase/page.tsx`](/Users/efeon/study-buddy-v2/app/demo-showcase/page.tsx)

## 7. Auth Pages

- login: [`app/login/page.tsx`](/Users/efeon/study-buddy-v2/app/login/page.tsx), [`app/login/LoginClient.tsx`](/Users/efeon/study-buddy-v2/app/login/LoginClient.tsx)
- sign-up: [`app/sign-up/page.tsx`](/Users/efeon/study-buddy-v2/app/sign-up/page.tsx), [`app/sign-up/SignUpClient.tsx`](/Users/efeon/study-buddy-v2/app/sign-up/SignUpClient.tsx)
- forgot password: [`app/forgot-password/page.tsx`](/Users/efeon/study-buddy-v2/app/forgot-password/page.tsx), [`app/forgot-password/ForgotPasswordClient.tsx`](/Users/efeon/study-buddy-v2/app/forgot-password/ForgotPasswordClient.tsx)
- reset password update: [`app/reset-password/update/page.tsx`](/Users/efeon/study-buddy-v2/app/reset-password/update/page.tsx), [`app/reset-password/update/ResetPasswordUpdateClient.tsx`](/Users/efeon/study-buddy-v2/app/reset-password/update/ResetPasswordUpdateClient.tsx)
- email check: [`app/check-email/page.tsx`](/Users/efeon/study-buddy-v2/app/check-email/page.tsx), [`app/check-email/CheckEmailClient.tsx`](/Users/efeon/study-buddy-v2/app/check-email/CheckEmailClient.tsx)
- verify email: [`app/verify-email/page.tsx`](/Users/efeon/study-buddy-v2/app/verify-email/page.tsx), [`app/verify-email/ClientEmailVerify.tsx`](/Users/efeon/study-buddy-v2/app/verify-email/ClientEmailVerify.tsx)
- state pages: [`app/unauthorized/page.tsx`](/Users/efeon/study-buddy-v2/app/unauthorized/page.tsx), [`app/already-logged-in/page.tsx`](/Users/efeon/study-buddy-v2/app/already-logged-in/page.tsx)

## 8. Dashboard

- [`app/dashboard/page.tsx`](/Users/efeon/study-buddy-v2/app/dashboard/page.tsx): fetches current user, full progress, and AI recommendations
- [`app/dashboard/DashboardClient.tsx`](/Users/efeon/study-buddy-v2/app/dashboard/DashboardClient.tsx): renders dashboard content
- [`app/dashboard/dashboard.types.ts`](/Users/efeon/study-buddy-v2/app/dashboard/dashboard.types.ts): shared response types

## 9. Study Materials

- [`app/materials/page.tsx`](/Users/efeon/study-buddy-v2/app/materials/page.tsx): loads materials overview
- [`app/materials/MaterialsClient.tsx`](/Users/efeon/study-buddy-v2/app/materials/MaterialsClient.tsx): subject/topic cards and progress
- [`app/materials/practice/[topicId]/page.tsx`](/Users/efeon/study-buddy-v2/app/materials/practice/[topicId]/page.tsx): topic shell for practice route
- [`app/materials/practice/[topicId]/TopicPracticeClient.tsx`](/Users/efeon/study-buddy-v2/app/materials/practice/[topicId]/TopicPracticeClient.tsx): question drill flow
- [`lib/materials-display.ts`](/Users/efeon/study-buddy-v2/lib/materials-display.ts): subject ordering and display labels

Supporting APIs:

- [`app/api/v1/materials/overview/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/materials/overview/route.ts)
- [`app/api/v1/past-questions/by-topic/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/past-questions/by-topic/route.ts)
- [`app/api/v1/past-questions/attempt/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/past-questions/attempt/route.ts)
- [`app/api/v1/past-questions/explanation/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/past-questions/explanation/route.ts)

## 10. Mock Exams

- [`app/exams/page.tsx`](/Users/efeon/study-buddy-v2/app/exams/page.tsx): exam template listing page
- [`app/exams/MockExamsClient.tsx`](/Users/efeon/study-buddy-v2/app/exams/MockExamsClient.tsx): start-exam flow
- [`app/exams/[instanceId]/page.tsx`](/Users/efeon/study-buddy-v2/app/exams/[instanceId]/page.tsx): exam instance shell
- [`app/exams/ExamInstanceClient.tsx`](/Users/efeon/study-buddy-v2/app/exams/ExamInstanceClient.tsx): exam-taking UI
- [`lib/mock-exam-multiple-choice.ts`](/Users/efeon/study-buddy-v2/lib/mock-exam-multiple-choice.ts): deterministic option generation

Supporting APIs:

- [`app/api/v1/mock-exams/mock-exam-templates/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/mock-exams/mock-exam-templates/route.ts)
- [`app/api/v1/mock-exams/start/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/mock-exams/start/route.ts)
- [`app/api/v1/mock-exams/instance/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/mock-exams/instance/route.ts)
- [`app/api/v1/mock-exams/save-progress/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/mock-exams/save-progress/route.ts)
- [`app/api/v1/mock-exams/submit/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/mock-exams/submit/route.ts)
- [`app/api/v1/mock-exams/grade/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/mock-exams/grade/route.ts)

## 11. Progress

- [`app/progress/page.tsx`](/Users/efeon/study-buddy-v2/app/progress/page.tsx): fetches full report
- [`app/progress/ProgressClient.tsx`](/Users/efeon/study-buddy-v2/app/progress/ProgressClient.tsx): renders user performance summary

Supporting APIs:

- [`app/api/v1/progress/full-report/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/progress/full-report/route.ts)
- [`app/api/v1/progress/subject/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/progress/subject/route.ts)
- [`app/api/v1/progress/update/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/progress/update/route.ts)

## 12. Chat and AI

- [`app/chat/page.tsx`](/Users/efeon/study-buddy-v2/app/chat/page.tsx)
- [`app/chat/ChatClient.tsx`](/Users/efeon/study-buddy-v2/app/chat/ChatClient.tsx)

Supporting APIs:

- [`app/api/v1/ai/messages/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/messages/route.ts)
- [`app/api/v1/ai/questions/create/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/create/route.ts)
- [`app/api/v1/ai/questions/list/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/list/route.ts)
- [`app/api/v1/ai/questions/[id]/reply/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/questions/[id]/reply/route.ts)
- [`app/api/v1/ai/recommendations/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/recommendations/route.ts)
- [`app/api/v1/ai/recommendations/cron/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/ai/recommendations/cron/route.ts)

## 13. Other Backend Domains

- profile: [`app/api/v1/profile/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/profile/route.ts)
- schools: [`app/api/v1/schools/create/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/schools/create/route.ts), [`app/api/v1/schools/list/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/schools/list/route.ts), [`app/api/v1/schools/[id]/students/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/schools/[id]/students/route.ts)
- subscriptions: [`app/api/v1/subscriptions/list/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/subscriptions/list/route.ts), [`app/api/v1/subscriptions/[id]/status/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/subscriptions/[id]/status/route.ts)
- payments: [`app/api/v1/payments/verify/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/payments/verify/route.ts), [`app/api/v1/payments/webhook/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/payments/webhook/route.ts)
- admin: [`app/api/v1/admin/subjects/create/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/admin/subjects/create/route.ts), [`app/api/v1/admin/topics/create/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/admin/topics/create/route.ts), [`app/api/v1/admin/curriculum/upload/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/admin/curriculum/upload/route.ts), [`app/api/v1/admin/past-questions/upload/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/admin/past-questions/upload/route.ts), [`app/api/v1/admin/past-questions/batch/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/admin/past-questions/batch/route.ts), [`app/api/v1/admin/users/query/route.ts`](/Users/efeon/study-buddy-v2/app/api/v1/admin/users/query/route.ts)

## 14. Data Layer

- Prisma schema: [`prisma/schema.prisma`](/Users/efeon/study-buddy-v2/prisma/schema.prisma)
- migrations: [`prisma/migrations`](/Users/efeon/study-buddy-v2/prisma/migrations)
- seed orchestrator: [`prisma/seed/index.ts`](/Users/efeon/study-buddy-v2/prisma/seed/index.ts)
- seed content: [`prisma/seed/subjects.ts`](/Users/efeon/study-buddy-v2/prisma/seed/subjects.ts), [`prisma/seed/topics.ts`](/Users/efeon/study-buddy-v2/prisma/seed/topics.ts), [`prisma/seed/questions.ts`](/Users/efeon/study-buddy-v2/prisma/seed/questions.ts), [`prisma/seed/mockTemplates.ts`](/Users/efeon/study-buddy-v2/prisma/seed/mockTemplates.ts)

## 15. Operational Notes

- dynamic route pages such as materials practice and exam instances use App Router route params
- app routes and API handlers assume Supabase cookies for auth
- route-level API behavior is documented in [`app/api/v1/README.md`](/Users/efeon/study-buddy-v2/app/api/v1/README.md)
