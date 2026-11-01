# Deployment and Security Change Process

Last reviewed: 1 November 2026

This is the required change-control process for anything that can affect the
deployment, security, privacy, reliability, or recovery of Study Buddy. It
applies to application code, configuration, infrastructure, databases,
providers, DNS, dependencies, monitoring, scheduled jobs, and documentation.

The process is intentionally public-safe. It explains what maintainers must do
without publishing live values, internal topology, defensive thresholds,
access rosters, evidence, or unresolved security findings.

## Public and private records

The public repository may contain:

- control objectives and review processes;
- environment-variable names with non-secret placeholders;
- generic validation commands;
- resolved issue summaries; and
- links between the relevant public documents.

The restricted operations system must contain:

- real environment values, secrets, service names, hostnames, IDs, and URLs;
- exact quotas, thresholds, schedules, budgets, and alert routing;
- provider access and recovery contacts;
- deployment, migration, backup, restoration, and scan evidence;
- open vulnerability, penetration-test, and incident details; and
- approvals, risk acceptances, and temporary-access records.

Do not copy restricted material into commits, pull requests, issues, chat
screenshots, build logs, or public documentation.

## Change classes

Classify the change before work begins:

| Class | Examples | Minimum control |
| --- | --- | --- |
| Routine | Documentation, non-sensitive observability, or a backward-compatible application change | One implementer, normal review, proportionate tests |
| Security-sensitive | Authentication, authorization, secrets, database privileges, payments, webhooks, child data, AI controls, uploads, CSP, origin checks, rate limits, providers, DNS, or recovery | Named implementer and separate reviewer, staging verification, rollback plan, private evidence |
| Emergency | Active incident, exposed secret, exploitable production defect, or material outage | Incident lead, smallest safe correction, immediate verification, follow-up review and permanent remediation |

When uncertain, use the security-sensitive process. A change does not become
routine merely because it is small.

## Required change record

Create a private change record before implementation. Record:

- change ID, owner, reviewer, reason, and intended outcome;
- affected environments, services, providers, data, and users;
- security, privacy, availability, cost, and compliance risks;
- code, configuration, schema, permissions, or provider settings affected;
- test and monitoring plan;
- migration, compatibility, and rollback plan;
- approval and communication requirements;
- private evidence location; and
- completion, rollback, or follow-up status.

Never place real secrets or complete environment exports in the change record.
Reference the approved secret store instead.

## Standard process

### 1. Prepare

1. Define the expected behaviour and measurable success criteria.
2. Record the current state privately without exposing sensitive values.
3. Identify abuse cases, failure modes, affected data, and legal/privacy impact.
4. Use a dedicated branch based on the intended target branch.
5. Plan backward compatibility, deployment order, monitoring, and rollback.
6. Confirm staging is isolated from production and uses separate credentials
   and synthetic or approved test data.
7. Obtain an additional reviewer for a security-sensitive change.

### 2. Implement

1. Make the smallest change that satisfies the recorded outcome.
2. Preserve least privilege, deny-by-default behaviour, bounded inputs,
   timeouts, safe errors, and redacted logs.
3. Add or update automated regression tests for the changed control.
4. Add new variable names and safe placeholders to `.env.example`; never add
   live values.
5. Keep migrations forward-compatible wherever practical. Application code
   must tolerate the deployment order recorded in the change plan.
6. Update the relevant public documentation and private runbook together.

### 3. Verify locally and in CI

Run the checks proportionate to the change, normally including dependency
installation, targeted tests, the wider test suite, linting, type/build checks,
secret scanning, and dependency review. A security-sensitive change must not
be merged with an unexplained failed check.

Do not use production data or credentials in local or CI verification. Treat
unexpected secret-scanner or dependency findings as security work rather than
silencing the control.

### 4. Verify in staging

1. Deploy the exact candidate revision to the protected staging environment.
2. Apply migrations with the migration identity, then verify that the runtime
   identity still has only its intended privileges.
3. Exercise success, rejection, abuse, timeout, retry, and rollback paths with
   disposable accounts or synthetic data.
4. Confirm security headers, origin checks, authentication, monitoring,
   scheduled jobs, provider callbacks, and alerts affected by the change.
5. Run the approved bounded security scan when the public surface, routing,
   authentication, dependencies, or headers change.
6. Store results privately and resolve release-blocking findings before
   production.

Staging success is necessary but does not itself authorize production.

### 5. Approve and release

Before production, the owner and reviewer confirm that:

- CI and staging checks passed against the candidate revision;
- backup and restoration evidence is current for a data-affecting change;
- migrations, configuration, application deployment, and provider changes are
  in the recorded order;
- rollback ownership and stop conditions are clear;
- monitoring and support coverage are available; and
- legal, privacy, or child-safety approval is recorded when applicable.

Apply database changes through the controlled migration workflow. Deploy the
approved immutable revision, run narrow production smoke checks, and monitor
the affected signals. Do not broaden permissions or disable controls to make a
release pass.

### 6. Close the change

1. Confirm user-facing behaviour, jobs, alerts, logs, and provider delivery.
2. Remove temporary access, diagnostic settings, allow rules, and credentials.
3. Rotate any temporary or exposed credential and verify the previous value no
   longer works.
4. Store evidence and approvals in the restricted operations system.
5. Update the deployment/security fix history when a bug or control gap was
   corrected.
6. Record follow-up work with an owner and due date; do not hide it in release
   notes.

## Process by change type

### Environment or configuration

- Document the variable name, purpose, owner, validation rule, environments,
  and safe default.
- Add only a placeholder and explanation to `.env.example`.
- Apply the value through the approved provider or secret store, not a commit.
- Redeploy if the platform does not reload variables dynamically.
- Verify behaviour without printing the value, then record evidence privately.

### Secret creation or rotation

- Use a distinct secret per environment and purpose.
- Grant it only to the service that needs it.
- Where supported, introduce the new value, deploy, verify, revoke the old
  value, and verify revocation.
- Treat accidental disclosure as an incident even if the text is later
  deleted; repository history and logs may retain it.

### Database schema, role, or grant

- Review data loss, locking, compatibility, row-level security, ownership, and
  rollback implications.
- Test the migration on an isolated database and back up affected production
  data before a material change.
- Use separate migration and runtime identities.
- After migration, verify schema state, runtime grants, policy enforcement, and
  application smoke tests. Never use a broad owner identity as the normal
  application runtime identity.

### Authentication, authorization, or account lifecycle

- Test unauthenticated, wrong-user, expired, replayed, cross-origin, locked,
  and rate-limited paths as applicable.
- Keep public errors non-enumerating and logs pseudonymous.
- Verify session revocation, email-link handling, recovery, and audit evidence
  where the change affects them.
- Require a separate reviewer and disposable-account staging exercise.

### Edge, proxy, CSP, headers, CAPTCHA, or rate limits

- Validate the trusted proxy boundary before relying on client addresses.
- Test normal users, shared networks, callbacks, email flows, and signed
  webhooks so abuse controls do not create unsafe lockouts.
- Keep exact live rules and thresholds private.
- Re-run header and approved staging security checks after routing or policy
  changes.

### Dependency or security advisory

- Triage privately using reachability, runtime use, severity, and exposure.
- Update on a dedicated branch and review lockfile and transitive changes.
- Run the full test, lint, build, staging smoke, and relevant security checks.
- Do not publish exploit details for an unresolved production dependency.

### Provider, DNS, domain, or transactional email

- Verify ownership, least-privilege access, MFA, billing ownership, recovery,
  and the provider agreement before use.
- Plan propagation and rollback before changing DNS or routing.
- Verify TLS, application routing, sender authentication, callbacks, and
  delivered-message headers as applicable.
- Remove obsolete records and access only after the replacement is proven.

### Monitoring, alerts, or scheduled jobs

- Give each job a narrow identity, authenticated target, timeout, retry bound,
  idempotent behaviour, and observable success/failure signal.
- Test one controlled execution before enabling its schedule.
- Verify recipients and escalation privately without publishing their details.
- Alert on missing expected runs as well as explicit failures.

### Upload, scanning, or document processing

- Keep upload surfaces disabled until the full validation, size/decompression,
  malware scanning, reconstruction, storage, and failure paths pass review.
- Fail closed when a required scanner is unavailable.
- Use harmless test fixtures; do not commit live malware or sensitive user
  documents.

### AI model, grounding, quota, or provider

- Evaluate answer quality, grounding relevance, unsafe output, prompt
  injection, data disclosure, latency, and cost before promotion.
- Keep per-user and global circuit breakers enabled and privately tuned.
- Confirm provider data settings, child-safety restrictions, and privacy copy
  still match actual behaviour.
- Record model and prompt version, evaluation result, and rollback target.

### Emergency security correction

1. Start the incident process and preserve evidence.
2. Contain the issue with the smallest reversible change.
3. Rotate exposed credentials and revoke unsafe access when applicable.
4. Verify containment and monitor for continued misuse.
5. Complete normal review, tests, documentation, root-cause analysis, and
   permanent remediation immediately after stabilisation.

An emergency does not justify publishing sensitive details or leaving a
temporary control in place without an owner and expiry.

## Stop and rollback conditions

Stop or roll back when a release causes unexplained authentication failures,
permission expansion, data corruption, secret exposure, callback/signature
failure, security-control bypass, material error or latency regression,
unexpected AI spend, or loss of monitoring. Start the incident procedure when
confidentiality or integrity may have been affected; application rollback
alone is not sufficient.

Avoid destructive database rollback. Prefer a compatible application rollback
and a reviewed forward correction unless the approved recovery plan explicitly
requires otherwise.

## Documentation update map

| Change | Public update | Private update |
| --- | --- | --- |
| New configuration | `.env.example` and relevant guide | Real value, owner, rotation and verification evidence |
| Deployment behaviour | `docs/DEPLOYMENT.md` | Provider steps, identifiers, evidence and rollback target |
| Railway/security control | `docs/RAILWAY_SECURITY_OPERATIONS.md` | Live rules, schedules, topology and access |
| Bug or control correction | `docs/DEPLOYMENT_SECURITY_FIX_HISTORY.md` | Logs, findings, incident or scan evidence |
| Vulnerability reporting | `SECURITY.md` | Triage, responder and disclosure record |
| Product/security behaviour | README or feature guide | Approval, risk and operational evidence |

## Definition of done

A deployment or security change is complete only when:

- the intended behaviour and risk were recorded;
- the correct reviewer approved it;
- automated and staging checks passed;
- production was verified without exposing secrets or personal data;
- monitoring, rollback, and recovery remain effective;
- temporary access and settings were removed;
- public and private documentation were updated; and
- remaining work has an owner and due date.

Review this process at least quarterly and after a material incident, provider
change, architecture change, failed recovery exercise, or independent security
review.

See [Deployment Guide](./DEPLOYMENT.md),
[Railway Security Operations](./RAILWAY_SECURITY_OPERATIONS.md),
[Deployment and Security Fix History](./DEPLOYMENT_SECURITY_FIX_HISTORY.md),
[Security Policy](../SECURITY.md), and
[Beta Readiness](./BETA_READINESS.md).
