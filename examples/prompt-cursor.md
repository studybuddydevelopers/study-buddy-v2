# Frontend task prompt template

Use this with the [Study Buddy UI checklist](../docs/DMCTN_UI_TASTE_GATE.md).
Replace the bracketed task text; never insert real credentials or learner data.

```text
Task: [Describe the requested UI or documentation change.]
Scope: [Name the routes/components and any explicit exclusions.]

Read AGENTS.md, docs/WEBSITE_GUIDE.md and the installed Next.js guide relevant
to this change. Inspect the existing implementation before editing.

1. State the current behaviour, requested change and verifiable success criteria.
2. Preserve the approved SB branding, contextual icons, profile avatar, bell,
   system fonts and existing breakpoint behaviour.
3. Reuse shared components. Do not add features, dependencies or temporary routes
   outside scope. An audit/documentation request is not permission to change UI.
4. Check 320px through desktop, keyboard access, zoom, reduced motion, slow
   connectivity and loading/error/empty states relevant to this task.
5. Keep private data server-side and never present hidden buttons or noindex as
   access controls. Report security findings privately.
6. Preserve concurrent work. Do not stage, commit, merge, push, migrate a shared
   database or deploy without the appropriate authorisation.
7. Run relevant checks; distinguish source inspection, automated tests and live
   browser results. Do not invent screenshots or claim checks that did not run.
8. Summarise changed files, outcomes and remaining non-sensitive work in the
   response. Create an evidence document only if requested, using synthetic data.
```

Generic design-skill suggestions do not override Study Buddy's approved design
or the user's explicit instructions.
