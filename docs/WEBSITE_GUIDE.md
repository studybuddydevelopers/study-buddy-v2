# Study Buddy frontend guide

Last checked against the working tree: 1 November 2026.

This is the public contributor map for the website. It describes code in this
checkout, not a guarantee that every feature is deployed. Notifications are
implemented locally; staging migration and live verification remain pending.
Production access, credentials and operational procedures do not belong here.

## Start here

- [README](../README.md): overview and local setup.
- [Codebase breakdown](../CODEBASE_BREAKDOWN.md): responsibility boundaries.
- [Frontend change process](FRONTEND_CHANGE_PROCESS.md): scope, implementation, verification, documentation and staging-first handoff.
- [Performance and low-data rules](PERFORMANCE_AND_LOW_DATA_RULEBOOK.md): implementation requirements, not a declaration that every check has passed.
- [UI review checklist](DMCTN_UI_TASTE_GATE.md): responsive, accessibility and state checks.
- [Frontend bug and fix history](FRONTEND_BUG_AND_FIX_HISTORY.md): recovered reports, corrections, regression evidence and unresolved items.
- [AI experience guide](../AI_FEATURES_GUIDE.md): chat, rendering and marking.
- [Client API reference](../app/api/v1/README.md): integration contracts.

## Stack and shell

The frontend uses Next.js 16 App Router, React 18, TypeScript and Tailwind CSS 3.
Use [package.json](../package.json) and the lockfile for exact dependencies. Read
the installed Next.js guides under `node_modules/next/dist/docs/` before changing
framework conventions; do not assume older examples still apply.

- [app/layout.tsx](../app/layout.tsx) owns global styles, metadata and initial authentication state.
- [ClientLayoutWrapper](../app/ClientLayoutWrapper.tsx) composes the header, page-content `<main>`, footer and mobile navigation.
- [AuthStateProvider](../components/AuthStateProvider.tsx) synchronises the visible shell with login/logout. It is not an authorisation boundary.
- [NotificationProvider](../components/NotificationProvider.tsx) supplies the unread count.
- [app/loading.tsx](../app/loading.tsx) uses the SB equalizer loading animation.

Keep metadata in server pages/layouts. Use client components where interaction
requires them, and pass only the data a screen needs. Dynamic route params and
search params use the async conventions supported by this Next.js version.

The shell supplies the main landmark. New page content should use a `div`,
`section` or `article`, not another `main`. Some existing account/settings views
still need landmark cleanup; do not claim site-wide conformance from the shell alone.

## Navigation and responsive behaviour

- [NavBar](../components/NavBar.tsx) shows desktop product links at **1110px and wider**.
- Below 1110px, authenticated learners use the six-tab [BottomNav](../components/BottomNav.tsx): Home, Materials, Exams, Progress, Chat and Profile. Do not restore the legacy mobile menu.
- The approved profile SVG remains in both navigation variants. Settings is reached through Profile, not an extra bottom-nav tab.
- [NotificationBell](../components/NotificationBell.tsx) preserves the existing bell and opens the inbox on mobile and desktop. Unknown counts must not be presented as zero.
- The mobile bar includes the device safe area; the shell reserves footer clearance.
- [Footer](../components/Footer.tsx) uses two columns up to 768px and wrapping links from 769px.
- Root horizontal padding drops to **7.5px only at 320px or narrower**. This is not a blanket padding rule for nested cards.
- Home calls to action stack at 425px and below, becoming horizontal from 426px.

Test 320, 375, 425, 426, 634, 768, 769, 852, 1024, 1109, 1110 and 1440 CSS-pixel
viewports. These are regression checkpoints, not universal breakpoints. Also
check long text, browser zoom, the on-screen keyboard and safe-area spacing.

## Brand and shared UI

The approved small brand mark is **SB**, not the old cube. The home illustration
is a separate brand illustration, not a navigation logo. Preserve the approved
profile avatar and bell rather than applying a blanket icon swap.

- [LogoName](../components/LogoName.tsx): Study Buddy wordmark in `#6C3483`.
- [StudyBuddyIcon](../components/StudyBuddyIcon.tsx): contextual illustration-style SVG icons.
- [SbSequentialFillPreview](../components/SbSequentialFillPreview.tsx): despite its historical filename, named exports supply live SB animations. Equalizer/volume bars serve loading; login/signup use splash motion; reset-link error presentation uses diagonal brushing.
- [app/favicon.svg](../app/favicon.svg) and [public/logo-icon.svg](../public/logo-icon.svg): SB on rounded white backing.

The old Logo/LogoIcon components remain in source but are not the current
navigation implementation. Temporary icon-audit and logo-preview pages are not
current product routes; do not recreate them as shipped pages.

Use the existing palettes, not a new brighter purple:

- Brand/icon purple: `#6C3483`; illustration deep purple: `#3B2A56`.
- Icon lavender: `#E9E6ED`; warm brown: `#895033`; gold: `#F6CE46`.
- UI `primary-500`: `#6247AA`; UI `primary-700`: `#4A3480`.
- Background: `#FFFFFF`; foreground: `#171717`.

Brand colours and the UI primary scale are related but **not identical**.
[globals.css](../app/globals.css), [tailwind.config.js](../tailwind.config.js) and
the icon component are the source of truth. Preserve full SVG view boxes and use
containment when illustrations must not be cropped.

The system font stack avoids separate font downloads. At the default 16px root,
Tailwind `text-xs` is 15px and `text-sm` is 16px. Explicit component sizes can
differ; this is not a blanket minimum-size or accessibility guarantee. Prefer
comfortable text, visible focus indicators and 44px interaction targets.

Reuse the existing Button, form, Card, Badge, ProgressBar, heading/text components,
[FormErrorMessage](../components/FormErrorMessage.tsx),
[LocalDateTime](../components/LocalDateTime.tsx) and
[PolicyDocumentPage](../components/PolicyDocumentPage.tsx).
Icon-only controls need accessible names; decorative images should not repeat adjacent text.

## Page map and behaviour

### Public information and account journeys

[The landing page](../app/ClientLanding.tsx) has an illustrated hero and uncropped,
alternating feature rows. About and Contact introduce the product and support.
The footer links to Privacy, Terms, Refunds, Student Privacy, AI Safety, Cookies,
Accessibility and Content Policy. Do not claim official WAEC affiliation,
guaranteed grades or licensed content solely because a route or illustration exists.

Login/signup use inline errors, not browser `alert()` popups. Account journeys
include email verification, age/guardian decisions, password reset, security
alert/recovery, deletion confirmation, deactivation and deletion-pending views.
Provide distinct checking, incomplete-link, working, success and failure states.
Never include a real recovery URL or token in screenshots or public examples.

### Dashboard

[DashboardClient](../app/dashboard/DashboardClient.tsx) presents continuation,
today's tasks, weekly activity and focus topics. Its
[server page](../app/dashboard/page.tsx) loads current-user data and the dashboard
summary; it does not generate AI recommendations on every visit. Resume choices
can incorporate local practice drafts.

### Materials and practice

[MaterialsClient](../app/materials/MaterialsClient.tsx) provides featured entry
points and subject/topic navigation. Routes include past questions, flashcards,
textbooks and topic practice. Route existence does not establish that a content
catalogue is populated or approved for publication.
[TopicPracticeClient](../app/materials/practice/[topicId]/TopicPracticeClient.tsx)
handles practice, feedback and drafts. Preserve pagination and low-data preferences.

### Mock exams, marking and reviews

[MockExamsHub](../app/exams/MockExamsHub.tsx) groups sessions into Full WAEC Mock
Exam, Quick Practice, Standard Practice and Exam Readiness Practice. Each opens
a category page before the selected attempt. Current template choices are
Mathematics-focused; do not imply equivalent papers exist for every subject.

[ExamInstanceClient](../app/exams/ExamInstanceClient.tsx) handles answers, saving,
submission and results. Written Paper 2 requires **5 AI credits per new attempt**,
including a repeat of the same template. Use server-supplied availability/balance;
the browser must not decide credit accounting or promise successful admission.

[MarkingReviewPanel](../app/exams/MarkingReviewPanel.tsx) reports a specific answer
without asking the learner to re-enter the question. `/marking-reviews` lists
cases; `/marking-reviews/[id]` shows the question, submitted answer, original/current
marks and support decision, with an exact-answer link into the paper. These are
practice marks, not official examination grades.

### Progress

[ProgressClient](../app/progress/ProgressClient.tsx) separates coverage, practice
accuracy and mock performance. An attempt is not mastery. Multiple next actions
can be shown, with evidence requirements for weak-topic recommendations.

- Range controls use **Last [7] [30] [90] days** with calendar-style links.
- Subject/topic filters and mock-history pagination are preserved in the URL.
- Trend data has one point per day, not multi-day bars. The responsive chart
  shows activity and has a data alternative; daily grouping uses UTC.
- Honest overview, Recommended next actions and Subject goals use swipeable
  cards **below 769px**, with centred keyboard-reachable dot controls and no arrows.
  Wider screens use grids.
- Mock results use a compact mobile list below 769px and a table above it.
- No-data, insufficient-evidence and request-failure states are distinct.

### Profile and settings

[Profile](../app/profile/page.tsx) shows study/account details, plan/credits and
a centred mobile avatar with fitted white backing. Edit profile is a primary
action; All settings is separate from Quick actions.

`/settings` links to profile details, study preferences and account management.
Profile-origin links use `from=profile` so child screens say **Back to profile**;
otherwise they return to Settings. There is no additional Password and security
card in the current settings hub.

### Chat

[ChatClient](../app/chat/ChatClient.tsx) is a saved-chat experience with thread
selection, title editing, history, generation status, retry and deletion
confirmation. It is not the legacy stateless quick-chat endpoint. Save/delete
use familiar white pencil/bin icons.

[ChatMarkdown](../components/ChatMarkdown.tsx) uses Streamdown, KaTeX and syntax
highlighting, with [math normalisation](../lib/markdown-math.ts). Keep formulas,
code and tables readable on small screens. Handling incomplete Markdown does
not imply token-streamed transport: the current renderer uses static mode and
the client waits for message responses. See the [AI guide](../AI_FEATURES_GUIDE.md).

### Notifications

The locally implemented [inbox](../app/notifications/NotificationsClient.tsx)
has pagination, refresh, read/unread actions and bulk read marking. Opening a
decision marks its notification read after mounting, not during link prefetch.
Save failures are retryable. Decisions include both upheld and adjusted marks;
copy must describe decreases honestly too.

The bell refreshes on visible-page entry/focus and periodically while visible.
This is in-app notification delivery, not browser push or email. Preserve its
**pending staging verification** status in release notes.

## Metadata, accessibility and verification

Use [createPageMetadata](../lib/site-metadata.ts) for titles/descriptions and
matching social metadata. A page or its route-specific layout owns this metadata.
Public pages are listed in the sitemap; account/product pages use non-indexing
metadata. Robots directives are indexing hints, **not access control**.

Check focus order, headings/landmarks, labels, contrast, zoom, reduced motion
and error announcements. Do not claim WCAG or Apple-guideline conformance without
an appropriately scoped review. The [UI checklist](DMCTN_UI_TASTE_GATE.md) separates
automated checks from browser evidence and records frontend follow-up work.
