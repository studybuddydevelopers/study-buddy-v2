# CI testing baseline

Last reviewed: 24 November 2026

This document describes the first implementation workstream from the
[testing roadmap](./TESTING_ROADMAP.md). It records repository behavior, not a
claim about a particular GitHub Actions run or deployed release.

## What the gate covers

The complete CI workflow runs for pull requests and pushes involving `main`,
`staging` and `docs/testing-baseline-and-roadmap`. Future `test/*` branches
should target the testing baseline so they receive this gate before integration.

The workflow checks:

1. the exact Node version shared by `package.json`, `.nvmrc` and the active CI
   runtime;
2. the locked dependency tree and the existing moderate-or-higher audit gate;
3. lint, generated Next.js route types and TypeScript;
4. test policy, including rejection of focused tests and reporting of skipped,
   todo, fixme or expected-failure tests;
5. Vitest with V8 coverage;
6. Node script tests with JUnit output;
7. the isolated Chromium/WebKit/touch Playwright suite with HTML and JSON
   results; and
8. the production application build.

This remains a deterministic repository gate. It does not create PostgreSQL,
start the real Next.js application for browser E2E, call providers, or prove a
staging deployment. Those are separate roadmap workstreams.

## Coverage baseline

The initial Node 24.22.3 measurement across `app`, `components`, `lib` and
`proxy.ts` was:

| Metric | Measured | Current minimum |
| --- | ---: | ---: |
| Statements | 61.21% | 61% |
| Branches | 56.85% | 56% |
| Functions | 64.76% | 64% |
| Lines | 62.87% | 62% |

Additional aggregate floors protect `lib/security/**`, `lib/supabase/**` and
`lib/ai/chats/**`. The exact floors live in `vitest.config.ts`, beside the
coverage scope, so changes are reviewable with the code they gate.

These are regression floors, not quality targets. Do not add meaningless tests
to improve a percentage, and do not lower a floor merely to make CI pass. Add
tests for the changed behavior first. If a justified architectural change
alters the denominator, record the old/new measurement and review the affected
negative paths before adjusting the floor. Raise floors when sustained coverage
improves.

## Evidence artifacts

CI retains a short-lived evidence bundle containing:

- the test-policy JSON result;
- Vitest JSON and coverage JSON/LCOV/Cobertura results;
- Node script-test JUnit output;
- Playwright JSON, HTML, traces and failure screenshots when produced;
- the production build log; and
- a bounded manifest naming the revision, runtime, step outcomes and which
  expected result files were present.

The bundle must not contain environment dumps, provider responses, credentials,
personal data or private security findings. Detailed staging/provider/manual
evidence remains in the restricted company register.

## Local verification

Activate the pinned Node version before installing or running the gate:

```bash
nvm use
npm ci
npm run verify:node-runtime
npm run security:audit-dependencies
npm run lint
npx --no-install next typegen
npx --no-install tsc --noEmit --pretty false
npm run test:policy
npm run test:coverage
npm run test:scripts
npm run test:browser
npm run build
```

The default `npm test` remains the faster application-test command without
coverage. Generated coverage and CI evidence are ignored by Git.

## Failure rules

- A runtime mismatch, focused test, coverage regression, failed test, lint/type
  failure, blocking dependency finding or build failure blocks the pull request.
- Skipped/todo/fixme/expected-failure tests are reported. They require a named
  reason and follow-up if they affect a release gate.
- Artifacts are uploaded even after a failed step when files are available.
- A missing artifact is visible in the evidence manifest; it is not silently
  interpreted as a pass.
- A green repository gate cannot waive database, provider, staging, privacy,
  AI-quality, recovery or independent-review requirements.

