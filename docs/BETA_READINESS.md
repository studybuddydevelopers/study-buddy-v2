# Beta Readiness

Last updated: 11 September 2026

## Current position

Study Buddy is technically capable of running as a beta: the application builds,
the core test suite passes, Railway and the custom domain are active, Cloudflare
is in front of the site, and the principal authentication, rate-limit, AI-budget,
security-header, account-lifecycle, and deletion controls are implemented.

The recommended first release is a **free, invite-only beta for 20–50 users**,
consistent with the current first-year estimate of approximately 50 registered
users. Approximately 40 users (80%) are expected to be under 18, so the beta
must be operated as a predominantly child-facing service.
Keep paid checkout disabled while the Paystack secret remains a placeholder and
until automatic-renewal implementation, cancellation, refund, finance, and
provider-review work is closed.
Do not enable future school access. Limit administrative upload features to the
properly configured malware-scanning/CDR environment.

## Estimate

| Milestone | Estimate | Assumptions |
| --- | --- | --- |
| Controlled free beta | 5–10 focused working days | No critical defect in production smoke tests; email, AI, database, and guardian flows work with production settings; co-founders can make outstanding operational decisions promptly |
| Public beta including paid subscriptions | 3–6 weeks plus external review time | Approved automatic renewal, same-day cancellation and refund rules are implemented, live Paystack setup, monitoring, vendor evidence, and legal/privacy review are completed |

External provider responses, accountant/legal review, or a critical production
defect can extend these ranges. The site being reachable is not by itself a beta
readiness sign-off.

## Work required before the controlled beta

1. Complete production smoke tests for adult sign-up, age gating, guardian
   authorisation and verified-email withdrawal, login/logout, password reset, AI
   chat, quotas, settings, deactivation, reactivation, and the staged deletion
   path.
2. Re-test the app-owned verification and password-reset callbacks after their
   next deployment, and complete production smoke tests for guardian, warning,
   and deletion messages. Supabase Auth with Resend custom SMTP is enabled and
   production verification/reset delivery has been exercised.
3. Configure actionable monitoring/alerts for health failures, 429 spikes,
   repeated login failures, webhook-signature failures, lifecycle-cron failures,
   email failures, and unusual AI usage or spend.
4. Verify the Railway runtime database URL/role and connection-pool settings,
   backup expiry/restoration controls, remaining provider regions, and secret
   rotation. Supabase's primary project region is confirmed as North EU
   (Stockholm), Sweden (`eu-north-1`).
5. Establish the secure privacy-request/breach registers, assign the remaining
   incident roles and provider escalations, and exercise the rollback/incident
   procedure. Nick Efe Oni and Chijindu Oreh are already the mandatory internal
   breach contacts through `security@studybuddyng.com`, with the privacy mailbox
   copied.
6. Run a child-focused AI safety test and accessibility smoke test across the
   sign-up, guardian, chat, settings, and privacy-request paths.
7. Confirm learning-content provenance and display an explicit beta notice,
   feedback route, known limitations, and support contact.
8. Run the staging OWASP ZAP workflow against the release candidate and resolve
   high-confidence high/critical findings before inviting users.
9. Study Buddy meets the DCPMI designation through the education-sector
   criterion and is likely MDP-OHL. Obtain written confirmation of the tier and
   six-month trigger date from a qualified Nigerian privacy adviser or licensed
   DPCO, formally designate a qualified DPO, and complete registration by that
   deadline without waiting to reach 200 users. Current registration status is
   **required — not yet filed**.

The approved seven-year transaction lifecycle is the next engineering task and
is specified in
[`NEXT_IMPLEMENTATION_TODOS.md`](./compliance/NEXT_IMPLEMENTATION_TODOS.md).
It is not a blocker for a free beta with payments disabled, but it must be
complete before paid production use creates records that require automated
retention enforcement.

## Beta exit criteria

- No open critical/high defect in authentication, authorisation, payments,
  privacy deletion, file upload, or AI abuse controls.
- Production health, logs, alerts, cron jobs, backups, and rollback are verified.
- Core journeys pass on mobile and desktop with keyboard-only checks.
- Support, privacy, security, and incident mailboxes have an assigned daily owner.
- Beta feedback is reviewed on a fixed cadence and releases have a rollback path.
- Co-founders record a go/no-go decision and accepted residual risks.
