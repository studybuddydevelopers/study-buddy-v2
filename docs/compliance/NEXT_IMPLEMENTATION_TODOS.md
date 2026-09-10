# Next Implementation TODOs

Status: ordered engineering queue  
Last updated: 10 September 2026

This file turns approved retention decisions into concrete engineering work.
Items stay open until their acceptance checks pass in staging and the relevant
production configuration or migration is verified. Do not treat an approved
policy sentence as proof that its automation exists.

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

## P1 — Finish the remaining retention controls

- [ ] Verify that Supabase, Railway, OpenAI, Meta/WhatsApp, Paystack, and email
  provider copies follow their documented deletion and backup periods.
- [ ] Prove that deleted data cannot be restored into normal live use from a
  backup and that the approved 90-day backup maximum is achievable.
- [ ] Decide and automate expiry for unfinished cloud practice drafts,
  recommendation rows, AI generation metadata, rate-limit/usage records,
  guardian-authorisation evidence, support records, and security events.
- [ ] Add a central deletion-evidence register and a quarterly sample audit owned
  by the appointed privacy lead.

## P1 — Privacy operations needed for beta

- [ ] Add guardian self-service withdrawal and ensure withdrawal immediately
  restricts the relevant child features and records an append-only event.
- [ ] Create secure privacy-request and personal-data-breach registers with named
  owners, access restrictions, deadlines, and escalation rules.
- [ ] Test account access, correction, restriction, objection, portability, and
  deletion workflows end to end.
- [ ] Run and record the incident-response exercise and provider escalation test.

