# Study Buddy testing programme

Last reviewed: 24 November 2026

Baseline branch: `docs/testing-baseline-and-roadmap`

Baseline production revision: `45fbb9d60279c0265dcaea1eb73de23fd376041b`

This directory is the public-safe source of truth for the Study Buddy testing
programme. The detailed gap analysis and implementation order are in
[Testing roadmap](./TESTING_ROADMAP.md).

This documentation does not claim that a listed test exists or has passed.
Statuses distinguish current evidence from planned work. Exact test accounts,
provider credentials, defensive thresholds, live findings, environment
identifiers, private evaluation cases and evidence links belong in the
restricted company test register, not this public repository.

## Branch rule

All new testing implementation branches must start from the latest accepted
commit on `docs/testing-baseline-and-roadmap`, not directly from an older
`main`, `staging` or feature branch.

```bash
git fetch origin
git switch docs/testing-baseline-and-roadmap
git pull --ff-only origin docs/testing-baseline-and-roadmap
git switch -c test/<short-workstream-name>
```

Each `test/*` pull request should normally target
`docs/testing-baseline-and-roadmap`. Merge one foundational workstream before
creating a workstream that depends on it. Independent workstreams may proceed
in parallel, but must be refreshed from the latest testing baseline before
approval.

The current CI workflow runs automatically only for pull requests into `main`
or `staging`. Therefore the first implementation workstream is the CI bootstrap
described in the roadmap. Until that change is merged into the testing baseline,
run the complete workflow manually on the exact branch revision and record the
run privately; a green check from an unrelated revision is not evidence.

When a coherent testing batch is complete:

1. merge its passing `test/*` pull requests into the testing baseline;
2. open the testing baseline into `staging`;
3. require complete CI and the applicable protected-staging checks;
4. smoke-test the deployed staging revision with synthetic accounts;
5. promote that exact reviewed revision to `main`; and
6. run only the bounded, non-destructive production smoke checks approved for
   that release.

Application feature branches must not use this long-lived testing branch as a
general development base. This branch is an integration line for test harnesses,
test cases and their public-safe documentation.

## Test labels must describe reality

Use these terms consistently:

- **Unit test**: one function or small module with collaborators replaced.
- **Component test**: a rendered component with controlled dependencies.
- **Handler test**: a route handler called in process. It is not proof of HTTP,
  proxy, cookie, database or deployed behavior.
- **Integration test**: at least two real application layers work together.
  Name every replaced boundary.
- **Database integration test**: migrations and queries execute against a
  disposable PostgreSQL database using the intended role and grants.
- **Contract test**: verifies the request/response agreement at a provider or
  service boundary, normally against a controlled fake and, where approved, a
  bounded provider sandbox.
- **Fixture browser test**: a real browser renders real components inside the
  repository's isolated fixture server. This is the current Playwright suite.
- **End-to-end test**: a real browser reaches a built and started Next.js app
  through HTTP and exercises the real application/database boundary. Replaced
  external providers must be stated.
- **Staging acceptance test**: exercises the deployed, access-protected staging
  release with synthetic accounts and separately scoped provider credentials.
- **Production smoke test**: a narrow, non-destructive check of the released
  service. It is not a place for load, fuzz, active security or deletion tests.

In particular,
`app/api/v1/mock-exams/written-paper-lifecycle.e2e.test.ts` is valuable
in-process workflow coverage, but it mocks authentication, Prisma, the AI
provider and audit logging. Treat it as handler/workflow integration, not a
network, browser or database end-to-end test.

## Test environments and data

| Layer | Permitted use | Required isolation |
| --- | --- | --- |
| Local and ordinary CI | Static checks, unit/component/handler tests, fixture browser tests, deterministic AI evaluation | No production credentials or personal data; external network denied unless a reviewed job requires it |
| Ephemeral integration environment | Built Next server, disposable PostgreSQL, migration/grant checks, controlled provider fakes | Fresh database and synthetic seed per run; deterministic cleanup; no production provider keys |
| Protected staging | Release-candidate journeys, provider sandbox contracts, accessibility/manual acceptance, bounded security checks | Separate Supabase/database/provider projects, synthetic accounts, Cloudflare Access, named test window |
| Production | Health, TLS/headers and narrow disposable-account smoke checks approved by the release owner | No load, fuzz, destructive lifecycle, active DAST or broad security testing |

Do not copy customer, child, conversation, payment or production log data into a
test environment. Test fixtures must be synthetic, licensed for this purpose,
and free of live secrets. Malware/CDR tests must use controlled inert fixtures
inside an isolated scanner environment; public upload routes remain disabled
until their separate launch gate passes.

## Current local commands

Run with the repository-pinned Node.js version from `package.json`.

```bash
npm ci
npm run security:audit-dependencies
npm run lint
npx --no-install next typegen
npx --no-install tsc --noEmit --pretty false
npm test
npm run test:scripts
npm run test:browser
npm run build
```

The real production-build harness has separate commands and requires a
disposable local pgvector database plus the documented synthetic environment:

```bash
npm run test:e2e:prepare
npm run build
npm run test:e2e
```

See [Real Next.js E2E harness](./REAL_NEXT_E2E_HARNESS.md) for the safe setup,
cleanup, CI behavior and limitations.

These commands are not the complete target programme.
`npm run test:browser` uses a test-only component server and mocked requests. It
does not start Next.js or prove real authentication, database, middleware,
provider or deployment behavior.

## Evidence and completion rules

Every testing workstream needs:

- a named purpose, owner and reviewer;
- the exact revision and environment class tested;
- deterministic setup and cleanup instructions;
- explicit positive, rejection, timeout, retry and recovery cases where
  applicable;
- a machine-readable result or CI artifact for automated tests;
- a private evidence entry for provider, staging, manual, security or recovery
  work;
- a documented failure triage and rollback path; and
- an update to the roadmap when scope or status changes.

A workstream is not complete because tests were written. Its tests must fail
for the intended regression, pass after the correction, be stable on repeat
runs, and run at the appropriate cadence. Skipped, quarantined or flaky tests
need an owner, reason and expiry; they cannot silently satisfy a release gate.

## Release principles

- Fast deterministic checks run on every relevant pull request.
- Database and real-Next integration tests run before staging promotion.
- Provider sandbox, authenticated staging and manual acceptance checks run on
  release candidates or when their boundary changes.
- Scheduled security, recovery, drift, performance and AI-quality checks do not
  replace per-change regression tests.
- No critical or high-severity security/privacy defect may be accepted for a
  public or paid launch. Other accepted risk requires a private owner, reason,
  approval and review date.
- Existing grounded-chat `DO_NOT_ENABLE`, payment, child-AI, school and upload
  gates remain in force. Adding tests does not enable a dormant feature.

## Related documentation

- [Testing roadmap](./TESTING_ROADMAP.md)
- [CI testing baseline](./CI_BASELINE.md)
- [Real Next.js E2E harness](./REAL_NEXT_E2E_HARNESS.md)
- [Database migration, role and RLS gate](./DATABASE_MIGRATIONS_ROLES_RLS.md)
- [API authorization and input validation matrix](./API_AUTHORIZATION_MATRIX.md)
- [Deployment and security change process](../DEPLOYMENT_SECURITY_CHANGE_PROCESS.md)
- [Frontend change process](../FRONTEND_CHANGE_PROCESS.md)
- [AI change process](../AI_CHANGE_PROCESS.md)
- [Beta readiness](../BETA_READINESS.md)
- [Independent security review](../INDEPENDENT_SECURITY_REVIEW.md)
- [Railway security operations](../RAILWAY_SECURITY_OPERATIONS.md)

