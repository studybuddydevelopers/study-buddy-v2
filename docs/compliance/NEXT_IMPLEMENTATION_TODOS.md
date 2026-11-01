# Next Implementation TODOs

Status: public-safe roadmap
Last updated: 1 November 2026

This file records categories and launch gates only. Detailed security and
compliance tickets—including exact weaknesses, controls, thresholds, routes,
queries, identities, owners, dates, evidence, and remediation steps—must be
maintained in the company's restricted tracker. A public checklist is not proof
that a control is implemented or effective.

## P0 — Content rights and provenance

- Obtain and privately retain the required contractor rights agreement.
- Verify rights and provenance item by item before importing or publishing
  contractor, textbook, examination-body, or third-party material.
- Keep unapproved content unavailable to learners and out of production
  retrieval indexes.
- Require an approval state, evidence reference, owner, and review date for
  every future learning resource.

Gate: no genuine past-question, textbook, or third-party claim is published
without documented rights covering the actual use.

## P0 — Children and AI

- Complete the children-and-AI data-protection and safety assessment.
- Obtain qualified independent privacy advice and documented co-founder
  approval of residual risks.
- Verify age gating, guardian authority, withdrawal, restriction, deletion,
  notice, and child-accessible support journeys.
- Keep AI and WhatsApp unavailable to users under 18 until the approved gate is
  satisfied.

Gate: the assessment, required controls, qualified review, and written approval
are complete before a minor receives AI or WhatsApp access.

## P0 — Nigerian privacy governance

- Confirm the applicable registration tier and trigger date with a qualified
  Nigerian privacy adviser or licensed DPCO.
- Formally designate a suitably qualified DPO and complete the required NDPC
  registration and renewal/change controls.
- Store submissions, receipts, certificates, advice, and DPO records privately.
- Keep public statements aligned with the official status; do not claim
  registration before it is confirmed.

Gate: required registration, governance, and evidence are complete before the
app expands beyond the approved controlled release.

## P0 — Financial records and paid service

- Implement the approved transaction-retention lifecycle and legal-hold
  governance with data minimisation and deletion evidence.
- Complete recurring-payment, renewal, cancellation, refund, webhook,
  idempotency, and customer-notification controls.
- Obtain the required accounting, tax, consumer, and legal confirmation.
- Keep live payments disabled until the paid-launch checks pass.

Gate: payment and financial-record controls are implemented, tested, monitored,
and legally reviewed before accepting live recurring payments.

## P0 — Exceptional conversation access

- Enforce the approved prohibition on routine staff reading of AI and WhatsApp
  conversations.
- Implement a least-privilege, time-limited, case-based, audited exceptional
  access process with independent approval and emergency review.
- Default to metadata and redacted context; prohibit bulk browsing and ordinary
  downloads.
- Review access evidence regularly and investigate any use outside the approved
  purpose or scope.

Gate: every exceptional access is attributable, justified, minimal,
time-limited, and reviewable without copying conversation content into logs.

## P0 — Security verification and operations

- Maintain least-privilege runtime and migration identities.
- Verify authentication, recovery, authorization, lifecycle, deletion,
  webhook, AI-budget, and enabled upload/payment controls in staging.
- Maintain actionable availability, abuse, provider, scheduled-job, security,
  and unusual-cost alerts.
- Complete backup restoration, provider-access review, secret scanning,
  dependency review, and approved non-production security scanning on the
  documented cadence.
- Complete a bounded independent manual security review before a large public
  or paid launch and close/retest all critical and high findings.

Gate: current private evidence exists and no release-blocking finding remains
open.

## P1 — Retention and deletion

- Reconcile database, object storage, backups, logs, AI providers, email,
  messaging, payment, and hosting copies against the approved schedule.
- Automate approved expiry and deletion while preserving documented legal holds.
- Verify that deleted data cannot return to ordinary live processing after a
  restoration.
- Maintain privacy-safe deletion evidence and sample it on a fixed cadence.

## P1 — Privacy operations

- Operate access, correction, restriction, objection, withdrawal, portability,
  and deletion requests through the approved secure procedure.
- Maintain a restricted request register and a secure, expiring export-delivery
  method outside source control.
- Test provider searches, exports, identity verification, refusals, complaints,
  and appeal/human-review routes.
- Add self-service privacy tooling only after the email-first process is proven.

## P1 — Incident readiness

- Maintain the restricted incident register, evidence store, contact roster,
  provider escalations, out-of-band alert path, and approved notice templates.
- Run a child-focused personal-data-breach tabletop exercise and track every
  corrective action privately.
- Test evidence preservation, credential/session containment, provider contact,
  notification decision-making, recovery, and closure.

## P2 — Future conversation-based AI improvement

- Keep conversation training/evaluation disabled by default.
- Before any activation, implement explicit participation, child safeguards,
  de-identification, dataset isolation, access control, lineage, withdrawal,
  deletion, retention, evaluation, updated notices, and a revised assessment.
- Obtain qualified legal/privacy review and written activation approval.

Gate: no conversation is used for Study Buddy model training or evaluation
without the separately approved and implemented workflow.

## Private ticket requirements

Each restricted ticket should contain:

- accountable owner and reviewer;
- affected environment and data classification;
- precise acceptance criteria and rollback plan;
- required migration/configuration without secret values in the ticket body;
- test cases and evidence location;
- due date, status, residual risk, and approval; and
- a public-safe completion note, if one is needed here.

Do not copy private tickets, screenshots, logs, environment exports,
penetration-test findings, or provider evidence into this repository.

See [Security Policy](../../SECURITY.md), [Deployment Guide](../DEPLOYMENT.md),
[Beta Readiness](../BETA_READINESS.md), and
[Personal Data Breach Response Plan](./PERSONAL_DATA_BREACH_RESPONSE_PLAN.md).
