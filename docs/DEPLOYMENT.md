# Deployment Guide

Last reviewed: 1 November 2026

This is the public-safe deployment guide for Study Buddy. It deliberately omits
real environment values, internal network names, service identifiers, account
lists, defensive thresholds, and provider-console evidence. Store those details
in the company's restricted operations system, not this repository.

## Deployment model

Study Buddy is a Next.js service backed by PostgreSQL/Supabase and external
providers. A deployment should use separate, isolated environments for local
development, staging, and production.

- Production exposes only the browser-facing web service.
- Databases, scanners, scheduled jobs, and operational services stay private.
- Staging uses synthetic data, separate provider projects/keys, and an access
  control in front of the site.
- Preview or test deployments must not inherit production credentials.
- The canonical public origin uses HTTPS. Redirect and CSRF allowlists contain
  only intentional exact origins.

The current hosting provider is Railway, but these boundaries apply on any
platform.

## Build and start

Install the locked dependencies and build the production application:

```bash
npm ci
npm run build
```

Start it with:

```bash
npm start
```

The platform supplies the listening port. Do not commit a production `.env`
file or inject secrets into the client bundle.

## Environment configuration

`.env.example` is the schema for configuration. It contains placeholders and
development-oriented examples only. Classify variables before setting them:

- `NEXT_PUBLIC_*` values are intentionally delivered to browsers and must never
  contain secrets.
- Server credentials, signing secrets, database URLs, provider keys, and cron
  authentication values belong in the platform's secret store.
- Migration-owner credentials belong only in a trusted migration job or
  controlled administrative environment, never in the normal web runtime.
- Staging and production must use different credentials, databases, buckets,
  provider projects, signing secrets, and rate-limit hash secrets.
- Production security limits, budgets, recipients, internal addresses, and
  alert thresholds are approved and recorded privately.

Seal or otherwise protect production variables after validation. Rotate a value
immediately if it appears in logs, chat, screenshots, source control, build
artifacts, or an unauthorised environment.

## Database changes

Use an expand/verify/contract deployment approach:

1. Back up the target and verify a recent restoration exercise.
2. Run `npx prisma migrate deploy` from a trusted migration job using the
   migration identity.
3. Verify the migration and least-privilege runtime grants without printing
   credentials or user data.
4. Deploy compatible application code.
5. Run staging smoke tests, then production smoke tests with disposable or
   purpose-built test accounts.
6. Monitor errors, latency, authentication failures, scheduled work, and
   provider health during the release window.

Do not run `prisma db push` against production. Do not work around missing
runtime grants by placing an owner credential in the web service.

## Scheduled services

Account lifecycle and security reporting run as isolated scheduled services.
Each service receives only the variables needed for its job and has no public
domain. The private operations record contains the schedule, destination,
authentication value, timeout, retry policy, failure alert, and last successful
test.

Do not document those live values in GitHub. A successful process exit is not
enough: verify the intended database or email outcome and record privacy-safe
evidence privately.

## Upload-processing services

If a release exposes file upload, production must fail closed when required
malware scanning or content reconstruction is unavailable. Scanner and
reconstruction services remain private and least privileged. Test harmless,
malformed, oversized, compressed, and known antivirus test fixtures in staging
before enabling the upload surface.

Dormant ingestion code does not count as an approved upload surface. Re-run the
threat review whenever upload routes, accepted formats, or storage behaviour
change.

## Security and availability gates

Before switching traffic, verify privately that:

- the expected commit and migration set are deployed;
- staging contains no production personal data;
- authentication, account recovery, authorisation, deletion, AI-budget, and
  payment-test journeys work as intended;
- security headers and origin protections are present;
- health checks and external uptime monitoring are active;
- scheduled jobs have alerts and a recent successful test;
- backups, restoration, and rollback were exercised;
- dependency and secret scans passed; and
- the approved staging security scan has no unresolved release-blocking result.

Production payment, child AI access, public uploads, and other high-risk
features remain disabled until their separate legal, privacy, safety, and
security gates pass.

## Rollback

Every release needs a rollback owner and an identified previously known-good
artifact. Prefer backward-compatible migrations so application rollback does
not require destructive database rollback. If a release may have exposed data
or secrets, invoke the incident procedure rather than treating rollback alone
as resolution.

## Documentation boundary

The following stay in the private operations system:

- environment exports and real values;
- internal network maps, service names, IDs, and provider-console URLs;
- exact schedules, thresholds, quotas, budgets, alert routing, and access
  rosters;
- backup locations and recovery credentials;
- deployment, scan, and restoration evidence; and
- open vulnerability details, incident records, and penetration-test reports.

Public documentation may record that a control exists and how it is verified,
but not the live value or evidence that would help bypass it.

See also [Security Policy](../SECURITY.md),
[Deployment and Security Change Process](./DEPLOYMENT_SECURITY_CHANGE_PROCESS.md),
[Deployment and Security Fix History](./DEPLOYMENT_SECURITY_FIX_HISTORY.md),
[Railway Security Operations](./RAILWAY_SECURITY_OPERATIONS.md), and
[Beta Readiness](./BETA_READINESS.md).
