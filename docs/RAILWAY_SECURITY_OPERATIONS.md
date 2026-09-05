# Railway Security and Monitoring Runbook

This runbook is specific to a Railway deployment of Study Buddy. It was checked
against the linked vendor documentation on 2026-09-05.

## Production topology

- Expose only the Next.js web service publicly.
- Keep PostgreSQL, workers, and the ClamAV service private. Railway assigns each
  service a `<service-name>.railway.internal` hostname inside the environment.
- Add a custom HTTPS domain to the web service. Set `APP_ORIGIN` to that exact
  origin, including the `https://` scheme and no path.
- Do not add a public domain or TCP proxy to ClamAV. Its TCP protocol is not
  authenticated or encrypted and is suitable here only over Railway's private
  network.
- Seal production secrets in Railway after validating them, and use separate
  test credentials for preview environments.

Railway references: [production lockdown](https://docs.railway.com/guides/lock-down-production-project),
[private networking and domains](https://docs.railway.com/networking/domains/working-with-domains).

## Required web-service variables

Copy the normal application variables from `.env.example`, then set these
deployment-specific values:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://app.example.com
CSRF_TRUSTED_ORIGINS=
TRUSTED_PROXY_PROVIDER=railway
AI_GLOBAL_BUDGET_ENABLED=true
AI_GLOBAL_DAILY_TOKEN_BUDGET=1000000
MALWARE_SCAN_REQUIRED=true
CLAMAV_HOST=clamav.railway.internal
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=20000
PDF_CDR_REQUIRED=true
PDF_CDR_COMMAND=gs
PDF_CDR_TIMEOUT_MS=20000
PDF_CDR_MAX_OUTPUT_BYTES=31457280
```

Use different PostgreSQL credentials for `DATABASE_URL` and `DIRECT_URL`.
`DATABASE_URL` is the pooled runtime connection used by the generated Prisma
client. `DIRECT_URL` is the direct owner connection used only by Prisma Migrate.
The currently configured runtime role is still `postgres` and has `CREATEDB`,
`CREATEROLE`, and `BYPASSRLS`, so replacing it is a pre-launch task, not an
optional cleanup.

This app performs authorization in its server routes rather than passing each
Supabase user's identity into PostgreSQL. A practical runtime role therefore
needs access to all application rows (commonly `BYPASSRLS`) but should have only
`USAGE` on the `public` schema, CRUD on the required tables, and sequence usage.
It must not own the schema/tables or have superuser, database/role creation,
replication, or DDL rights. Have the migration owner grant matching default
privileges for future tables/sequences. Put the restricted pooled credential in
the Railway web service and keep the owner credential in a separately controlled
migration job where possible. Test this against staging before switching
production because a missed table or sequence grant will fail closed.

`APP_ORIGIN` is mandatory for browser mutations carrying a Supabase session
cookie. Requests with no `Origin`, `Origin: null`, or a different exact origin
are rejected with `403 CSRF_VALIDATION_FAILED`. Only add another exact origin to
`CSRF_TRUSTED_ORIGINS` when an intentional browser frontend needs it. Signed
Paystack/WhatsApp webhooks and the secret-authenticated recommendation cron are
excluded because they do not authenticate with browser cookies.

`TRUSTED_PROXY_PROVIDER=railway` makes the rate limiter use only the first
address in Railway's `X-Forwarded-For` chain. It intentionally ignores
`X-Real-IP`, Cloudflare, and Vercel headers in this topology so a client cannot
choose whichever forwarding header is most convenient to spoof.

## Private ClamAV service

1. Add a separate Railway service using an official ClamAV image such as
   `clamav/clamav:stable`. After testing, pin a supported feature release or
   image digest so a new feature version cannot arrive unexpectedly.
2. Add a volume mounted at `/var/lib/clamav` so virus definitions survive
   redeploys and FreshClam can update them incrementally.
3. Name the service `clamav`, leave Public Networking empty, and make port `3310`
   available only on the project private network.
4. Ensure `clamd.conf` has `StreamMaxLength` above the app's largest accepted
   file; use at least `30M` for the current 25 MB resource limit.
5. Allow the signature database to finish downloading before testing an upload.
   Treat `MALWARE_SCANNER_UNAVAILABLE` as a production incident.

The app sends each bounded upload with clamd's `INSTREAM` protocol before any
Supabase Storage write. Production scanning fails closed. PDF, PNG, JPEG, and
DOCX container magic bytes are checked first; PDFs and images also require their
expected end markers and matching declared type/extension. DOCX extraction has
strict ZIP-entry, encrypted/layout, advertised-size, and decompressed-output
limits. Plain text and Markdown have no reliable magic bytes, but are still
malware-scanned.

PDFs are reconstructed through Ghostscript with `-dSAFER`, bounded execution
time and output size, and no shell. The original is scanned, the reconstructed
PDF is checked for active actions/embedded content, and the exact reconstructed
bytes are scanned again before storage. `railpack.json` installs Ghostscript in
the Railway runtime image. CDR lowers risk but is not a proof that a document is
harmless, so keep ClamAV and least-privilege storage as separate layers.

ClamAV's official documentation describes the
[Docker images](https://docs.clamav.net/manual/Installing/Docker.html) and
[`INSTREAM` framing](https://docs.clamav.net/manual/Usage/ClamdProtocol.html).
The project recommends budgeting roughly 4 GB RAM for the scanner because the
signature database is memory-heavy; check the current image guidance before
sizing it lower.

## Admin-account support

Admin authorization already exists. `requireAdmin()` accepts an account only
when an `AdminUser` row exists for that `User.id`. The former duplicate
`User.isAdmin` Boolean was removed so the two authorization sources cannot
drift apart.

Admin API routes use this guard. There is deliberately no public admin-promotion
endpoint, but there is not yet a dedicated bootstrap CLI or admin-management UI.
Provision the first administrator directly through a restricted database
session. Use the Supabase Auth user ID that already exists in the `User` table,
insert its `AdminUser` row with a meaningful operational role, and verify
`/api/v1/me` reports `isAdmin: true`. Never let a signup payload create this row.

## Security event monitoring

The app emits single-line structured JSON events to stdout. Railway parses their
attributes automatically. Useful Log Explorer filters are:

```text
@httpStatus:429
@securityEvent:rate_limit_exceeded
@securityEvent:login_failed
@securityEvent:webhook_signature_failed
@securityEvent:csrf_validation_failed
@securityEvent:malware_detected
@securityEvent:malware_scanner_unavailable
@securityEvent:pdf_content_disarm_failed
@securityEvent:ai_global_daily_budget_exhausted
```

Login account and source-IP identifiers are HMAC-based pseudonyms, so repeated
failures can be grouped without putting emails, phone numbers, or raw IPs in
application logs. Webhook signatures and uploaded filenames are never logged.

Start with these thresholds and tune them against normal traffic:

| Signal | Warning | Critical/action |
| --- | --- | --- |
| HTTP 429 | 25 in 5 minutes or 3x baseline | 100 in 5 minutes; inspect paths/IPs and enable edge protection if needed |
| Login failures | 5 for one account/IP pseudonym in 10 minutes | 20 in 10 minutes; investigate credential stuffing and consider temporarily tightening limits |
| Webhook signature failures | 3 per provider in 5 minutes | Sustained failures or a jump after secret rotation; verify provider secret/configuration |
| Malware detected | Any event | Block is automatic; inspect the admin account and source workflow |
| Scanner unavailable | Any event | Page immediately because production uploads are unavailable by design |
| PDF CDR failure/unavailable | Any event | Inspect the file or runtime installation; do not bypass the production fail-closed setting |
| Global AI budget exhausted | Any event | Provider calls stop automatically; inspect usage and deliberately raise the limit only if justified |

Railway provides searchable HTTP and structured logs, but its native threshold
monitors cover CPU, RAM, disk, and network egress rather than application log
counts. For alert delivery on the filters above, use a vendor SDK or OpenTelemetry
backend with log/metric alerts (for example Datadog, New Relic, Grafana Cloud, or
another tool already used by the team). Railway documents both approaches in
[third-party observability](https://docs.railway.com/guides/third-party-observability).
See also Railway's [log query syntax](https://docs.railway.com/observability/logs)
and [native monitor limits](https://docs.railway.com/observability).

## Unusual AI spending

- Put production AI traffic in its own OpenAI project/API key.
- Configure project budget notifications at 50%, 75%, 90%, and 100%. Treat these
  as notifications rather than relying on them as the application's hard cap.
- Run a small scheduled monitoring job against OpenAI's Costs API, grouped by
  project, and alert when daily cost crosses an absolute amount or exceeds about
  twice the trailing seven-day median. Keep the required OpenAI admin key in the
  monitoring system, not in browser code.
- Compare provider cost to the app's `AiChatMessage.inputTokens` and
  `outputTokens` totals. The database totals help identify accounts and models,
  but provider Costs remain the billing source of truth and include work outside
  persistent chat.
- `AI_DAILY_USER_QUOTA` remains a hard per-account request quota. In addition,
  `AI_GLOBAL_DAILY_TOKEN_BUDGET` is an app-enforced, distributed hard stop across
  all accounts and replicas. Calls atomically reserve a conservative token upper
  bound before contacting the provider and settle against reported usage. It
  resets at 00:00 UTC and fails closed if its database guard is unavailable.
- Tokens are a stable enforcement unit, not an exact currency amount. Translate
  the chosen token ceiling from your most expensive enabled model, leave a cost
  margin, and keep provider-side cost alerts because model pricing and traffic
  outside this app are not represented by the token table.

## Automated repository and staging checks

- Dependabot opens grouped weekly npm updates and monthly GitHub Actions updates.
- TruffleHog scans each pull request and push to `main`; it also supports a full
  manual history scan. Any historical credential it finds must be rotated, not
  merely deleted from the latest commit.
- Set the GitHub Actions repository variable `STAGING_URL` to the public HTTPS
  Railway staging URL. The OWASP ZAP baseline workflow runs every Monday and can
  also be launched manually with an alternate target. It is a non-destructive
  spider/passive scan, fails the workflow on alerts, and uploads its report.
- Never point the ZAP workflow at production. Seed staging with fake data and
  use separate provider credentials. The baseline scan covers anonymously
  reachable pages; authenticated testing needs a separately reviewed ZAP auth
  configuration.

OpenAI references: [project budget behavior](https://help.openai.com/en/articles/9186755-managing-your-work-in-the-api-platform-with-projects.eps)
and the [Usage and Costs APIs](https://platform.openai.com/docs/api-reference/usage/audio_transcriptions_object).

## Railway edge protection

Railway is a suitable deployment target for this app. It now provides an edge
WAF, Edge Rules, and an on-demand Under Attack Mode; Cloudflare is optional, not
a prerequisite.

- Configure Railway Edge Rules for obvious abusive traffic and protect admin or
  auth browser flows where a challenge is acceptable.
- Keep explicit allow rules for Paystack and WhatsApp webhook paths above any
  broad browser challenge. A challenge can break legitimate non-browser webhook
  delivery.
- Test Under Attack Mode before launch, but enable it during an active bot/DDoS
  incident rather than leaving it on permanently. Railway notes that API-only
  domains are blocked while this browser check is active.
- Retain the app's database-backed IP/account limits. Edge controls reduce load;
  application limits enforce account-aware policy across replicas.
- Cloudflare can still be placed in front of the Railway custom domain if its
  particular bot-management or WAF controls are needed later. Follow Railway's
  documented Cloudflare SSL mode and domain-verification requirements.

Railway references: [Edge Rules](https://docs.railway.com/networking/edge-rules),
[WAF lockdown guidance](https://docs.railway.com/guides/lock-down-production-project),
and [custom domains](https://docs.railway.com/networking/domains/working-with-domains).
