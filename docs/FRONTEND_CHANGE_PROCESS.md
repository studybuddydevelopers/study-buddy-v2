# Frontend change process

Last reviewed: 1 November 2026.

Use this process whenever a change affects Study Buddy's pages, components,
styles, SVGs, illustrations, fonts, navigation, responsive behaviour, metadata,
accessibility, browser state, client/API integration or frontend documentation.
It applies to new features, bug fixes, refactors, copy changes and removals.

This is the frontend-specific process, not permission to deploy or bypass the
[deployment/security process](DEPLOYMENT_SECURITY_CHANGE_PROCESS.md). Changes
to AI behaviour, marking, costs or AI claims also follow the
[AI change process](AI_CHANGE_PROCESS.md). Keep sensitive evidence and release
approvals in restricted tracking, following [SECURITY.md](../SECURITY.md).

## 1. Establish the request and success criteria

1. Identify the learner-visible outcome, affected routes/components and explicit
   exclusions. Distinguish a bug, requested design change and missing feature.
2. For a bug, capture expected versus actual behaviour using synthetic data.
   Check the [frontend issue history](FRONTEND_BUG_AND_FIX_HISTORY.md) before
   treating it as new. Record an unknown cause honestly.
3. Define observable acceptance checks: which layout, interaction, content and
   failure states must change, and which must remain unchanged.
4. Identify data, account, privacy, accessibility and API implications. An
   account or payment button can be security-sensitive despite a small diff.
5. Record the change owner, review needs and verification plan under the parent
   process. Routine changes need proportionate review; sensitive changes need
   its additional reviewer and release controls.

An explanation, audit or documentation request does not authorise application
changes. Resolve material scope or product choices before implementing them;
do not reopen settled design decisions for an unrelated fix.

## 2. Inspect the implementation and coordinate Git work

- Read [AGENTS.md](../AGENTS.md), the [website guide](WEBSITE_GUIDE.md), relevant
  issue-history entries and the installed Next.js guides under
  `node_modules/next/dist/docs/`. Check package versions in
  [package.json](../package.json), not remembered framework conventions.
- Trace shared components to their consumers. A Button, image, font, colour,
  navigation or layout change can affect many pages, not just the reported one.
- Inspect current branch, worktree and concurrent work before editing. Do not
  overwrite, stage or roll back another contributor's changes.
- The requested implementation workflow is **feature branch → staging →
  separately approved production release**. Use an agreed feature branch based
  on the intended staging baseline; do not implement directly on staging or a
  production branch. Coordinate branch changes when the workspace is shared or
  dirty; do not switch it underneath another task.
- The user currently handles Git staging and commits unless explicitly
  delegated. If asked, provide per-file staging/commit guidance. Do not infer
  permission to commit, merge, push, migrate or deploy from permission to edit.

Writing or updating this process does not itself require a branch switch or
authorise any of those Git/deployment operations.

## 3. Preserve the approved UI and implementation boundaries

Use the [website guide](WEBSITE_GUIDE.md#brand-and-shared-ui) as the detailed
design reference. In particular:

- Keep the SB mark, approved purple/neutral palette, system fonts, profile
  avatar, notification bell and contextual icon system. Do not restart the
  completed icon rollout or recreate temporary design routes.
- Preserve SVG view boxes and uncropped illustrations. Check mask/clip IDs
  when the same SVG is rendered more than once, and check its smallest actual
  display size as well as an enlarged preview.
- Do not replace the project-specific breakpoints with one generic mobile
  breakpoint: navigation switches at 1110px; progress swipe layouts end at
  769px; home CTAs stack through 425px; 7.5px root gutters apply only through
  320px. Change these only when the task calls for it.
- Reuse existing components and tokens. Avoid incidental dependencies, web
  fonts, broad formatting changes, new UI frameworks or unrelated redesigns.
- Keep server and client responsibilities distinct. Pass only necessary data
  to client components; browser visibility, disabled buttons and noindex are
  not authorisation controls.
- The shared shell supplies the page-content main landmark. Do not add another
  main inside it. Use semantic headings, labelled controls and the shared
  metadata helper in a server page or route-specific layout.
- Preserve the shared Markdown/maths renderer, safe inline error presentation
  and Low Data Mode behaviour. Do not insert generated HTML directly or show
  raw server/provider errors.

Do not use this process to silently fix every unrelated issue found while
working. Record non-sensitive follow-up separately; report sensitive findings
privately.

## 4. Implement the smallest complete change

For a reproducible defect, add or update a regression test that demonstrates
the failure before the correction where practical. If only browser evidence
can establish it, describe the manual check and its limitations.

Keep the UI complete across relevant states:

- loading, empty, partial data, success and unavailable;
- validation failure, failed network request, retry and expired session;
- saving/submitting, duplicate clicks and confirmed destructive actions;
- refresh, back/forward navigation, deep links and persisted preferences.

Do not show unavailable data as zero or claim an action succeeded before its
response confirms it. Preserve drafts and user input when a request fails.
Distinguish optimistic presentation from authoritative server state and handle
failure recovery.

New, moved or removed pages also need their links, return destinations,
metadata, sitemap/indexing intent and documentation checked. Removing a preview
route must not remove a component still used by live pages.

## 5. Verify in proportion to the change

Use the [UI review checklist](DMCTN_UI_TASTE_GATE.md) and
[low-data rulebook](PERFORMANCE_AND_LOW_DATA_RULEBOOK.md). Select checks based
on the affected behaviour, not merely the number of changed lines.

| Change | Required focus |
| --- | --- |
| Documentation only | Verify source claims, local links, commands, status wording and public-safe content; no application build solely for prose. |
| Copy, icon, SVG or local styling | Check the actual usage sizes, long text, wrapping, contrast, accessible names, asset loading and affected viewports. Run relevant existing tests. |
| Shared component, global CSS, font or layout | Check representative consumers across public pages, forms and learner screens; run wider regression checks and production build. |
| Route, navigation or metadata | Check direct entry, back/forward, active links, signed-in/out shell, route metadata and intended sitemap membership. |
| Form, client state or API integration | Check success/error/loading/retry, refresh, duplicate submissions, retained input and response contracts; add regression coverage. |
| Chat, maths, progress, exams or notifications | Check long content, empty/unknown data, formulas/tables, pagination, daily metrics, precise destinations and feature-specific states. Apply the AI process when behaviour, claims or credit accounting changes. |
| Dependency, authentication, account lifecycle or other sensitive change | Apply the additional checks/reviewer in the deployment/security process; visual tests alone cannot approve it. |

### Automated checks

Run nearby tests first, for example:

```bash
npm test -- components/ChatMarkdown.test.ts lib/markdown-math.test.ts
```

Before promoting application-code changes, run the applicable broader checks
against the candidate being reviewed:

```bash
npm test
npx tsc --noEmit --pretty false
npm run lint
npm run build
git diff --check
```

Use isolated, approved test configuration. Inspect test scope before running
anything that could contact live services, send email or incur provider costs;
those actions require the applicable authorisation. Do not read or print
`.env.staging.local` or other secret files for ordinary frontend documentation.

These commands are instructions, not a declaration that they ran. The build
script generates the Prisma client; it does not apply deployment migrations.
Never suppress a failing test or change unrelated dependencies just to obtain
a green result. Report blocked or skipped checks and distinguish pre-existing
failures from regressions.

### Browser checks

Start at 320px and test the relevant boundary widths from the website guide,
including just below/at/above a changed breakpoint. Check wider screens too.
For shared layouts, use the full regression-width list in the UI checklist.

Check keyboard focus/order, screen-reader labels and announcements, 200% zoom,
reduced motion, comfortable text and touch targets. A 44px target is a useful
project default, not proof of Apple or WCAG conformance. Test the on-screen
keyboard, safe-area/footer clearance, long text and slow or failed requests.

For animation, swiping, clipping, fonts and responsive charts, inspect actual
browser behaviour. A Node render, class-name assertion, build or test named
e2e does not establish these outcomes. Record the browser, viewport, candidate
revision and whether evidence is automated or manual. Use synthetic accounts
and content; never publish real account screenshots or recovery URLs.

## 6. Update documentation and history with the change

Keep documentation aligned with what is implemented and verified. Use the
existing documents rather than creating a competing guide for each task.

| What changed | Where to record it |
| --- | --- |
| Page behaviour, branding, breakpoints or shared UI | [Website guide](WEBSITE_GUIDE.md); update the [README](../README.md) if the overview or setup changes. |
| Bug, recurrence or accepted UX correction | [Frontend bug and fix history](FRONTEND_BUG_AND_FIX_HISTORY.md): symptom, established cause, correction, source/tests, status and remaining work. |
| Client/API contract | [API reference](../app/api/v1/README.md) and corresponding feature guide. |
| Chat, rendering, marking or AI claims | [AI experience guide](../AI_FEATURES_GUIDE.md), applicable AI history/process and frontend history for visible impact. |
| Performance or low-data behaviour | [Low-data rulebook](PERFORMANCE_AND_LOW_DATA_RULEBOOK.md), keeping requirements distinct from measurements. |
| Architecture or component responsibilities | [Codebase map](../CODEBASE_BREAKDOWN.md). |
| Workflow or verification expectations | This process, [UI checklist](DMCTN_UI_TASTE_GATE.md) and relevant contributor/editor pointers. |
| Legal, privacy, security, deployment or release state | Applicable public policy/guide plus restricted review and release records under the parent process. |

Use distinct status labels: implemented in source, automated checks passed,
browser-verified, staging-verified and production-verified. Do not mark every
stage complete because one passed. Keep unresolved items visible, and do not
invent a historical cause, date or corrective commit.

Public records must not contain credentials, personal learner content, private
hosts, operator details, raw logs, internal defensive tuning or exploitable
findings. Documentation redaction is not a substitute for server-side controls
or a repository-history secret audit.

## 7. Hand off and verify staging before production

1. Review the complete diff and confirm it contains only the intended work.
   Explain any shared-component impact and remaining limitations.
2. Provide the user with changed files, checks/results, untested states and any
   required configuration/migration handoff. Leave Git staging/commits to the
   user unless delegated.
3. When authorised, merge the reviewed feature into staging first. Resolve
   integration conflicts carefully and rerun affected checks on the resulting
   staging candidate, not only the original feature revision.
4. Deploy through the existing release process and verify that exact revision
   using synthetic data. Confirm the affected UI journey and dependencies;
   merging code alone is not a successful deployment.
5. Obtain the separate production approval and complete the parent release
   gates before production promotion. A frontend change must not silently
   enable a gated feature or apply a database migration.

If work is complete only locally, say **implemented; staging acceptance
pending**, not deployed or fully released. Missing authority or access is a
handoff item, not permission to bypass the workflow.

## 8. Handle regressions and close the change

Stop promotion if the change causes inaccessible actions, lost input,
misleading results, broken navigation or other material regressions. Preserve
safe evidence and use the approved compatible rollback or targeted correction;
do not reset a shared worktree or erase another contributor's work.

For an already deployed issue, follow the deployment/incident process and
release authority. A visual rollback alone does not resolve suspected data or
security exposure. Recheck the corrected journey, append any recurrence to the
history, and record follow-up ownership privately where required.

A frontend change is ready for its requested handoff when scope is satisfied,
relevant checks have honest results, approved design decisions are preserved,
documentation/history are updated, and remaining acceptance work is explicit.
Production completion additionally requires the recorded release approval and
live verification under the parent process.

## Reusable handoff template

```text
Change / issue ID:
Requested outcome and affected routes/components:
Implemented behaviour and preserved constraints:
Tests and browser checks actually run:
Results, skipped checks and known limitations:
Documentation/history updated:
Git/merge/deployment actions authorised and performed:
Current acceptance stage and next owner/action:
```

Review this process when the architecture, agreed design, branch/release
workflow or verification tools change. Keep private evidence in the restricted
record; the public handoff should summarise outcomes safely.
