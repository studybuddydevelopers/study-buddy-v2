# Real Next.js end-to-end harness

Last reviewed: 25 November 2026

## Purpose

This harness tests the assembled production build rather than the isolated
component fixture server. It starts the built Next.js application, a
deterministic local Supabase Auth and email fake and a disposable pgvector
PostgreSQL database containing synthetic records only.

It currently proves:

- an anonymous request crosses the real proxy and redirects away from a
  protected page;
- public health, static-asset and API routing work through the real server;
- a synthetic learner can log in through the real login UI and route handler;
- the Supabase SSR cookie survives a full browser refresh and logout takes
  effect across tabs;
- the dashboard and authenticated APIs read seeded data from PostgreSQL;
- age-gated signup, one-time verification and legacy age checks work;
- guardian approval without AI permission, denial, expiry and resend enforce
  the expected learner and AI access;
- password reset limits send a warning and the explicit lock and recovery
  steps restore access through a fresh reset email; and
- deactivation, reactivation, deletion email retry, confirmation, cancellation
  and scheduled deletion update persisted account state.

The existing `npm run test:browser` suite remains a separate, faster fixture
browser layer. It does not start Next.js or PostgreSQL.

## Isolation and safety controls

- The setup script rejects non-PostgreSQL URLs, non-loopback hosts and database
  names that do not end in `_e2e` before it can recreate a database.
- The database is recreated for every run and contains synthetic test data.
- CI uses a digest-pinned pgvector container and creates only the compatibility
  roles and schema needed by the complete migration chain.
- Supabase Auth and transactional email use a localhost-only deterministic HTTP
  fake. Playwright starts the server with synthetic keys and a test preload that
  sends Resend requests to the local outbox and rejects external `fetch` calls.
  The chat client uses the OpenAI SDK against a localhost-only completion
  endpoint that can return a deterministic response or fail one synthetic prompt.
- `STUDY_BUDDY_E2E_TEST_MODE=true` permits the built app to use an HTTP
  loopback canonical origin only when the database and Supabase URLs are also
  loopback-only and no Railway or Vercel deployment indicators exist. The same
  guard allows the browser to contact local Auth for password recovery.

Never set `STUDY_BUDDY_E2E_TEST_MODE` in Railway, Vercel, staging or production.
The application refuses the exception when deployment indicators are present,
but the variable must still remain test-only.

## CI execution

The `Real Next.js E2E` job in `.github/workflows/ci.yml`:

1. starts disposable digest-pinned pgvector PostgreSQL;
2. installs locked dependencies and Chromium;
3. recreates the `_e2e` database, applies every Prisma migration and seeds a
   synthetic learner and question attempt;
4. builds the production Next.js application;
5. starts the local Auth and email fake and built application under Playwright;
6. runs the account lifecycle, API authorization and student journeys; and
7. uploads JSON, JUnit, HTML, trace, screenshot and video evidence as
   applicable.

The job is independent of the existing full CI job, so a failure in either
layer blocks the pull request when both checks are required.

## Student journeys

The [student journey suite](../../tests/e2e/student-journeys.spec.ts) follows
these flows in Chromium against the built app and a fresh PostgreSQL database.

- Open practice from the materials page, recover a draft after reload, submit
  and review a quiz, and verify the updated progress after another reload.
- Start an objective mock, save and resume the answer, submit and grade, and
  verify a repeated submission leaves the saved answer and grade intact.
- Send and find a saved chat, retry a failed AI generation without duplicating
  the question, and recover from a failed report submission.
- Request a written-paper marking review, open a seeded support decision from
  notifications, verify the read state and confirm a second learner cannot
  view the decision.

The review test starts from a pre-marked paper and supplies the support decision
as fixture data. It exercises the learner-facing review and inbox. Other tests
cover the marking workflow and the support endpoint.

After local setup and a fresh seed, run just this suite with
`npm run test:e2e -- student-journeys.spec.ts`.

## Local execution

Use Node `24.22.3`, Docker and the repository's locked dependencies. The values
below are synthetic and local-only.

```bash
docker run --rm --name study-buddy-e2e-postgres \
  -e POSTGRES_PASSWORD=e2e-only-password-not-a-secret-12345 \
  -e POSTGRES_DB=postgres \
  -p 127.0.0.1:55432:5432 \
  pgvector/pgvector@sha256:b513c48566e4777cd3370451400000c78eda6a08131d68f4c31d4a76f27bd8fd

export E2E_DATABASE_URL='postgresql://postgres:e2e-only-password-not-a-secret-12345@127.0.0.1:55432/studybuddy_e2e'
export DATABASE_URL="$E2E_DATABASE_URL"
export DIRECT_URL="$E2E_DATABASE_URL"
export APP_ORIGIN='http://127.0.0.1:3200'
export CSRF_TRUSTED_ORIGINS='http://127.0.0.1:3200'
export STUDY_BUDDY_E2E_TEST_MODE='true'
export SUPABASE_URL='http://127.0.0.1:55431'
export NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55431'
export SUPABASE_PUBLISHABLE_KEY='sb_publishable_e2e_test_only'
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_e2e_test_only'
export NEXT_PUBLIC_CAPTCHA_ENABLED='false'
export RATE_LIMIT_HASH_SECRET='e2e-only-hash-secret-at-least-32-bytes-long'
export TRUSTED_PROXY_PROVIDER='direct'
export SECURITY_AUDIT_DB_ENABLED='false'
export AI_CHAT_PROVIDER='fake'
export AI_EMBEDDING_PROVIDER='fake'

npm run test:e2e:prepare
npm run build
npx --no-install playwright install chromium
npm run test:e2e
docker stop study-buddy-e2e-postgres
```

The setup step intentionally recreates the validated local `_e2e` database.
Run `npm run test:e2e:prepare` before repeating the suite so registrations and
rate-limit records start fresh. Stop the container after the run. Docker
removes the container automatically because it was started with `--rm`.

## Failure triage

- Migration failure: inspect the named Prisma migration and confirm the local
  image supplies pgvector; do not point the setup script at a shared database.
- Auth failure: inspect only the fake server's unexpected-route event and the
  Playwright trace. Do not replace it with live Supabase credentials.
- Browser failure: download the E2E artifact and inspect the JUnit/JSON result,
  trace, screenshot and video retained for the failed attempt.
- Flaky result: treat it as a failure. The critical journey must be stable
  before promotion.

## Deliberate limitations

Chromium is the first browser target. The local mailbox exercises links using
synthetic Supabase emails and the app's own transactional email templates.
Real Supabase templates and delivery, Turnstile, Cloudflare Access, Railway
networking, deployed headers and the other providers require staging evidence.

## Protected staging smoke

Use disposable learner accounts and inboxes controlled by the test operator.
Keep Turnstile and Cloudflare Access in their normal staging configuration.

1. Register an adult account, open its delivered verification email and sign
   in. After logout, request a reset, follow the delivered link and sign in
   with the changed password.
2. Register a synthetic learner aged 13–17. Verify the learner email, confirm
   the account is restricted, then use the email delivered to the test guardian
   to approve learning with AI permission left unchecked. Verify learning
   access and the AI restriction after the decision.
3. Request permanent deletion for a disposable account. Check the confirmation
   and pending-deletion emails, then cancel in the app. The isolated automated
   suite covers advancing the scheduled date and running the purge.

Record the deployed revision and pass/fail per step. Keep addresses, passwords,
provider responses and full email URLs out of shared artifacts.
