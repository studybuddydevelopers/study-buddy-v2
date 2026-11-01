# Beta Readiness

Last reviewed: 1 November 2026

This is a public-safe summary, not the live launch register. The restricted
company register contains current owners, dates, environment identifiers,
test accounts, evidence links, open findings, thresholds, and go/no-go
decisions. Those details must not be committed to this public repository.

## Current position

Study Buddy can be deployed as a controlled beta, but a reachable site and a
successful build are not launch approval. The recommended first release remains
free and invite-only, with the smallest practical number of users and support
capacity.

Keep the following disabled until their separate gates pass:

- live or automatically renewing payments;
- AI or WhatsApp access for users under 18 before the children-and-AI assessment
  and guardian controls are approved;
- school/teacher access;
- public upload or ingestion surfaces; and
- resource-grounded claims or genuine past-question/textbook content without
  validated evidence and rights.

## Evidence already expected

The private release record should confirm the latest result for:

- build, lint, automated tests, and dependency review;
- the dedicated least-privilege database runtime identity;
- production authentication, verification, recovery, logout, and account-state
  smoke tests;
- account deletion and scheduled lifecycle work;
- security headers, origin protection, request limits, and AI budget controls;
- transactional email delivery and callback origins;
- anonymous staging security scanning; and
- the custom domain, TLS, health checks, and deployment rollback path.

Public documentation does not record live account counts, exact limits,
connection-pool values, test identities, run URLs, or detailed test results.

## Frontend acceptance

Use the [website guide](WEBSITE_GUIDE.md) for current routes and behaviour and
the [UI review checklist](DMCTN_UI_TASTE_GATE.md) for release checks, including
320px layouts, keyboard/focus behaviour, loading/empty/error states, metadata
and low-data preferences. Remaining nested main landmarks in account/settings
views need follow-up; do not claim site-wide accessibility conformance.

Automated component/route tests are not live browser evidence. Notifications
have source and automated coverage, but their migration and live staging
behaviour were not verified in the 1 November 2026 frontend documentation
update. Record release acceptance privately rather than inferring it from
these documents or a passing build.

## Required before inviting beta users

1. Verify health, error, authentication-abuse, webhook, email, scheduled-job,
   deletion, and unusual-AI-use alerts in the target environment.
2. Complete a backup restoration into an isolated environment and record that
   deleted data cannot silently return to normal live use.
3. Confirm staging and production are isolated and that private staging access
   is enforced.
4. Complete the privacy-request and incident-response operating setup, including
   secure evidence storage and out-of-band contact resilience.
5. Complete the children-and-AI assessment and qualified review before any
   invited user under 18 receives AI or WhatsApp access.
6. Keep contractor and third-party learning material unpublished until rights
   and provenance are documented item by item.
7. Run mobile, desktop, keyboard, low-bandwidth, and account-lifecycle smoke
   tests against the release candidate.
8. Verify every company mailbox used for support, privacy, security, and billing
   has a named daily owner and recovery method.
9. Record a co-founder go/no-go decision and the accepted residual risks in the
   restricted launch register.

## Required before public or paid launch

- Complete the approved payment, renewal, cancellation, refund, transaction
  retention, and finance controls.
- Complete applicable Nigerian privacy registration, DPO, child-protection,
  transfer, and legal-review work.
- Commission the bounded independent manual security review described in
  [Independent Security Review](./INDEPENDENT_SECURITY_REVIEW.md).
- Close and retest every critical or high-severity finding. Any accepted medium
  risk needs a named owner, reason, target date, and approval in the restricted
  risk register.
- Re-run the production-readiness checks after all material remediation.

## Beta exit criteria

- No open critical/high defect in authentication, authorisation, privacy
  deletion, enabled payment/upload flows, or AI abuse controls.
- Health, logs, alerts, scheduled jobs, backups, restoration, and rollback have
  current private evidence.
- Core journeys pass on supported mobile and desktop browsers and with
  keyboard-only navigation.
- Support and incident channels have tested ownership and escalation.
- User feedback and safety reports are reviewed on a fixed cadence.
- The independent review gate is satisfied before expanding to a large public
  or paid launch.

## Documentation rule

Update this file when the categories or launch gates change. Update the private
launch register when a value, owner, result, vulnerability, test account, or
environment-specific status changes. Never copy private evidence into this
file.

See [Deployment Guide](./DEPLOYMENT.md),
[Railway Security Operations](./RAILWAY_SECURITY_OPERATIONS.md), and
[Security Policy](../SECURITY.md).
