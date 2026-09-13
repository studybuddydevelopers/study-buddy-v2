# Beta Readiness

Last updated: 13 September 2026

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

## Completed production checks

- On 13 September 2026, the operator confirmed that the latest navbar/auth-state
  update was deployed and that the production authentication smoke checks were
  completed. Re-run these checks after material authentication changes.

## Work required before the controlled beta

1. **Not started:** Configure actionable monitoring/alerts for health failures, 429 spikes,
   repeated login failures, webhook-signature failures, lifecycle-cron failures,
   email failures, and unusual AI usage or spend.
2. **Not yet verified:** Verify the Railway runtime database URL/role and connection-pool settings,
   backup expiry/restoration controls, remaining provider regions, and secret
   rotation. Supabase's primary project region is confirmed as North EU
   (Stockholm), Sweden (`eu-north-1`).
3. **Status to confirm:** Establish the secure privacy-request/breach registers, assign the remaining
   incident roles and provider escalations, and exercise the rollback/incident
   procedure. Nick Efe Oni and Chijindu Oreh are already the mandatory internal
   breach contacts through `security@studybuddyng.com`, with the privacy mailbox
   copied.
4. **Not started:** Implement and test the approved verified-guardian withdrawal operator action:
   validate a request sent to `privacy@studybuddyng.com`, revoke the child's
   sessions, restrict the account and AI/WhatsApp activity, notify both parties,
   and hold the account securely while the guardian selects reauthorisation or
   permanent deletion.
5. **Ongoing:** Chijindu Oreh must complete and coordinate the children-and-AI DPIA, obtain
   qualified privacy review, and secure recorded co-founder approval before any
   invited user aged 13–17 receives AI or WhatsApp access. Then run the child-
   focused AI safety test and accessibility smoke test across the sign-up,
   guardian, chat, settings, and privacy-request paths.
6. **Ongoing:** Keep contractor material unpublished until Chijindu Oreh obtains the signed
   rights agreement. Confirm every live learning resource's provenance and
   display an explicit beta notice, feedback route, known limitations, and
   support contact. Do not display textbooks or describe content as genuine past
   examination questions until the required rights are documented.
7. **Not started:** Run the staging OWASP ZAP workflow against the release candidate and resolve
   high-confidence high/critical findings before inviting users.
8. **Not started:** Complete the password-reset abuse alert and user-confirmed temporary-account-
   lock workflow specified in `compliance/NEXT_IMPLEMENTATION_TODOS.md`. Keep
   public reset responses indistinguishable and prevent email previews from
   changing account state.
9. **Not started; upload use is conditional:** Fix the remaining upload-service test isolation failure. The application has
   admin-only resource and curriculum upload API routes even though it currently
   has no ordinary-user upload interface. Before using those admin routes in
   production, verify the private ClamAV service and Ghostscript CDR path with
   harmless test files; otherwise keep the routes unused.
10. **Ongoing:** Study Buddy meets the DCPMI designation through the education-sector
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
