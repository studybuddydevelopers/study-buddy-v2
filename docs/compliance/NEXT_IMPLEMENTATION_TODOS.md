# Next Implementation TODOs

Status: ordered engineering queue  
Last updated: 12 September 2026

This file turns approved retention decisions into concrete engineering work.
Items stay open until their acceptance checks pass in staging and the relevant
production configuration or migration is verified. Do not treat an approved
policy sentence as proof that its automation exists.

## P0 — Execute the contractor rights agreement and enforce the content gate

No textbook or material represented as a genuine past examination question is
currently shown to users, and Study Buddy has confirmed its rights to the
current learner-visible explanations. Contrary to an earlier record, the
contractor has not signed a rights agreement. Chijindu Oreh owns this as the
next content-rights priority.

- [ ] Obtain a signed written assignment or sufficiently broad licence covering
  the contractor's original deliverables and the intended storage, editing,
  digitisation, publication, database, AI/retrieval, and commercial uses.
- [ ] Require a resource/source schedule and warranties identifying any WAEC,
  textbook, examiner, publisher, or other third-party material. Do not treat the
  contractor agreement as transferring rights the contractor does not own.
- [ ] Store the executed agreement and supporting evidence privately, record a
  non-confidential reference in the content-rights register, and have a
  qualified lawyer review the final wording where possible.
- [ ] Keep all contractor spreadsheets and derived records out of production
  imports and learner-visible pages until the agreement and item-level rights
  checks pass.
- [ ] Add a publication control requiring every future resource to have a source,
  rights basis, permitted uses, evidence reference, owner, review date, and
  approval state. Genuine past questions and textbooks stay disabled until the
  necessary owner/examination-body permission is recorded.

Acceptance criteria:

1. The contractor agreement is signed and stored in the restricted company
   legal records.
2. Every imported item is mapped to evidence of a right that covers its actual
   use; an agreement never cures unidentified third-party rights.
3. Unapproved resources cannot be published or described as genuine past
   examination questions.

## P0 — Complete and approve the children-and-AI DPIA

Chijindu Oreh is the accountable internal assessment owner and coordinator. He
does not become the formal DPO merely by owning this work.

- [ ] Complete the assessment against the production data map, guardian flow,
  AI/WhatsApp processing, providers, retention, access, security, incident, and
  international-transfer controls.
- [ ] Appoint or engage the qualified DPO and obtain that person's review, or
  obtain equivalent review from another qualified Nigerian privacy adviser
  while the formal appointment is completed.
- [ ] Resolve or formally reject each recommended control, record residual
  risks, and obtain dated approval from Nick Efe Oni and Chijindu Oreh.
- [ ] Keep AI and WhatsApp access unavailable to real users aged 13–17 until the
  assessment, controls, qualified review, and written approval are complete.
- [ ] Re-open the DPIA after any material change to child access, AI use,
  providers, content training/evaluation, schools, advertising, or tracking.

Acceptance criteria:

1. Chijindu Oreh has completed the DPIA and its evidence checklist.
2. A qualified reviewer has recorded advice and both founders have signed the
   residual-risk decision.
3. No production minor receives AI or WhatsApp access before the gate passes.

## P0 — Complete the required NDPC registration and DPO designation

Study Buddy is the data controller for its current direct-to-user service and
meets the current DCPMI designation through the education-sector criterion. The
best working tier is MDP-OHL, but an education app is not expressly named in the
NDPC's examples, so the tier and registration trigger date require written
confirmation. The forecast of fewer than 200 users does not remove the
registration duty.

- [ ] Engage a licensed DPCO or qualified Nigerian privacy adviser to confirm in
  writing the likely MDP-OHL tier and the date on which Study Buddy became, or
  will become, a DCPMI.
- [ ] Formally designate one DPO with expert knowledge of data-protection law
  and practice. Record whether the role is held by a suitably qualified employee
  or an external service provider, publish the approved contact details, and
  notify the NDPC as required. The founders may continue to support the DPO as
  joint privacy leads.
- [ ] Prepare the registration information: company and DPO details; personal-
  data categories and approximate data-subject numbers; processing purposes;
  recipient and processor categories; destination countries; material risks;
  safeguards; and security measures.
- [ ] Submit the registration through the NDPC channel within the applicable
  six-month period, pay the fee for the tier the NDPC confirms, and store the
  receipt, submission, and certificate in the restricted company compliance
  store rather than in this repository.
- [ ] Record the renewal date and owners. If OHL and still below 200 data
  subjects, renew annually and document the NDPC's current CAR exemption; reassess
  immediately if scale, processing, sector, or the assigned tier changes.
- [ ] Add a control to notify the NDPC of significant changes to registered
  information within 60 days, including changes to the DPO, processing,
  processors, destinations, risks, safeguards, or security measures.

Acceptance criteria:

1. Written tier/trigger-date advice and the formal DPO appointment are retained.
2. The NDPC submission is complete, paid, and supported by a certificate or
   other official acknowledgement.
3. Annual renewal and 60-day change-notification reminders have named owners.
4. Public and internal records use the assigned tier and never claim
   registration before official confirmation is received.

## P0 — Implement the approved seven-year transaction lifecycle

This is the next implementation task. The current `Transaction` relation uses
`onDelete: SetNull`, so permanent account deletion keeps the minimal financial
row while removing its ordinary user link. The application does not yet expire
those rows after seven years or provide a structured legal-hold mechanism.

Required work:

- [ ] Add a migration with a per-transaction retention-expiry timestamp and
  narrowly scoped legal-hold fields. A hold must include a reason, authorised
  owner, start date, review date, and release record.
- [ ] Backfill existing transactions to expire seven years after `createdAt` and
  set the same expiry whenever the Paystack verification or webhook route
  creates a new transaction.
- [ ] Confirm that the retained ledger contains the minimum evidence needed for
  accounting, tax, refund, and chargeback handling. Do not add full card
  numbers, CVVs, PINs, bank credentials, or unnecessary account-profile data.
- [ ] Add a bounded, retryable retention job that deletes or irreversibly
  anonymises expired transactions only when no active documented hold applies.
- [ ] Integrate the job with the authenticated Railway lifecycle cron and return
  counts rather than transaction identifiers or payer details.
- [ ] Record privacy-safe deletion evidence: run time, examined count, deleted or
  anonymised count, held count, failures, and the policy/version applied.
- [ ] Add unit tests for the seven-year boundary, leap years, active/released
  holds, batching, retries, account deletion, and log redaction.
- [ ] Add a migration/backfill runbook, rollback plan, alerting for failed jobs,
  and a production verification query.
- [ ] Obtain accountant or Nigerian legal confirmation before enabling automatic
  deletion, because CAMA and tax-record calculations must be applied correctly
  to Study Buddy's accounting year and any transition-period records.

Acceptance criteria:

1. New and existing transactions have the correct expiry date.
2. Account deletion removes the ordinary user link without prematurely deleting
   required financial evidence.
3. The job never removes a record under an active, reviewable legal hold.
4. An expired, unheld test record is removed in staging and produces no sensitive
   log content.
5. The production cron completes successfully and monitoring alerts on failure.

## P0 — Enforce the approved conversation-access rule

The public rule now prohibits routine staff reading of individual AI and
WhatsApp conversations. During beta, only Nick Efe Oni and Chijindu Oreh may
perform an exceptional review, and only for one of the approved documented
support, safety, security, technical, fraud/abuse, or legal cases. Database
credentials and an ordinary administrator screen are not an acceptable review
workflow.

- [ ] Build a restricted, time-limited break-glass review path; do not add
  conversation content to the general user administration interface.
- [ ] Require a case identifier, permitted reason, requesting/affected user,
  approver, reviewer, start time, expiry time, and a written minimum-scope
  justification before content can be revealed.
- [ ] Default to metadata and redacted context; reveal only the minimum messages
  needed when less intrusive information cannot resolve the case.
- [ ] Record tamper-resistant audit events for approval, access, message scope,
  export, expiry, and case closure without copying conversation text into logs.
- [ ] Require the second co-founder to approve proactive access. Permit an
  emergency child-safety or imminent-harm review without prior approval only
  when delay would materially increase risk, followed by documented second
  review within 24 hours.
- [ ] Prevent downloads and bulk browsing by default, prohibit use of personal
  email/tools, and automatically revoke access when its case window expires.
- [ ] Add a monthly audit-log review and an incident escalation for any access
  outside the approved cases or scope.
- [ ] Test direct-object-reference resistance, role bypass, expired access,
  minimum-message scoping, audit completeness, and sensitive-log redaction.

Acceptance criteria:

1. Neither a normal user nor a general administration session can read another
   user's conversation.
2. Every exceptional access is attributable, justified, scoped, time-limited,
   and reviewable without storing message content in the audit log.
3. The emergency path requires retrospective review within 24 hours and alerts
   if that review is overdue.
4. Conversation content is not available for marketing, general surveillance,
   routine product improvement, or training/evaluation outside the separately
   approved de-identified and opted-in future workflow.

## P1 — Password-reset abuse alerts and user-controlled temporary lock

Notify a verified account owner when the account-specific password-reset limit
is first exceeded. The email must say that someone made several reset requests,
ask whether it was the owner, and offer a secure way to temporarily lock the
account. It must not state that compromise definitely occurred.

- [ ] Trigger the alert only for an existing, verified account and only on the
  first account-scoped rejection in a rate-limit window. Keep the public API
  status, response body, timing, and redirect behaviour indistinguishable for
  existing and nonexistent accounts.
- [ ] Add a separate alert cooldown and daily cap so an attacker cannot use the
  password-reset form to flood a victim's inbox. An IP-only limit must not send
  alerts to every submitted address.
- [ ] Send the alert asynchronously through the approved transactional-email
  provider. Do not include passwords, reset tokens, full IP addresses, or other
  sensitive diagnostics in the email or application logs.
- [ ] Use calm wording: “Someone made several password-reset requests for your
  Study Buddy account. If this was you, no action is needed.” Include the time
  and an approximate location only if both are accurate and privacy-approved.
- [ ] Add a short-lived, single-use, cryptographically random lock-review token;
  store only its hash and never log the token or complete link.
- [ ] Make the email link open a review/confirmation page. Require an explicit
  POST confirmation before locking so email-security scanners and link-preview
  bots cannot change account state merely by opening the link.
- [ ] Decide and document the temporary-lock duration and recovery route. The
  lock must revoke active sessions, block new sign-ins and sensitive actions,
  preserve the account's data, and provide a verified way to unlock or obtain
  support without weakening password-reset protections.
- [ ] Record privacy-safe audit events for alert requested/sent/suppressed,
  lock confirmed, sessions revoked, unlock, expiry, and delivery failure.
- [ ] Test account-enumeration resistance, concurrent threshold crossings,
  cooldown enforcement, email bombing, expired/reused tokens, scanner GETs,
  CSRF, session revocation, restricted-account states, and recovery.

Acceptance criteria:

1. Crossing an account-specific password-reset limit sends at most one useful
   alert within the approved cooldown and does not reveal whether an account
   exists to the requester.
2. Merely opening or previewing the email link cannot lock the account.
3. A confirmed lock promptly revokes sessions and prevents authentication and
   sensitive actions until the documented unlock condition is satisfied.
4. Alert and lock logs contain no email address, raw token, password, complete
   IP address, or email-link query string.

## P1 — Finish the remaining retention controls

- [ ] Verify that Supabase, Railway, OpenAI, Meta/WhatsApp, Paystack, and email
  provider copies follow their documented deletion and backup periods.
- [ ] Capture dated evidence that OpenAI API-data sharing for model improvement
  is disabled, restrict who can change the setting, and recheck it after any
  OpenAI organisation-owner or data-control change.
- [ ] Prove that deleted data cannot be restored into normal live use from a
  backup and that the approved 90-day backup maximum is achievable.
- [ ] Decide and automate expiry for unfinished cloud practice drafts,
  recommendation rows, AI generation metadata, rate-limit/usage records,
  guardian-authorisation evidence, support records, and security events.
- [ ] Add a central deletion-evidence register and a quarterly sample audit owned
  by the appointed joint privacy leads.

## P1 — Privacy operations needed for beta

- [x] Approve the email-first procedure for access, correction, restriction,
  objection, consent withdrawal, portability, and human-review requests, with a
  two-working-day acknowledgement target and 30-calendar-day completion target.
- [ ] Create the access-restricted privacy-request register outside the source
  repository using the fields in `DATA_SUBJECT_RIGHTS_REQUEST_PROCEDURE.md`.
- [ ] Create and test a temporary, private export location and expiring-link
  delivery process; do not send full unencrypted exports as ordinary email
  attachments.
- [ ] Add a reviewed export checklist/tool covering every current Study Buddy
  database table and active provider, using JSON or CSV where eligible.
- [ ] Future feature: build **Settings → Privacy and data** for authenticated
  request submission and status tracking. Keep `privacy@studybuddyng.com` as an
  accessible fallback.
- [ ] Build a restricted operator action for a verified withdrawal request sent
  to `privacy@studybuddyng.com`; do not expose a general admin or self-service
  endpoint. It must verify the requesting adult against the authorisation record,
  atomically mark the grant withdrawn, disable AI access, restrict the account,
  terminate sessions, record an append-only event and case reference, and notify
  both the student and adult.
- [ ] Add the restricted pending-choice state for reauthorisation or permanent
  deletion, define its maximum retention period, and test both outcomes.
- [ ] Test account access, correction, restriction, objection, portability, and
  deletion workflows end to end.

## P1 — Before enabling automatically renewing paid subscriptions

Paid checkout remains disabled during the current beta. The co-founders have
approved automatic renewal for future paid subscriptions, but approval does not
mean recurring billing is implemented or ready for customers.

- [ ] Align the approved cancellation and refund behaviour with the Terms,
  Refund Policy, checkout copy, support procedure, and Paystack setup. Apart
  from automatic prorated cancellation refunds, the only grounds are duplicate
  payment, paid service not provided, Study Buddy discontinuing a prepaid
  service, or a refund required by Nigerian consumer law.
- [ ] Show the total recurring price, currency, billing period, expected first
  renewal timing, cancellation method, and material plan limits immediately
  before payment authorisation.
- [ ] Require an explicit recurring-payment action and store privacy-safe proof
  of the accepted terms/version, timestamp, plan, amount, currency, and billing
  frequency.
- [ ] Implement the appropriate Paystack recurring-payment mechanism without
  storing full card numbers, CVVs, PINs, bank credentials, or reusable secrets
  in application records or logs.
- [ ] Verify renewal, successful/failed charge, duplicate webhook, retry,
  cancellation, expiry, plan-change, and chargeback state transitions. Webhook
  handling must remain signature-verified, idempotent, and safely retryable.
- [ ] Add **Settings → Subscription → Cancel subscription** with a deliberate
  confirmation step. It must stop the next renewal, preserve paid access through
  the cancellation date only, end paid access that day, and send an account-email
  confirmation.
- [ ] At cancellation, calculate the unused time from the cancellation timestamp
  to the next scheduled renewal, prorate in the transaction currency using a
  documented and consistently rounded smallest-unit calculation, and initiate
  the refund automatically through the original payment method. Make the refund
  idempotent so retries or duplicate webhooks cannot issue it twice.
- [ ] Show the calculated cancellation date and estimated prorated refund before
  confirmation, then include the initiated refund amount/reference in the email
  without exposing sensitive payment data. Clearly separate Study Buddy's
  initiation from provider/bank settlement time.
- [ ] Support `billing@studybuddyng.com` as an accessible fallback. Authenticate
  the requester using the account email and payment reference without collecting
  card, bank-login, password, PIN, CVV, or one-time-code data.
- [ ] Send clear purchase, renewal, cancellation, payment-failure, and refund
  notices where required by the approved operating policy and applicable law.
- [ ] Complete accountant and Nigerian consumer-law review and run staging plus
  production-mode sandbox tests before replacing the Paystack placeholder or
  allowing the first recurring charge.

Acceptance criteria:

1. No paid subscription can begin without explicit, recorded recurring-billing
   authorisation for the exact price and frequency shown.
2. Customers can stop the next renewal through the approved route, and duplicate
   or delayed provider events cannot reactivate a cancelled subscription.
3. Payment and webhook logs contain no card or bank credentials and preserve the
   approved minimum seven-year financial evidence.
4. Consumer-law review, operational support ownership, and end-to-end Paystack
   tests are complete before paid launch.

## P2 — Later breach-response operational setup

The Question 43 responsibilities, containment steps, and statutory notification
deadlines already apply and are not postponed by moving this setup work into the
later queue. Until the permanent tools below exist, the acting incident
commander must use an encrypted, access-restricted local case file, preserve an
encrypted backup, and follow `PERSONAL_DATA_BREACH_RESPONSE_PLAN.md`.

- [ ] Create the separate personal-data-breach register with named owners,
  access restrictions, deadlines, and escalation rules in the company Microsoft
  365 OneDrive. Require MFA, named access only, no public links, separate raw-
  evidence storage, and an encrypted minimal offline recovery copy.
- [ ] Give Chijindu Oreh a separate secured company identity for security-mailbox
  and OneDrive access. Until then, configure named guest access with MFA and use
  a private Signal message or call for the minimal out-of-band alert without
  forwarding incident data to personal email or ordinary chat.
- [ ] Exchange and test the founders' private Signal contact route. Use it only
  for a minimal incident alert; keep raw personal data in the restricted case
  file and approved provider systems.
- [ ] Complete the private emergency roster with provider escalation paths,
  personal out-of-band contact details, and the appointed DPCO/privacy adviser;
  do not commit private contact information to this repository.
- [ ] Run and record an exposed-child-AI-chat tabletop exercise and provider
  escalation test; repeat at least annually and after major architectural
  changes.

## P2 — Before enabling conversation-based AI improvement

The co-founders approved future use of selected conversations to train or
evaluate Study Buddy's own AI. It is not part of the current beta: existing
evaluation scripts use purpose-built fixtures. Keep every ingestion, export,
dataset-building, evaluation, fine-tuning, and training path for user
conversations disabled until all of the following are complete.

- [ ] Complete and sign a revised children-and-AI DPIA and obtain qualified
  Nigerian privacy review of the purpose, consent language, provider roles, and
  international transfers.
- [ ] Build a separate, granular, off-by-default consent screen. Adults must opt
  in; ages 13–17 require parent/legal-guardian authorisation and an affirmative
  student choice. Refusal must not reduce ordinary service access.
- [ ] Version the notice and consent, record who authorised which purpose and
  dataset use, and provide an equally easy withdrawal route.
- [ ] Create a de-identification and sensitive/third-party-data screening
  pipeline with documented re-identification tests and human escalation that
  does not expose raw conversations for routine review.
- [ ] Isolate source and derived datasets from production, encrypt them, apply
  least privilege, prohibit personal tools/downloads, and audit every query,
  export, transform, training run, and deletion.
- [ ] Define approved sampling rules and retention periods for source samples,
  derived datasets, evaluation reports, checkpoints, and trained artefacts.
- [ ] Implement dataset lineage and membership records so withdrawal and account
  deletion stop future use and remove eligible source/derived copies.
- [ ] Before model training, explain any technical limit on removing a
  contribution already incorporated into a model and prevent training unless
  the user or authorising adult accepted that exact versioned notice.
- [ ] Test for memorisation, personal-data leakage, prompt extraction, child
  safety regressions, bias, and re-identification before and after every model
  release.
- [ ] Review every training/evaluation provider separately. The confirmed OpenAI
  opt-out from improving OpenAI's models does not by itself authorise customer
  fine-tuning, evaluation uploads, or another provider.
- [ ] Add a kill switch, release approval, monitoring, rollback, incident path,
  periodic consent/access audit, and evidence that the feature remains disabled
  until approval.

Acceptance criteria:

1. No production conversation can enter an evaluation or training dataset
   without an active, versioned and age-appropriate choice for that exact use.
2. The dataset contains no direct identifiers and passes documented sensitive-
   data, re-identification, and memorisation tests.
3. Withdrawal prevents new use and removes eligible dataset copies with
   auditable evidence; disclosed model-deletion limits match actual behaviour.
4. Staff cannot browse raw user conversations through the improvement workflow.
5. A privacy adviser and both co-founders sign the revised DPIA and release gate
   before the production feature flag can be enabled.
