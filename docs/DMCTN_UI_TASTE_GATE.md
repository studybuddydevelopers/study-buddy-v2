# Study Buddy frontend review checklist

Last updated: 12 November 2026 (accessibility checks).

This adapts the repository's UI taste-gate workflow to Study Buddy. It is a
review checklist, not a blanket accessibility/security certification. Use the
[website guide](WEBSITE_GUIDE.md) for implemented behaviour and the
[low-data rulebook](PERFORMANCE_AND_LOW_DATA_RULEBOOK.md) for engineering rules.
Use this checklist within the [frontend change process](FRONTEND_CHANGE_PROCESS.md),
which defines scope, Git ownership, documentation and release handoff.

## 1. Establish scope

- Inspect the actual route and shared components before proposing changes.
- Separate a request to audit/document from permission to change application code.
- Preserve other contributors' uncommitted work; do not stage, commit or deploy unless authorised.
- State expected behaviour and checkable acceptance criteria.
- Distinguish present-in-source, automatically tested and live-verified features.

## 2. Preserve approved design decisions

- Keep the SB brand mark and existing contextual icon system.
- Preserve the approved profile avatar and notification bell.
- Use the existing purple/neutral palettes and system fonts; do not add a new design system, glass effects or web fonts without a scoped request.
- Preserve complete illustrations rather than cropping them to fit a card.
- Do not reopen the finished icon rollout or recreate temporary audit routes.
- Read existing controls before replacing them: clarity and context matter more than making all icons identical.

## 3. Review layout and states

Check mobile first, then tablet and desktop. Useful widths are 320, 375, 425,
426, 634, 768, 769, 852, 1024, 1109, 1110 and 1440 CSS pixels.

- No page-level horizontal overflow, clipped text or unreachable actions.
- The 1110px navigation switch and the 769px progress-carousel switch remain distinct.
- The bottom navigation does not hide content or footer links; check device safe areas.
- Progress dots support keyboard activation as well as swipe navigation.
- Long names, empty lists, many results, small/large scores and long case references fit.
- Loading, success, empty, unavailable, validation-error and retry states are distinguishable.
- Pending actions cannot accidentally submit twice.
- Recovery/deletion pages remain legible with incomplete or unavailable links, without displaying real token values.
- Dark browser chrome does not obscure the white-backed SB favicon.
- Check zoom and the mobile on-screen keyboard, not only preset viewport screenshots.

## 4. Review accessibility and metadata

- One page-content main landmark, meaningful headings and descriptive page titles.
- Visible keyboard focus, sensible focus order and recovery after dialogs.
- First Tab exposes the skip link; activating it focuses the page-content main without traversing the header.
- Multi-select opens by keyboard, choices remain reachable, and Escape closes it and returns focus. Checkbox/radio cards and settings switches retain native keyboard behaviour.
- A button-styled navigation action is one link, not a button inside a link. Disabled/loading navigation does not follow its destination.
- Chat confirmation contains Tab/Shift+Tab focus, handles Escape only when idle, restores focus and keeps deletion errors inside the dialog. Recheck these if its controls change.
- Progress help works on hover and keyboard focus, dismisses with Escape and does not gain click-to-toggle behaviour. Daily activity data and carousel dots remain keyboard-reachable, with uniquely named regions.
- Labels for fields and icon-only controls; decorative graphics do not repeat adjacent text.
- Comfortable text and touch targets; colours and animation are not the only status cues.
- Readable inline errors and announced loading/save states.
- Reduced motion, 200% zoom and long content work without losing actions.
- Fade-in paragraphs remain visible with reduced motion; chat/practice scrolling does not force smooth movement in that mode.
- Tables, code and maths overflow inside their own containers.
- A page or its route-specific layout uses the shared metadata helper.
- Only intended public pages appear in the sitemap. Indexing directives do not secure private pages.
- Do not assert WCAG or Apple-guideline compliance solely because tokens, tests or screenshots look correct.

## 5. Run relevant checks

```bash
npm test
npm run test:browser
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

For a focused UI change, run the nearby tests first. Useful existing suites cover
metadata, auth form feedback, navbar state, account recovery/deletion views,
Markdown/maths, notification presentation and review detail pages. The
[accessibility safeguards](../components/Accessibility.test.tsx) and
[Button tests](../components/Button.test.tsx) cover source/static semantics and
selected handlers, not actual browser focus or screen-reader output. Tests named
`e2e` may use a mocked database; inspect their scope before calling them a real
browser or deployed end-to-end test.

The [repeatable browser suite](FRONTEND_CHANGE_PROCESS.md#repeatable-isolated-browser-regressions)
adds Chromium/WebKit axe and keyboard checks plus Chromium touch gestures with
synthetic data. Install its browsers once as documented there. It does not
exercise the Next server, real accounts or native screen-reader speech.

Also exercise the changed journey in a browser with keyboard navigation,
slow connectivity, failure states and reduced motion. Keep results tied to a
revision and viewport; do not re-use an old test count as current evidence.
For documentation-only edits, verify links/claims and report that no fresh
browser acceptance test was performed.
Record corrected bugs or UX regressions in the
[frontend history](FRONTEND_BUG_AND_FIX_HISTORY.md), with verification status.

### Manual assistive-technology and zoom acceptance

Status as of 12 November: **local actual-200% zoom checks passed; VoiceOver
user-verified for the pages checked; release acceptance pending**. See the
[verification follow-up](FRONTEND_BUG_AND_FIX_HISTORY.md#native-browser-zoom-and-user-voiceover-follow-up--12-november-2026)
for the exact local scope. The user's VoiceOver confirmation did not specify
routes, versions or individual scenarios, and the agent did not independently
verify spoken output. This does not mark every checklist item below complete.

Use an approved synthetic account on the exact staging candidate. Record the
revision, OS/browser, assistive-technology version, outcome and any defects in
restricted release evidence. Do not mark these complete from DOM assertions.

- With VoiceOver/Safari or NVDA/Firefox or Chrome, navigate by landmarks and
  headings. Confirm one main region, useful heading order and meaningful
  announcements when navigating between real Next routes.
- Reach the skip link using the platform's keyboard navigation. Check that it
  bypasses navigation, moves focus into main and leaves a visible focus indicator.
- Read field labels, required state, errors, switch state and password-control
  names. Open a multi-select, change choices and dismiss it without losing focus.
- Open chat deletion: confirm its name/description is spoken, background content
  is excluded and focus cannot escape. Verify cancel, pending, failure/retry and
  success against approved synthetic responses; no real learner chat is needed.
- Confirm progress-help text is available on focus and can be dismissed after
  hover. Navigate every carousel via dots and read its position without repeated
  announcements. Open daily data and verify dates/counts remain understandable
  independently of the visual graph.
- At actual 200% browser zoom and with increased text size, check readable copy,
  wrapping, reachable controls and no page-level horizontal scroll. Check the
  physical mobile keyboard, safe areas, touch swipe and reduced motion separately.
- Test the configured CAPTCHA and signed-in/error states outside the fixture.
  Ask content authors to approve equivalent mathematical diagram descriptions.

## 6. Record evidence safely

A public summary should contain scope, changed files, commands/checks run,
their result, and non-sensitive UI follow-up work. Use synthetic learners and
study content. Never attach real account screens, session cookies, personal
answers, recovery links, request headers, raw provider errors or internal
configuration. Follow [SECURITY.md](../SECURITY.md) for private reporting.

Do not run load, abuse, payment or security probes against deployed services as
part of ordinary visual verification. Use approved test environments and accounts.

## Current frontend follow-up

- The single-main landmark, skip link, labelled fields and keyboard controls have regression coverage; retain those checks for future changes.
- See the [12 November verification follow-up](FRONTEND_BUG_AND_FIX_HISTORY.md#native-browser-zoom-and-user-voiceover-follow-up--12-november-2026) for local actual-200% zoom results and user-reported VoiceOver verification. Exact staging-candidate journeys, route announcements, CAPTCHA, increased text size and physical-device keyboard/safe areas still need acceptance; NVDA was not tested. Neither zero automated violations nor the limited manual confirmation establishes site-wide certification.
- Meaningful question diagrams now have identification text, but equivalent descriptions of their mathematical content still require content-author review. A generic diagram label is not a full alternative.
- Component-specific text sizes, contrast, focus behaviour and touch targets need browser-level verification; the shared tokens are not a site-wide guarantee.
- Notifications are implemented but staging migration and authenticated live checks remain pending.
- Full offline operation is not implemented by Low Data Mode alone.
- Paid-subscription and source-backed-AI experiences must not be described as released based only on backend/UI scaffolding.

Keep security findings and deployment evidence in restricted tracking, not in
this public UI checklist. A pass applies only to the scope actually tested.
