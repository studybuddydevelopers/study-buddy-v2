# Study Buddy codebase breakdown

Last checked against the working tree: 1 November 2026.

This public contributor map describes source responsibilities, not production
infrastructure or access-provisioning procedures. See the
[website guide](docs/WEBSITE_GUIDE.md) for the detailed frontend walkthrough.

## Product scope

Study Buddy supports account/profile management, subject/topic practice,
mock exams, separate coverage/accuracy/performance reporting and saved AI chat.
Written-answer marking has question-specific support reviews. The notification
centre is implemented in this working tree but awaits staging migration/live
checks. Payment integrations exist; their presence does not establish that a
complete paid-subscription journey is enabled.

There are no general administrator, school or teacher account screens in the
current product. Specialist support workflows are separate from learner views.
Internal content-processing code is not a public upload dashboard.

## Structure

```text
app/          App Router pages, layouts and server route handlers
components/   Shared UI and client providers
lib/          Domain logic, display helpers and server integrations
public/       Approved local illustrations, logos and static assets
prisma/       Data schema and migrations
docs/         Contributor guides and project records
```

Next.js 16, React 18, TypeScript and Tailwind CSS 3 provide the frontend.
Prisma/PostgreSQL store application data; Supabase supplies authentication.
Check [package.json](package.json) and the lockfile for installed versions.

## Rendering boundaries

- [app/layout.tsx](app/layout.tsx) owns global styles and root metadata.
- [ClientLayoutWrapper](app/ClientLayoutWrapper.tsx) composes navigation, the page-content landmark, footer and client contexts.
- Server pages load initial data where appropriate; client components handle interaction and browser state.
- API handlers live under [app/api/v1](app/api/v1). UI visibility never replaces server-side access checks.
- Shared metadata is defined in [lib/site-metadata.ts](lib/site-metadata.ts).
- Brand tokens live in [app/globals.css](app/globals.css) and [tailwind.config.js](tailwind.config.js); contextual icons live in [StudyBuddyIcon](components/StudyBuddyIcon.tsx).

Avoid nesting another `main` below the shared page-content landmark. Some
existing account/settings views still require that cleanup.

## Frontend areas

- [Landing](app/ClientLanding.tsx), About, Contact and footer-linked policy pages: public information.
- Login, sign-up, verification, age/guardian and recovery screens: account journeys with loading/error/success states.
- [Dashboard](app/dashboard): resume study, today's plan, weekly activity and focus topics.
- [Materials](app/materials): subject/topic browsing, practice and content-category entry points.
- [Exams](app/exams): category hub, templates, written/objective attempts and results.
- [Progress](app/progress): time/subject/topic filters, daily trends, next actions, goals and paginated mock history.
- [Chat](app/chat): persistent conversations, rendering and retry/delete interactions.
- [Profile](app/profile) and [Settings](app/settings): learner details, preferences and account management.
- [Marking reviews](app/marking-reviews): case status and question-specific decisions.
- [Notifications](app/notifications): review updates and read controls; not yet live-verified.

The shell switches product navigation at 1110px. Progress carousels switch to
grids at 769px. These are different decisions, not one universal mobile
breakpoint. Temporary design/audit routes are not current product features.

## Shared frontend helpers

- [Image](components/Image.tsx) and [optimized-image](lib/optimized-image.ts): responsive image delivery.
- [LowDataImage](components/LowDataImage.tsx): learner-triggered image loading when Low Data Mode is enabled.
- [ChatMarkdown](components/ChatMarkdown.tsx) and [markdown-math](lib/markdown-math.ts): Markdown, code and maths.
- [FormErrorMessage](components/FormErrorMessage.tsx) and [client-response-error](lib/client-response-error.ts): inline errors.
- [LocalDateTime](components/LocalDateTime.tsx): timestamp presentation.
- [Progress helpers](lib/progress/report.ts) and [dashboard types](app/dashboard/dashboard.types.ts): reporting semantics and UI types.
- [materials-display](lib/materials-display.ts): subject labels/order.

## Server and data responsibilities

Domain services handle authentication, account lifecycle, practice records,
exam marking/reviews, saved chat and payment integrations. The frontend consumes
bounded, learner-appropriate responses; it does not own access decisions,
credit accounting or authoritative grades.

The [Prisma schema](prisma/schema.prisma) is the model reference. Major groups
include accounts/settings, content/activity, exams/reviews, chat, notifications
and commercial records. Do not infer a released screen or populated catalogue
solely from a model's existence.

Use the [client API reference](app/api/v1/README.md) for contracts. Production
credentials, staff access and operational evidence belong in private channels.

## Verification

Start with the [README](README.md), [website guide](docs/WEBSITE_GUIDE.md),
[low-data rules](docs/PERFORMANCE_AND_LOW_DATA_RULEBOOK.md) and
[UI checklist](docs/DMCTN_UI_TASTE_GATE.md). Update feature claims when behaviour
changes; use synthetic records in examples/screenshots. Tests/builds do not
replace browser checks, accessibility review or deployment verification.
