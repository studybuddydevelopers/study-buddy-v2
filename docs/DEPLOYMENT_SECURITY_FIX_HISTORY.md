# Deployment and Security Fix History

Last updated: 1 November 2026

This is the public-safe historical register for Study Buddy deployment and
security defects, hardening gaps, operational failures, and their corrections.
It groups closely related commits into one record. Exact production values,
internal addresses, test identities, logs, exploit steps, provider-console
evidence, and unresolved vulnerability details belong in the restricted
company tracker, not this public repository.

## Status meanings

- **Resolved:** the correction is present in source or the operator confirmed
  the external configuration change, with the evidence stated below.
- **Mitigated:** exposure is reduced, but a later control or independent check
  is still required.
- **Verify privately:** reported as corrected, but the repository cannot prove
  the live provider or deployment state.
- **Open:** no verified correction is currently recorded.

## Deployment and reliability history

| ID | First observed | Problem and effect | Correction and verification | Status |
| --- | --- | --- | --- | --- |
| DEP-001 | September 2026 | The browser-facing Supabase setting contained the wrong value type, while previously used server/provider credentials also required rotation. This could break browser authentication and create unnecessary credential risk. | Corrected the browser publishable-key setting and rotated the affected server credentials in the deployment environments. The repository contains placeholders only; live rotation evidence is retained privately. | Resolved; verify privately after every environment clone |
| DEP-002 | 5 September 2026 | Database connection configuration used unsuitable connection details and initially depended on overly broad database authority. Staging migration/seed attempts also encountered rejected or stale credentials. | Moved runtime traffic to a bounded pooled connection, introduced a dedicated least-privilege runtime identity, isolated migration authority, added repeatable role provisioning, and added database-security verification. Representative commits: `f860bf6`, `e657dc6`, `18dd984`, `8d59a10`. | Resolved in source; live grants require release-time verification |
| DEP-003 | 7 September 2026 | Production routing and platform health checks did not consistently reflect Railway deployment behaviour, making releases harder to diagnose and potentially misrouting requests. | Added a dedicated health endpoint, production proxy-path handling, and health-check regression coverage. Representative commits: `b3ab131`, `e10cac7`, `62dbddd`. | Resolved |
| DEP-004 | 7–8 September 2026 | The custom domain initially served the previous website provider and later timed out during the DNS cutover. | Corrected the authoritative DNS/proxy configuration, completed Railway domain verification, allowed propagation, and verified the HTTPS site loaded. DNS evidence is external to Git. | Resolved; verify privately after DNS changes |
| DEP-005 | 8 September 2026 | Some homepage illustrations were absent from the deployed build because the required SVG assets were not present at the referenced public paths. | Added the missing public assets and corrected image references. Representative commits: `99b9704`, `faaf79e`. | Resolved |
| DEP-006 | 11 September 2026 | Authentication emails and recovery callbacks could resolve to a local-development origin after deployment, causing unusable production links. | Centralised trusted base-URL derivation, corrected app-owned confirmation and recovery callbacks, and added route tests. Representative commits: `bf8a126`, `c36200b`, `d685c9f`, `4862748`, `953f1ab`. Supabase site/redirect settings and templates were corrected separately. | Resolved; callback origins remain a deployment smoke test |
| DEP-007 | 11–15 September 2026 | Reused, expired, or invalid verification links could return error parameters without giving the user clear feedback; successful verification also lacked a clear completion state. | Added app-owned callback handling and explicit success/error feedback. Representative commits: `511b3b8`, `3a27fd9`, `953f1ab`, `cc728bf`. | Resolved |
| DEP-008 | 11–12 September 2026 | The navbar did not immediately reflect login or logout; users had to reload before the correct authenticated state appeared. | Added shared authentication-state management and updated login/logout navigation handling. Representative commits: `9c5c157`, `a8954bb`, `6dd7360`, `4bde397`, `3b297d8`. | Resolved |
| DEP-009 | 10–16 September 2026 | The account-lifecycle scheduled service failed when its origin was invalid and later encountered startup/private-network transport failures. Early failures were too coarsely reported. | Separated the browser origin from the scheduled service target, tightened target validation, added bounded transport retry and safe cause reporting, and expanded tests. Representative commits: `24dab7a`, `ae5dee0`, `ac844a0`, `05c02f0`. A later Railway run completed successfully. | Resolved |
| DEP-010 | September 2026 | Staging was reachable through a direct public hosting URL, bypassing the intended access gate. | Placed the staging hostname behind identity-aware Cloudflare Access and removed/disabled the unnecessary direct public entry point. The live access policy is external to Git. | Resolved; verify privately after hosting changes |
| DEP-011 | September 2026 | Platform logs showing dependency-manager warnings and container termination during replacement were initially interpreted as application crashes. | Distinguished non-fatal warnings and normal deployment draining from real non-zero job exits; added health checks and job-specific completion/error logging for diagnosis. | Diagnostic lesson recorded |

## Security defect and hardening history

| ID | First observed | Problem or gap | Correction and verification | Status |
| --- | --- | --- | --- | --- |
| SEC-001 | 4 September 2026 | Sensitive routes lacked a consistent shared layer for request-size limits, account/network rate limits, and outbound timeouts. | Added bounded request parsers, database-backed account/network limits, timeout helpers, and route integration with automated tests. Representative commits: `65e8a1c`, `7edc804`, `e6c5140`, `63d838c`, `91bcd57`. | Resolved; production tuning stays private |
| SEC-002 | 4–5 September 2026 | Security headers and production-only route controls were incomplete. | Added CSP, HSTS, MIME-sniffing protection, referrer/permissions policies, clickjacking protection, and production route controls with proxy tests. Representative commits: `e24adac`, `d042c74`, `574f361`, `ae6d22b`, `b8af857`. | Resolved |
| SEC-003 | 5 September 2026; extended 29 September 2026 | Cookie-authenticated mutations needed consistent origin/CSRF enforcement. Login and signup also needed protection against cross-site session creation even before a session cookie existed. | Added shared exact-origin validation for mutations and later extended the protection plus media-type validation to login/signup. Representative commits: `2741f0e`, `cfa156b`, `574f361`, `d858aa6`. | Resolved |
| SEC-004 | 5 September 2026 | Client-address handling could trust the wrong proxy header or accept malformed forwarded identifiers, weakening network-scoped abuse controls. | Made address extraction provider-aware, validated forwarded values, and added malformed-input tests. Representative commits: `cea893a`, `bf89d63`, `0a924b9`, `b0efb7c`. | Resolved; topology changes require revalidation |
| SEC-005 | 5 September 2026 | Authentication/provider errors and application logs risked revealing excessive detail or recording direct identifiers. Webhook-signature failures were not consistently observable. | Normalised public authentication failures, prevented provider details from reaching users, and introduced structured security events using pseudonymous identifiers. Added signature-failure monitoring for payment and messaging webhooks. Representative commits: `2a2d800`, `91d5f38`, `82fdca6`, `d0b1af9`. | Resolved |
| SEC-006 | 5 September 2026 | AI calls had per-request protection but lacked a distributed global daily cost/token circuit breaker. | Added database-backed reservation/settlement for a global AI budget, fail-closed handling, provider timeouts, and tests. Representative commits: `6a472c1`, `b29695f`, `e3a3da7`, `ea99caf`. | Resolved; live budget remains private |
| SEC-007 | 5 September 2026 | File-processing code needed stronger type/signature checking, archive/decompression boundaries, malware scanning, document reconstruction, timeout handling, and safe failure mapping. | Added layered validation/scanning/reconstruction controls and regression tests. Representative commits: `3bcc10b`, `36dedc9`, `5943aad`, `e345399`, `92b8ddd`, `e59bad1`. Public upload/admin routes were later removed; dormant ingestion code requires a new review before exposure. | Mitigated and not publicly exposed |
| SEC-008 | 5–16 September 2026 | An unused application administrator model and legacy administrative HTTP surfaces increased privilege and attack surface without a current product need. | Removed role checks and bypasses, deleted obsolete administration routes, removed the database model through a guarded migration, and added ownership tests. Representative commits: `24521a1`, `0843c54`, `705c67d`, `e6d6137`, `12edd3e`, `ea933a1`. | Resolved |
| SEC-009 | 4–14 September 2026 | Temporary preview, component showcase, icon-audit, and design routes were inappropriate for production and unnecessarily enlarged the public surface. | Initially blocked them in production, then deleted the obsolete routes/assets and their proxy/metadata cases. Representative commits: `b8af857`, `c0b1247`, `f006c1e`, `1a164eb`, `56b9f2d`, `c0c1573`. | Resolved |
| SEC-010 | 15 September 2026 | The CSP still required tightening and the staging scan reported policy/header observations. | Added request-scoped CSP nonce handling and tightened resource policy with tests, then re-ran the approved non-production baseline. Representative commits: `bf89dbb`, `9cd44c8`, `0e88198`. | Resolved for the recorded baseline; re-scan after routing/provider changes |
| SEC-011 | 14–15 September 2026 | Password-reset requests could be abused for enumeration, targeted email flooding, or repeated reset attempts; the user lacked a safe, explicit temporary-lock and recovery flow. | Added privacy-preserving account fingerprints, layered reset limits, bounded warning delivery, a single-use review flow, explicit state-changing confirmation, session revocation, recovery, migration/backfill tooling, and extensive tests. Representative commits: `afb2301`, `c6847b5`, `199be3f`, `c139de8`, `c4ac330`, `ff34c66`. | Resolved in source and exercised with a disposable account; periodic regression required |
| SEC-012 | 10 September 2026 | Permanent account deletion needed resistance to accidental clicks and email-link scanners, plus a recovery period and retry-safe purge. | Added password/typed confirmation, a one-time email decision, explicit confirmation, restricted pending state, cancellation, scheduled retry-safe deletion, and audit/email tests. Representative commits: `60e790b`, `f911a2b`, `6e03e61`, `85f2516`, `24dab7a`. | Resolved |
| SEC-013 | 15–16 September 2026 | Dependency, secret, and staging security checks were not yet automated or sufficiently bounded against accidental production targeting. | Added Dependabot, pinned secret scanning, an approved-target validator, a non-production ZAP baseline, and an explicit severity gate. Representative commits: `1aee72f`, `de99a54`, `6cb1531`, `75dcea9`, `3d09b23`, `8e244fd`. | Resolved as automation; alerts still require human remediation |
| SEC-014 | 15–16 September 2026 | Runtime database authority and security-event evidence needed repeatable verification and monthly operational review. | Added runtime-role provisioning/verification, privacy-safe audit persistence, evidence records, and an isolated monthly security-operations report with tests. Representative commits: `18dd984`, `3d49238`, `9ecded3`, `105718c`, `c6dca10`, `19ebb5b`. | Resolved in source; monthly human checks remain operational work |
| SEC-015 | 29 September 2026 | Marking-review records needed database-level protection in addition to route authorization. | Added row-level security and runtime grants for the marking-review tables. Representative commit: `e933cf1`. | Resolved; live migration/grants require deployment verification |
| SEC-016 | 1 November 2026 | Public documentation contained unnecessary internal host patterns, live-style tuning, exact monitoring filters, evidence links, and detailed open-control status. No live-looking credential was found, but the detail increased reconnaissance value. | Added a security policy and public-safe deployment guide, sanitised the Railway/beta/incident/pentest/backlog documentation, and moved live values/evidence requirements to the restricted operations boundary. | Corrected in the working tree; commit and deploy documentation changes |

## Open or not independently verified

| ID | Report | Current position | Required next action |
| --- | --- | --- | --- |
| OPEN-001 | GitHub currently reports release-blocking dependency advisories, including production-runtime findings. | Open. Exact advisory details stay in GitHub's security dashboard rather than this public file. | Update the affected dependency set on a dedicated branch, run the full tests/lint/build and staging smoke/security checks, then close the alerts before production deployment. |
| OPEN-002 | A client-side framework/global-error exception was reported during earlier testing. | No reproducible case or verified corrective commit was found during this history audit. | Capture browser, route, build, stack, and reproduction evidence if it recurs; do not mark resolved without a regression test. |
| OPEN-003 | The company-email setup reported incomplete sender-domain authentication during DNS migration. | The repository cannot prove the final provider DNS state. | Verify current SPF, DKIM, and DMARC alignment in the provider dashboards and with a delivered-message header, then store evidence privately. |
| OPEN-004 | A fully independent manual penetration test is required before a large public or paid launch. | The scope is prepared, but completion evidence is not recorded here. | Procure the bounded review, remediate and retest release-blocking findings, and store the report privately. |

## Updating this register

For every future deployment/security issue:

1. assign the next `DEP-*`, `SEC-*`, or `OPEN-*` identifier;
2. record the first observation without copying sensitive logs or exploit steps;
3. describe user/security impact in plain language;
4. cite the correcting commit, migration, test, or private evidence reference;
5. state whether the live environment was verified; and
6. move an item to resolved only after its regression or operational check
   passes.

Do not include credentials, private hostnames, exact defensive thresholds,
operator identities, personal data, incident evidence, or unresolved exploit
details. See [Security Policy](../SECURITY.md),
[Deployment Guide](./DEPLOYMENT.md), and
[Deployment and Security Change Process](./DEPLOYMENT_SECURITY_CHANGE_PROCESS.md), and
[Railway Security Operations](./RAILWAY_SECURITY_OPERATIONS.md).
