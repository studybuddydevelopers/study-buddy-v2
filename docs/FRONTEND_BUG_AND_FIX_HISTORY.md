# Frontend bug and fix history

Last reviewed: 1 November 2026.

This register collects recoverable frontend bug reports, regressions and UX
corrections from the project conversation, reachable Git history and current
source. Related iterations are grouped into one incident. It is not a claim
that every unrecorded report has been recovered, or that every historical fix
has been retested on the deployed site.

This is public documentation. It contains no live account evidence, recovery
links, credentials, private infrastructure details or instructions for exploiting
security weaknesses. Security-sensitive findings belong in private tracking;
follow [SECURITY.md](../SECURITY.md).

## Reading the statuses

- **Corrected in source:** the referenced implementation contains the correction.
  This does not establish browser acceptance or deployment.
- **UX change:** an accepted design or usability change, not necessarily a
  software defect. Do not undo it merely because it was not a bug.
- **Partial:** an earlier fix exists, but related work remains.
- **Retired preview:** an experiment is no longer a product route; retirement
  does not prove its rendering defect was fixed.
- **Unverified:** the report is retained, but its cause or successful correction
  has not been established here.

Short commit IDs are evidence available through `git show <commit>`. They are
not release identifiers. Test links identify coverage, not browser screenshots
or production evidence. Where a cause was not established, this register does
not invent one from a similar-looking commit.

## Shared shell, accessibility and navigation

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-001 | The root main landmark included site chrome, while child pages added another main. | The shell now scopes main to page content; chat, contact and policy duplicates were removed (`a5439ca`, `18cf3c3`, `283bbdd`, `5f4faea`, `88ab907`). See [ClientLayoutWrapper](../app/ClientLayoutWrapper.tsx). Profile and several settings/account views still contain nested main landmarks. | Partial; remaining cleanup open |
| FE-002 | Core pages shared generic browser titles or lacked individual descriptions. | Shared metadata policy and page/route-layout metadata were added and refined (`9cdb106`, `cf4a39f`, `131a885`). [Coverage](../app/metadata-coverage.test.ts) and [crawler tests](../app/metadata-routes.test.ts) check adoption and public-route rules, not editorial quality or access control. | Corrected in source |
| FE-003 | Login and signup errors used disruptive browser alerts. | Inline form feedback replaced alerts (`3eecd1c`, `4ac62fe`, `5580d83`). [FormErrorMessage](../components/FormErrorMessage.tsx) and [auth feedback tests](../app/auth-form-feedback.test.ts) cover the shared treatment. | Corrected in source |
| FE-004 | Login/logout and account-state changes could leave navigation showing the previous authentication state. | Shared live authentication state, explicit updates and route refreshes were introduced (`9c5c157`, `a8954bb`, `6dd7360`, `4bde397`, `bb69391`). [Navbar tests](../app/navbar-auth-state.test.ts) cover the source integration. | Corrected in source |
| FE-005 | Desktop navigation became cramped before the old 768px mobile switch; the legacy mobile menu duplicated navigation. | [NavBar](../components/NavBar.tsx) switches at 1110px, the legacy toggle was removed, and approved icons were added to desktop links (`7706ac3`, `c476407`). The existing profile icon and bell are preserved. | UX change implemented |
| FE-006 | Bottom navigation obscured footer links/content and did not adequately reserve the mobile safe area. | Footer clearance and safe-area handling were adjusted (`91c3304`, `a6a742a`); [BottomNav](../components/BottomNav.tsx) and the shell share that layout responsibility. Mobile navigation accessibility was also revised (`90d359c`). | Corrected in source; device check still needed |
| FE-007 | Footer links were awkwardly arranged on narrow screens; a fully vertical footer then became too long. | Responsive links were revised and later compressed (`831d8f8`, `502e88e`, `16e1910`). The current [Footer](../components/Footer.tsx) uses two columns through 768px and wrapping links from 769px. The compact version supersedes the earlier vertical-only request. | UX change implemented |
| FE-008 | Footer-linked policy/account content needed to fit 320px screens; the guardian page had mobile overflow. | The shared [PolicyDocumentPage](../components/PolicyDocumentPage.tsx), footer links and guardian layout were adjusted (`992756f`, `502e88e`, `851d547`). No claim is made that every page has passed a fresh 320px browser audit. | Corrected in source for identified layouts |
| FE-009 | A request for 7.5px narrow-screen gutters was initially applied at every width. | `0b29a9b` corrected `8e0ea14`: [root layout](../app/layout.tsx) applies 7.5px horizontal padding only at 320px or below, retaining normal padding elsewhere. | Corrected in source |
| FE-010 | Small labels and microcopy were difficult to read. | Font tokens, mobile navigation, dashboard microcopy, multi-select options and code labels were enlarged (`13cc5a9`, `087af8b`, `1011607`, `c63a6db`, `81a17a1`). [Tailwind tokens](../tailwind.config.js) make text-xs 15px and text-sm 16px at a 16px root; explicit component/chart sizes still differ. | Corrected in source for targeted text; not a site-wide size guarantee |
| FE-011 | Progress bars lacked accessible value semantics and could render out-of-range fill widths. | [ProgressBar](../components/ProgressBar.tsx) supplies a labelled progressbar and clamps values (`6049c92`); [tests](../components/ProgressBar.test.tsx) cover values below zero and above 100. | Corrected in source |
| FE-012 | An inverted preferred-colour-scheme override could darken a light interface inconsistently. | `4aaf22b` removed the incorrect override and explicitly selected the current light scheme in [globals.css](../app/globals.css). This is not implementation of a complete dark theme. | Corrected in source |

## Branding, SVGs and public-page layout

These entries include accepted visual corrections. The icon rollout is complete;
this register is not a new proposal or approval queue.

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-013 | Home feature illustrations were cropped inside the Why Choose Study Buddy cards. | [ClientLanding](../app/ClientLanding.tsx) uses uncropped illustrations and alternating horizontal feature rows (`2051ae4`, `fdb8fcd`). Preserve the SVG view boxes and containment. | Corrected in source |
| FE-014 | Get started and Learn more needed to stack on small phones. | The [home CTA group](../app/ClientLanding.tsx) is vertical through 425px and becomes a row from 426px. This records the accepted breakpoint rather than a generic mobile assumption. | UX change implemented |
| FE-015 | Updated illustrations, avatars and brand marks had missing or outdated asset references. | Local SVGs and references were corrected (`f93b68c`, `029bc5e`, `b4384a4`, `faaf79e`, `99b9704`, `a3defd2`, `d742175`). Current assets live in [public/images](../public/images); a path fix does not prove all deployed caches were refreshed. | Corrected in source |
| FE-016 | Proposed illustrations were too bright or did not match the approved main illustration; the wordmark needed the agreed purple. | The approved wordmark uses #6C3483 (`693d7db`), and illustration/icon colours were aligned with the existing palette. See [LogoName](../components/LogoName.tsx), [StudyBuddyIcon](../components/StudyBuddyIcon.tsx) and the [brand guide](WEBSITE_GUIDE.md#brand-and-shared-ui). UI primary colours are intentionally not identical to every illustration colour. | UX change implemented |
| FE-017 | Profile icon variants, background colour and placement were inconsistent. | The approved local [profile avatar](../public/images/profile-avatar.svg) is used in the profile and both navigation variants (`d23633b`, `0b88397`, `40486b0`, `2d8b64f`). White backing is retained; later mobile centring is tracked separately in FE-048. | UX change implemented |
| FE-018 | The browser-tab mark needed a visible white background with rounded edges. | The [favicon](../app/favicon.svg) and [public logo icon](../public/logo-icon.svg) have rounded white backing (`b81d503`). Browser favicon caching must be considered during visual verification. | UX change implemented |
| FE-019 | Several icons did not suit their context; About layouts were enlarged when only horizontal arrangement was requested. | Contextual icons and About/Contact/materials usage were revised (`741c451`, `f36673f`, `d94196f`, `7fdf3c0`, `48fa411`, `4f2824d`). About layout iterations restored the intended proportions and left-to-right principles (`5eb84c8`, `ec6b143`, `692ac90`, `28296a7`). See [About](../app/about-us/page.tsx) and the shared icon component. These were design corrections, not evidence that every previous icon was defective. | UX change implemented |
| FE-020 | The proposed handwriting loader restarted at B, left pale gaps in B, coloured B while finishing S, or spread across several parts of B at once. | The [experimental renderer](../components/SbSequentialFillPreview.tsx) contains segmented masks/clips, but no complete visual acceptance record for the requested continuous trace was recovered. Production loading adopted volume bars; authentication uses splash and reset-error presentation uses diagonal brush motion. Do not claim the handwriting experiment was perfected. | Retired preview; original trace acceptance unverified |
| FE-021 | The SB volume-bar proposal was reported as not animating. | The current [equalizer component](../components/SbSequentialFillPreview.tsx) has a requestAnimationFrame loop and intentionally stops motion when reduced motion is requested. Bar-height rounding was also corrected (`60950e3`), but that commit is not proof of the cause of the original animation report. | Unverified original cause; current browser motion check needed |
| FE-022 | Temporary logo, cube-usage and icon-audit pages remained after design decisions were complete. | Those routes and the audit asset endpoint were removed, with metadata cleanup (`1a164eb`, `e36f28d`, `c0b1247`, `951ead4`, `f006c1e`, `442dec8`). Live named exports in the historically named SVG component remain intentional. | Corrected in source; previews retired |

## Chat rendering and interaction

The [AI issue register](AI_BUG_AND_FIX_HISTORY.md) owns the deeper AI lifecycle
history. This section records its frontend impact without copying model-quality
claims or sensitive evidence.

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-023 | LaTeX, including set union and intersection commands, appeared as raw text. | Shared maths normalization and KaTeX rendering were introduced and refined (`cb02eb0`, `a0e9bef`, `8b05be2`). [Math tests](../lib/markdown-math.test.ts) and [renderer tests](../components/ChatMarkdown.test.ts) cover representative notation. | Corrected in source for covered formats |
| FE-024 | Mixed escaped Markdown/math produced broken lists, duplicate equations, visible assistive maths or partially rendered expressions. | Normalization, duplicate-display styling and Streamdown-based rendering were added (`bc90a19`, `a578c51`, `da74837`, `f265663`, `c3753ad`). See [ChatMarkdown](../components/ChatMarkdown.tsx) and [globals.css](../app/globals.css). Arbitrarily malformed generated text is not guaranteed to be repairable; static rendering is not token streaming. | Corrected in source for covered cases; regression risk remains |
| FE-025 | Chat tables had weak borders, while wide tables/code and small code labels were hard to read. | Table styling, bounded horizontal scrolling and label sizing were revised (`a7e9f1c`, `a667c22`, `81a17a1`). The current [renderer](../components/ChatMarkdown.tsx) includes scrollable tables and copyable code blocks. | Corrected in source; narrow-screen browser check needed |
| FE-026 | AI/avatar sizes were alternately hard to see or large enough to disrupt bubbles and narrow layouts. | Avatar assets, fixed sizing and message constraints were revised (`37f8a7e`, `8ed7b36`, `f93b68c`). See [ChatMessage](../components/ChatMessage.tsx) and [ChatMessageContainer](../components/ChatMessageContainer.tsx); different contexts need not have identical sizes. | Corrected in source for current layouts |
| FE-027 | Pending/failed replies were disconnected from the assistant turn or exposed technical-looking error copy. | Status-aware messages, retry presentation and learner-facing failure copy were added (`740a3b7`, `7f80623`, `7cf1733`). [Failure-copy tests](../components/chatFailureCopy.test.ts) cover the displayed messages. | Corrected in source |
| FE-028 | Saved turns could reorder after refresh, and a failed send could lose the request reference needed for retry. | Client ordering/state and request metadata were corrected (`95fa0b3`, `84d0328`). See [ChatClient](../app/chat/ChatClient.tsx) and [chat service coverage](../lib/ai/chats/chat-service.test.ts). Retry reuses the existing turn rather than intentionally creating another question. | Corrected in source; refresh/retry browser journey still relevant |
| FE-029 | Decorative title-save/delete icons were less clear than the requested familiar controls. | White pencil and normal bin icons replaced those action icons (`df9cce0`) in [ChatClient](../app/chat/ChatClient.tsx). This does not reopen the approved site-wide icon rollout. | UX change implemented |

## Progress and dashboard reporting

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-030 | Progress wording could imply that attempting a question established mastery. | Terminology and the report presentation were revised (`78344a9`, `e4e4ab3`). [ProgressClient](../app/progress/ProgressClient.tsx) separates coverage, accuracy and mock performance, with evidence-gated next actions and prominent subject goals. | UX/accuracy correction implemented |
| FE-031 | Progress had limited date/filter context, and the 7/30/90-day buttons wrapped or crowded each other around intermediate widths such as 634px. | Reporting filters and responsive controls were introduced/refined (`a22779e`, `4c8b180`, `e0301b0`, `fbf3357`, `e85f176`). Current controls read Last, calendar-style 7/30/90 links, then days. [Report tests](../lib/progress/report.test.ts) cover the supported ranges. | Corrected in source; viewport acceptance still needed |
| FE-032 | The help explanation opened on click when hover-only presentation was requested. | Click/focus-open behaviour was removed (`1f32dcb`, `1a9048c`). The [current progress help](../app/progress/ProgressClient.tsx) uses hover presentation and an accessible label; this requested interaction is not a blanket accessibility-conformance claim. | UX change implemented |
| FE-033 | Trend bars represented multi-day groups even though the learner expected one day per point; empty copy mentioned active time groups. | Daily grouping and wording were corrected (`a636fd8`, `f868bb2`). [Report tests](../lib/progress/report.test.ts) assert 7, 30 and 90 daily points with missing days represented. | Corrected in source |
| FE-034 | Too many daily bars became unreadable on narrow screens and long ranges. | A responsive activity chart replaced the dense bar presentation (`6b8fd7d`), with separate mock indicators and a data alternative in [ProgressClient](../app/progress/ProgressClient.tsx). It retains daily data rather than silently returning to multi-day buckets. | Corrected in source; chart browser check needed |
| FE-035 | Recommended actions were cramped around 768px; later swipe navigation extended beyond the requested width and included unwanted arrows. | Swipe is limited to below 769px (`7270740`), centred dots replaced arrows (`7d14243`), and overview/subject goals adopted the same small-screen treatment (`fbc8193`, `c8ccfd1`). Wider screens return to grids; the next-action grid remains one column until its larger breakpoint. | UX change implemented |
| FE-036 | The WAEC mock-results table was difficult to read on mobile. | Compact result cards/list rows replace the table below 769px (`a894dd8`); larger screens retain the table. Links to marked papers were added (`b485a3f`) in [ProgressClient](../app/progress/ProgressClient.tsx). | Corrected in source |
| FE-037 | Written-paper percentages used question count instead of total marks, and dashboard continuation counted all offered questions rather than required answers. | Display-data calculations were corrected (`a9dc84e`, `099e477`). See [progress report](../app/api/v1/progress/full-report/route.ts) and [dashboard summary](../app/api/v1/dashboard/stats/route.ts). These are backend corrections with visible frontend impact. | Corrected in source |
| FE-038 | AI activity could show zero threads after a saved chat had started. | The summary includes started persistent chats as well as legacy threads (`d25bf6c`); [AI activity tests](../lib/progress/ai-activity.test.ts) cover the calculation. | Corrected in source |

## Exam selection, results and review navigation

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-039 | Three practice-template cards per row compressed their contents; two columns were still too narrow around 852px. | The grid was limited and its two-column breakpoint moved to lg (`aa84ec9`, `2a93031`). [MockExamsClient](../app/exams/MockExamsClient.tsx) now stacks cards at those intermediate widths. | Corrected in source |
| FE-040 | Full papers and short practice templates were mixed together without a clear starting choice. | Templates were organised by intent and the four-category [exam hub](../app/exams/MockExamsHub.tsx) was introduced (`750f8a7`, `92079f4`, `5485260`, `90de979`). This was an information-architecture improvement rather than a grading bug. | UX change implemented |
| FE-041 | A learner could reach written-paper start without clear credit eligibility, and copy did not clearly explain the recurring cost. | Templates expose eligibility, blocked reasons and balance; unavailable starts are disabled (`a2de479`). Copy states 5 AI credits per new attempt, including repeats (`7b0ccc7`). Same-attempt marking retries reuse the reservation (`009291b`); see the [AI register](AI_BUG_AND_FIX_HISTORY.md#ai-assisted-written-marking) for lifecycle evidence. | Corrected in source; live credit journey separate |
| FE-042 | Reporting an incorrect mark depended on email and made the learner restate the question; there was no tracked status. | Question-level [MarkingReviewPanel](../app/exams/MarkingReviewPanel.tsx), case references/status and support decisions replaced the email-only flow (`673c48b`, `10a7128`, `d88df64`, `9c80c2e`). | UX limitation addressed in source |
| FE-043 | Review navigation did not lead directly to the individual decision and exact exam answer; the bell previously lacked a real inbox. | Individual case pages, answer anchors and in-app decision notifications were added (`a9962fa`, `78373b9`, `46d51e5`, `4787a31`, `5b28a42`, `a66c215`). [Review-page tests](../app/marking-reviews/[id]/page.test.tsx) and [notification tests](../app/notifications/NotificationsClient.test.tsx) cover presentation. Unknown unread counts are not shown as zero. | UX limitation addressed in source; migration/live acceptance unverified here |
| FE-044 | Exam start/save timestamps relied on direct locale formatting in rendering. | [LocalDateTime](../components/LocalDateTime.tsx) and the shared time formatter were adopted (`b83af55`). This records the formatting correction, not a proven explanation for every historical hydration error. | Corrected in source |
| FE-045 | Exam/practice route parameters and server-page session forwarding were incompatible with framework expectations in earlier implementations. | Async params and server fetch handling were corrected (`a9a73f7`, `64b3eb7`, `862fe00`, `6e79a59`, `9710359`). Current [exam page](../app/exams/[instanceId]/page.tsx) awaits its params. Do not assume these old fixes explain the separate later outage report in FE-059. | Corrected in source for identified compatibility issues |

## Profile and settings

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-046 | Study preferences opened from Profile still offered Back to settings, confusing the return journey. | Profile-origin links carry `from=profile`; [study preferences](../app/settings/study-preferences/page.tsx) chooses Back to profile or Back to settings accordingly (`1645fa9`, `8562294`). Profile editing also preserves the origin. | Corrected in source |
| FE-047 | Edit profile was duplicated in Quick actions; All settings was misclassified as a quick action; the password/security entry was confusing for signed-in users. | [Profile](../app/profile/page.tsx) keeps edit/settings navigation separate from focused quick actions; the [settings hub](../app/settings/SettingsClient.tsx) contains Profile details, Study preferences and Account management (`7f5da23`, `7eea3f0`, `31b9d2d`). There is no extra password/security card or seventh mobile-nav tab. | UX change implemented |
| FE-048 | On mobile, the profile avatar's white backing was too wide and the avatar was not screen-centred. | The [profile header](../app/profile/page.tsx) uses fitted backing and mobile self-centering, with separate wider-screen alignment (`7f5da23`). | Corrected in source; mobile screenshot acceptance still needed |

## Account confirmation, recovery and deletion screens

Only user-visible behaviour is recorded here. Real links, tokens, account
identities, provider restrictions and privileged recovery procedures must not
be attached to this public register.

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-049 | The reset-alert page did not clearly place the mobile secure/lock action inside its red warning card; a redundant No action needed control remained. | Alert hierarchy and states were redesigned (`d897f1b`, `781b124`), then mobile actions were moved into the warning card and the redundant mobile control hidden (`54110b4`). [Alert tests](../app/account-security/password-reset-alert/PasswordResetAlertClient.test.tsx) cover presentation. | Corrected in source |
| FE-050 | On mobile, a blocked secure/lock action gave no useful route to the incomplete-link explanation below. | Explanatory disabled-button support and mobile focus/scroll guidance were added (`1c70bdb`, `0fcbaac`). The [alert component](../app/account-security/password-reset-alert/PasswordResetAlertClient.tsx) distinguishes missing-link guidance from an in-flight action; [Button tests](../components/Button.test.tsx) cover the shared control. | Corrected in source; mobile interaction check still needed |
| FE-051 | Locked-account recovery needed clearer consequences, progress states and next steps on mobile. | The [recovery client](../app/account-security/password-reset-recovery/PasswordResetRecoveryClient.tsx) was redesigned (`868d66e`) with checking, incomplete-link, pending, error and email-sent guidance. [Tests](../app/account-security/password-reset-recovery/PasswordResetRecoveryClient.test.tsx) check initial and completed presentation. | UX change implemented |
| FE-052 | Deletion confirmation needed clearer consent, cancellation/deadline guidance and a narrow-screen layout; an email failure must not imply the deletion request failed. | [Confirmation UI](../app/account-deletion/confirm/AccountDeletionConfirmationClient.tsx) was revised (`0cc1077`, `ea8e7c9`); [tests](../app/account-deletion/confirm/AccountDeletionConfirmationClient.test.tsx) cover explanation, result and email-warning states. | Corrected in source |
| FE-053 | Deletion-pending presentation did not clearly separate a reversible request from processing, and loading feedback could be ambiguous. | [AccountLifecycleStatus](../components/AccountLifecycleStatus.tsx) was revised (`fb9958a`); [tests](../components/AccountLifecycleStatus.test.tsx) cover checking, cancellation availability, missing dates and action-specific loading. | Corrected in source |
| FE-054 | Email confirmation, password recovery and login return destinations needed correction and clearer error handling. | Callback/navigation handling was revised (`85a6d29`, `c36200b`, `d685c9f`, `dfdc968`, `953f1ab`). Current [confirmation](../app/auth/confirm/route.test.ts) and [reset](../app/auth/password-reset/route.test.ts) tests cover routing behaviour; real email delivery remains separate acceptance work. | Corrected in source for covered flows |

## Other recovered corrections and unresolved reports

| ID | Reported problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| FE-055 | Topic-practice client state was not explicitly reset by topic identity on navigation. | The [topic page](../app/materials/practice/[topicId]/page.tsx) keys TopicPracticeClient by topic ID (`f6b0320`). The diff establishes the remount correction; no original browser reproduction was recovered. | Corrected in source; original symptom not independently reproduced |
| FE-056 | Heavy links, question lists and images could download more than the learner needed on low-bandwidth connections. | Selective no-prefetch links, question pagination, responsive images and explicit Load image behaviour were introduced (`b4dcc00`, `c7b77aa`, `0af2fe8`, `e05823b`, `3596458`, `65c7634`, `ee6fd0e`). See the [low-data rulebook](PERFORMANCE_AND_LOW_DATA_RULEBOOK.md). These improvements do not establish measured savings or complete offline support. | Performance/UX limitation addressed in source |
| FE-057 | Learner-facing labels and display contracts were inconsistent: dashboard types used waecYear instead of examYear, and materials/past-question descriptions needed clarification. | The type field and learning-page wording were aligned (`8baab2b`, `7b85f90`, `9175183`, `87411f7`, `ec9eace`). See [dashboard types](../app/dashboard/dashboard.types.ts) and [materials](../app/materials/page.tsx). Page existence does not prove licensed or populated learning content. | Corrected in source |
| FE-058 | Frontend documentation described stale routes, generic icons/fonts, missing chat scrolling and overly broad accessibility completion. | The 1 November documentation update reconciled the [website guide](WEBSITE_GUIDE.md), [README](../README.md), codebase/AI guides, API reference and UI checklist with source. Existing chat scroll areas are acknowledged; remaining nested landmarks and unverified releases are explicit. | Documentation corrected; application follow-ups remain |
| FE-059 | Progress reported that stats could not load even after refresh/sign-in, and mock exams could not start. | The user report is retained. No single confirmed cause or end-to-end corrective result was recovered that can safely be assigned to this specific incident. Earlier route, error-handling or schema-related work must not be treated as proof that this report was resolved. | Unverified; requires controlled authenticated reproduction if it recurs |
| FE-060 | An earlier client-side framework/global-error exception was reported. | The [deployment/security history](DEPLOYMENT_SECURITY_FIX_HISTORY.md#open-or-not-independently-verified) also retains this as unverified. No reliable reproduction and corresponding accepted correction were found here. Capture non-sensitive route/browser/build context; keep raw diagnostics private. | Unverified; no speculative fix recorded |

## Verification recorded for this documentation update

On 1 November 2026, **76 tests passed across 20 targeted test files** in the
working tree. These cover metadata/crawler rules, navbar authentication state,
inline form errors, shared buttons/progress bars, Markdown/maths/failure copy,
reset alert/recovery, deletion confirmation/pending views, progress calculations,
AI activity, notifications and individual review-page presentation.

This was a local Vitest run using Node/source inspection, static rendering and
mocks where applicable. It did **not** verify browser swiping, visual clipping,
animation, real account emails, live credit accounting, production availability,
notification deployment, or full accessibility conformance. Callback/service
tests linked elsewhere in the register were not all rerun in this focused set.
No application fixes were implemented while writing this history.

## Remaining acceptance work

- Finish FE-001's remaining nested-landmark cleanup.
- Check the current SB loader in a browser for FE-021, including reduced motion;
  do not revive the retired handwriting preview to resolve this entry.
- Retain FE-059 and FE-060 as unverified until there is a controlled reproduction
  or credible corrective evidence. Neither is a claim of an ongoing live outage.
- Use the [UI checklist](DMCTN_UI_TASTE_GATE.md) for current 320px-through-desktop,
  keyboard, zoom, long-content, failure-state and device-safe-area checks.
- Verify notifications and review navigation in the intended release environment
  before recording them as live-accepted. Documentation presence is not migration
  evidence.

## Keeping the history current

Use the [frontend change process](FRONTEND_CHANGE_PROCESS.md) when implementing
or verifying a correction, then update this register as part of the handoff.

For each new frontend issue, use the next `FE-*` identifier and record:

1. The learner-visible symptom, affected page/component and date first observed
   when known. Do not infer a report date from a commit date.
2. Whether it is a defect, regression, design correction or missing capability.
3. The established cause, or explicitly say that it is not yet known.
4. The corrective source/test/commit and what changed for the learner.
5. Separate source, automated-test, browser and deployment acceptance status.
6. Remaining limitations or follow-up. If an issue returns, append the recurrence
   rather than erasing its earlier history.

Use synthetic screenshots and sample study content. Keep private diagnostics,
account information and security-sensitive reproduction details out of Git.
Cross-link the [AI history](AI_BUG_AND_FIX_HISTORY.md) or
[deployment/security history](DEPLOYMENT_SECURITY_FIX_HISTORY.md) when they own
the underlying cause instead of duplicating or contradicting their records.
