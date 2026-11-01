# Railway Security Operations

Last reviewed: 1 November 2026

This document is a public-safe operating standard for Study Buddy on Railway.
It is not the live production runbook. Exact service names, internal addresses,
environment values, schedules, thresholds, account lists, evidence, and open
findings belong in the company's restricted operations system.

## Security boundary

- Expose only the Next.js web service through the intended HTTPS domain.
- Keep databases, malware scanners, scheduled jobs, and reporting services on
  private networking with no public domain or TCP proxy.
- Place staging behind an identity-aware access control and use synthetic data.
- Use separate Railway environments and separate provider/database credentials
  for staging and production.
- Treat Railway project membership, environment variables, deployment access,
  and recovery methods as privileged access protected by MFA.
- Do not copy a production variable set into a preview deployment.

The service health endpoint should prove process readiness without exposing
configuration, dependency details, database contents, or secrets. Continuous
availability monitoring is separate from deployment health checks.

## Service separation

Use distinct services with least-privilege configuration:

| Service purpose | Public network | Minimum authority |
| --- | --- | --- |
| Web application | Intended HTTPS domain only | Restricted runtime database access and required provider credentials |
| Database migration | None | Temporary migration authority; removed after the run |
| Account lifecycle | None | Job authentication only; no browser credentials |
| Security reporting | None | Restricted reporting database access and email delivery; provider-cost access only when approved |
| Malware scanning | None | Scanner runtime and signature storage only |

Do not put migration-owner credentials, provider administration keys, or broad
database authority in the web service. A missing grant is a failed deployment,
not a reason to increase the runtime role's privileges.

## Environment configuration

Use `.env.example` only as a list of supported settings. Production values are
created and reviewed privately. In particular:

- browser-exposed variables contain only public identifiers;
- the canonical application origin is the exact browser-facing HTTPS origin;
- additional trusted origins are empty unless a reviewed frontend requires
  them;
- webhook, cron, rate-limit hashing, and provider secrets are independent;
- runtime and migration database identities are separate;
- rate limits, AI budgets, alert thresholds, and report recipients are tuned
  privately for the environment; and
- secret values are never printed in build logs, command output, screenshots,
  tickets, or reports.

Seal production variables after validation where the platform supports it.
Rotate exposed values and review access/logs; simply editing documentation or
the latest commit does not invalidate a leaked credential.

## Database runtime authority

The web service uses a dedicated PostgreSQL runtime identity. It may access the
application data required by server routes, but it must not own schemas or
tables and must not have superuser, database/role creation, replication, or DDL
authority. Migration authority is isolated from normal runtime.

After every migration or role change:

1. verify the effective identity and privileges without exposing connection
   strings;
2. run the database security verification command against the runtime identity;
3. exercise a read and write path in staging; and
4. retain the result in the restricted deployment evidence record.

Connection-pool sizes are calculated privately from replica count, job count,
provider limits, and deployment overlap. Do not publish the live calculation or
raise the pool merely to hide connection leaks.

## Authentication and request protection

The application enforces server-side authentication and ownership checks.
Cookie-authenticated mutations require trusted-origin validation, and sensitive
routes use bounded input sizes, timeouts, and distributed limits. Webhooks use
provider signatures rather than browser sessions. Scheduled routes use separate
job authentication.

Proxy-derived client addresses are trusted only from the configured hosting
topology. Do not accept whichever forwarding header a client supplies. CAPTCHA
or edge challenges supplement application controls; they do not replace
account-aware limits or authorisation.

Production thresholds and bypass-resistant tuning are private. Test shared-IP
scenarios, unknown accounts, enumeration resistance, retries, and lock recovery
in staging without documenting the live limits or test identities here.

## Account lifecycle jobs

Run lifecycle work from an isolated scheduled service over private networking.
The job has no public domain and receives only its authentication material and
target configuration. It must use bounded batches, idempotent transitions,
timeouts, retries, privacy-safe logs, and a failing exit status when work cannot
be completed.

Alert on missed or failed runs. Verify outcomes in the database and email
provider rather than relying only on a successful process exit. The private
runbook records the schedule, retry policy, last test, and recovery procedure.

## Security operations reporting

The monthly report service is isolated from the web runtime. It aggregates
security and operational signals without including raw email addresses, IP
addresses, tokens, user content, database rows, or private evidence links.

The report should cover, at minimum:

- authentication and rate-limit anomalies;
- webhook and origin-validation failures;
- malware and document-processing failures;
- unusual AI use or provider cost;
- account-lifecycle failures and overdue work;
- dependency and secret-scanning status;
- backup-restoration evidence freshness; and
- provider-access review evidence freshness.

Exact alert thresholds and recipients are private. A missing report is a
monitoring failure, not proof that the month was uneventful. Backup restoration
and provider-access review require controlled human verification; a cron job
must not claim to have performed them automatically.

## File-processing security

The malware scanner is reachable only from authorised private services and has
no public endpoint. Production upload handling fails closed if a required scan
or reconstruction step is unavailable.

The application combines bounded request handling, declared-type and signature
validation, archive/decompression limits, malware scanning, document
reconstruction where applicable, post-reconstruction inspection, and a second
scan before storage. No single layer proves a file is harmless.

Scanner image versions, memory sizing, accepted limits, private addresses, and
known test fixtures are recorded privately. Use harmless standard antivirus
test files and synthetic documents in staging; never place live malware or
customer data in the repository.

## Monitoring and incident response

Application logs use structured, privacy-safe events. They must not contain raw
credentials, reset/deletion links, full client addresses, webhook signatures,
uploaded filenames, user conversations, or payment details.

Alert categories include availability, authentication abuse, repeated request
rejection, signature failures, scanner/CDR failure, AI-budget exhaustion,
scheduled-job failure, and deletion failure. The restricted monitoring record
contains the exact queries, thresholds, destinations, escalation roster, and
test evidence.

During an incident, preserve evidence, revoke or rotate affected access, and
follow the [personal-data breach response plan](./compliance/PERSONAL_DATA_BREACH_RESPONSE_PLAN.md)
when personal data may be involved. Do not paste raw logs or findings into a
public issue.

## Repository and staging checks

- Dependabot proposes dependency updates; review and test them rather than
  merging groups blindly.
- Secret scanning runs on proposed and committed changes. A historical secret
  must be revoked or rotated even if it is later removed from Git.
- The OWASP ZAP baseline targets only the approved non-production environment
  and performs the bounded passive/baseline scan configured in the workflow.
- Authenticated or active penetration testing requires separate written rules
  of engagement and synthetic accounts.
- Security reports and scan artifacts are retained in restricted evidence
  storage. Public documentation records only non-sensitive completion status.

## Railway edge controls

Railway edge protections or an upstream proxy can reduce abusive traffic, but
they must be tested against authentication, CAPTCHA, email callbacks, and
signed webhook delivery. Do not publish live rules or globally disable
protection for a test. Any temporary allow rule is limited to staging, the
approved source, and the approved time window, then removed and verified.

## Release evidence

For every material production release, privately retain:

- commit and deployment identifiers;
- migration and runtime-role verification;
- security/test/scan results;
- smoke-test outcomes;
- scheduled-job and monitoring checks;
- rollback owner and known-good artifact; and
- any accepted residual risk with owner and review date.

Do not commit that evidence, live configuration, or unresolved vulnerability
details to this public repository.

See [Deployment Guide](./DEPLOYMENT.md),
[Deployment and Security Change Process](./DEPLOYMENT_SECURITY_CHANGE_PROCESS.md),
[Deployment and Security Fix History](./DEPLOYMENT_SECURITY_FIX_HISTORY.md),
[Security Policy](../SECURITY.md),
[Independent Security Review](./INDEPENDENT_SECURITY_REVIEW.md), and
[Beta Readiness](./BETA_READINESS.md).
