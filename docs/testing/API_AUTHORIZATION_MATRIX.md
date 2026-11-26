# API authorization and input validation

The [route matrix](../../tests/api-route-contracts.ts) records the expected
access level and input contract for each explicit App Router method. Update it
when a handler is added, removed or changes its contract. The inventory test
compares it with the route exports during the existing Full CI job. Next.js
supplies default `HEAD` and `OPTIONS` behavior where applicable.

The [HTTP suite](../../tests/e2e/api-authorization.spec.ts) runs against the
built app with simulated Supabase Auth and a disposable PostgreSQL database.
It checks anonymous rejection for session-protected methods, restrictions on
learner and AI access, ordinary-learner denial for support routes, and origin
checks for cookie-bearing browser mutations. It also checks representative bad
inputs, oversized requests, method handling, and rejection of learner sessions
on provider and scheduled endpoints.

Two synthetic learners verify isolation for chats, reports, exams, review
cases, notifications, subscriptions and profiles. Citation ownership is
covered in [chat service tests](../../lib/ai/chats/chat-service.test.ts). The
HTTP suite keeps grounded chat disabled and covers the citation route's
session and account guards under that configuration. Validation and provider
behaviors beyond the HTTP cases remain covered by their route or service tests
where those tests exist.

Run the inventory check with `npm test -- tests/api-route-contracts.test.ts`.
For HTTP checks, follow the [local harness setup](./REAL_NEXT_E2E_HARNESS.md#local-execution)
and run `npm run test:e2e -- api-authorization.spec.ts`. The suite uses only
local synthetic accounts and data. Keep actual credentials, user data and
live-environment findings out of the matrix and its artifacts.
