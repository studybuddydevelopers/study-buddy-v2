API v1 Reference
================

Conventions
-----------
- All endpoints respond with JSON; errors use `{ "error": string }` and relevant HTTP status.
- Auth uses Supabase session cookies. `requireUser` blocks unauthenticated requests (401). `requireAdmin` additionally requires `isAdmin` and an `adminUser` row (403).
- Paths are shown relative to `/api/v1`.

Auth & Account
--------------
- POST `/signup` — Create a Supabase auth user. Body: `firstName`, `middleNames?`, `lastNames`, `email`, `phoneNumber`, `password`. Sets session cookies, returns `{ success: true }` or `{ error }`.
- POST `/login` — Sign in with `identifier` (email or phone) and `password`. Sets Supabase cookies, returns `{ success: true }` or `{ error }`.
- POST `/logout` — Clears Supabase session cookies. Body unused. Returns `{ ok: true }`.
- POST `/reset-password` — Body: `email`. Triggers Supabase reset flow redirecting to `/auth/password-reset`. Returns `{ ok: true }` or `{ error }`.
- GET `/me` (auth) — Returns user basics, profile, and latest subscription `{ id, createdAt, isAdmin, profile, subscription }`; 404 if no DB user record.

Profile
-------
- GET `/profile` (auth) — Fetch current user profile or `null`.
- PATCH `/profile` (auth) — Partial update/create of profile fields (`firstName`, `middleNames`, `lastNames`, `phoneNumber`, `gradeLevel`, `examYear`, `preferredSubjects`, `avatarUrl`). Returns `{ success: true, profile }`.

Schools (admin)
---------------
- POST `/schools/create` — Body: `name` (req), `location?`, `adminEmail?`. Creates school and returns `{ id, name, location, adminEmail, createdAt, students }`.
- GET `/schools/list` — Query: `search?`, `location?`. Returns `{ schools: [{ id, name, location, adminEmail, studentCount }] }`.
- GET `/schools/:id/students` — Returns `{ schoolId, students: [{ id, userId, joinedAt, profile }] }`; 404 if school missing.
- POST `/schools/:id/students` — Body: `userId`. Adds user to school; 400 if already present (unique constraint), 404 if school/user missing.

AI
--
- POST `/ai/messages` (auth) — Body: `message` (string, req), `subjectId?`, `topicId?`. Returns `{ userMessage, aiResponse, meta }`.
- POST `/ai/recommendations` (auth) — Body: `subjectId?`, `topicId?`, `context?` (string). Validates subject/topic when provided, saves recommendation, returns `{ recommendation }`.
- POST `/ai/questions/create` (auth) — Body: `questionText` (req), `subjectId?`, `topicId?`. Creates thread + first user message, generates/saves AI reply, returns `{ question, messages: [userMessage, aiMessage] }`.
- GET `/ai/questions/list` (auth) — Query: `page?=1`, `pageSize?=20`. Returns `{ threads: [{ id, questionText, createdAt, subjectId, topicId, lastMessage }], pagination }` for the requesting user.
- POST `/ai/questions/:id/reply` (auth) — Body: `message` (req). User must own thread. Saves user message, generates/saves AI reply, returns `{ userMessage, aiMessage }`.

Past Questions
--------------
- POST `/past-questions/attempt` (auth) — Body: `questionId` (req), `userAnswer` (string, optional), `timeTakenSeconds?`. Grades exact match, saves attempt, returns `{ attemptId, questionId, isCorrect, score, timeTakenSeconds, attemptedAt }`.
- POST `/past-questions/explanation` (auth) — Body: `questionId`. Returns question text, answer, explanation, subject/topic IDs, year, difficulty.
- POST `/past-questions/query` (auth) — Currently behaves like `/past-questions/explanation`: body `questionId`, returns the stored question/answer/explanation payload.

Mock Exams
----------
- GET `/mock-exams/mock-exam-templates` — Lists available templates with subject info.
- POST `/mock-exams/start` (auth) — Body: `templateId`. Creates a mock exam instance for the user, randomly selects questions from the template’s subject, and returns `{ instance, questions (no answers), answers }`.
- POST `/mock-exams/submit` (auth) — Body: `instanceId`, `answers: [{ answerId, userAnswer }]`. User must own instance and not have submitted already. Saves answers, sets `submittedAt`, returns `{ instanceId, submittedAt, answers }`.
- POST `/mock-exams/grade` (auth) — Body: `instanceId`. Requires submitted, ungraded instance owned by user. Grades each answer (exact match to stored answerText), updates totals, returns `{ instanceId, totalScore, graded, answers: [{ id, isCorrect, score }] }`.

Progress
--------
- POST `/progress/subject` (auth) — Body: `subjectId`, `progressPercentage` (number). Upserts a single progress track, returns `{ success: true, progress }`.
- POST `/progress/update` (auth) — Body: `{ updates: [{ subjectId, progressPercentage }] }`. Validates all subjectIds, bulk updates/creates tracks, returns `{ success: true, updated: [{ subjectId, progressPercentage, updatedAt }] }`.
- GET `/progress/full-report` (auth) — Returns subject progress list, past-question accuracy totals/per-subject, graded mock-exam stats, and AI question usage count.

Subscriptions
-------------
- GET `/subscriptions/list` (auth) — Query: `status?`, `plan?`, `userId?` (admin only). Admins can filter by user; regular users see only their subscriptions. Returns `{ subscriptions }`.
- GET `/subscriptions/:id/status` (auth) — Admins can read any; users can read only their own. Returns subscription detail `{ id, plan, status, startDate, endDate, renewalMethod, userId }`.

Payments
--------
- POST `/payments/verify` (auth) — Body: `reference`. Calls Paystack verify, records transaction if not already stored, returns `{ provider: "paystack", verified: true, transaction, duplicate? }`.
- POST `/payments/webhook` — Paystack webhook (raw body, signature checked). Requires `metadata.userId` from Paystack payload; creates transaction unless reference already exists. Returns `{ success: true }` or `{ received: true }`.

Admin Content
-------------
- POST `/admin/subjects/create` (admin) — Body: `name` (req), `examCode?`, `description?`. Returns created subject.
- POST `/admin/topics/create` (admin) — Body: `subjectId`, `title` (req), `examOutlineRef?`, `difficulty?`. Returns created topic.
- POST `/admin/curriculum/upload` (admin) — Multipart form: `subjectId`, `file` (PDF). Uploads to Supabase storage and records `{ id, subjectId, fileUrl, uploadedAt }`.
- POST `/admin/past-questions/upload` (admin) — Multipart form with `subjectId`, `questionText`, `answerText` (req); optional `topicId`, `explanationText`, `year`, `questionNumber`, `difficulty`, `image` (png/jpeg). Uploads image if provided, creates question record, returns stored fields.
- POST `/admin/past-questions/batch` (admin) — Body: array of past-question objects (`subjectId`, `questionText`, `answerText`, optional metadata). Inserts each and returns per-index results plus counts.
- GET `/admin/users/query` (admin) — Query: `search?`, `isAdmin?=true|false`, `page?=1`, `pageSize?=20`. Returns paginated users with limited profile info.
