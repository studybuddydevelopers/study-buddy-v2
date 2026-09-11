# Parent and Legal Guardian Authorisation Record

Status: operating record specification — core product workflow implemented

Owner: to be appointed

Last reviewed: 9 September 2026

## Purpose

This document defines the evidence Study Buddy retains when a parent or legal
guardian decides a child’s account request. It is not the live register. Never
place real student, parent, or guardian personal data in this repository.

The live record must be stored in an access-controlled production system with
encryption, audit logging, retention controls, and access limited to authorised
privacy/support staff.

## Approved launch decision

For the current direct-to-learner product:

- minimum account age is 13;
- independent account activation begins at 18;
- ages 13–17 require a parent or legal guardian decision through an expiring,
  one-time email link;
- a school is not an authoriser in the current workflow;
- the account is restricted before approval;
- AI access is a separate optional guardian choice; and
- withdrawal currently uses the verified privacy-email process while an online
  guardian self-service route remains pending.

## Minimum live-record fields

| Field | Description |
| --- | --- |
| `authorizationId` | Random internal identifier |
| `studentUserId` | Internal student identifier; avoid duplicating name/email |
| `studentAgeBand` | Approved age band rather than full date of birth where possible |
| `authorizerType` | Parent or legal guardian |
| `authorizerUserId` or secure reference | Link to the authorisation record and email control evidence |
| `relationshipOrRole` | Declared relationship to child |
| `verificationMethod` | Current launch method is an email link plus authority declaration; manual review may supplement it |
| `verificationLevel` | Low, standard, or enhanced assurance based on documented policy |
| `noticeVersion` | Version of the privacy notice shown |
| `termsVersion` | Version of the terms accepted |
| `featureScope` | Web account, AI chat, WhatsApp, school reporting, payments, or other approved feature |
| `decision` | Granted, denied, withdrawn, expired, or superseded |
| `recordedAt` | UTC timestamp of the event |
| `effectiveAt` | UTC timestamp from which the decision applies |
| `expiresAt` | Expiry/reconfirmation date if used |
| `withdrawnAt` | UTC withdrawal timestamp where relevant |
| `sourceIpOrSecurityReference` | Minimized security evidence; avoid retaining raw IP longer than necessary |
| `evidenceReference` | Secure pointer to evidence; do not store unnecessary identity-document copies |
| `recordedBy` | System or authorised staff identifier |
| `notesCode` | Standard reason code; free text only when necessary |

Records should be append-only events. Do not overwrite an earlier decision;
create a new event that supersedes or withdraws it so the audit history remains
clear.

## Recommended workflow

1. Ask the learner for an age band using neutral language.
2. If authorisation is required, limit the account until verification completes.
3. Show the Parent and Student Privacy Notice and the relevant Terms of Service.
4. Send the parent or legal guardian a single-use, expiring verification link.
5. Explain the data, features, school visibility, AI use, withdrawal route, and
   consequences of declining.
6. Record the authorisation event and versions of every notice accepted.
7. Enable only the feature scope that was authorised.
8. Send confirmation to the authoriser and an age-appropriate confirmation to
   the learner.
9. Reconfirm when the feature scope or processing changes materially.

The flow must not use dark patterns, bundle optional marketing consent, or make
privacy settings harder to reject than accept.

## Verification evidence

- Routine verification uses the student's declared date of birth, the adult's
  control of the guardian email link, and the adult's declaration of authority.
- Do not routinely request identity documents.
- Request minimal, proportionate additional evidence only when age,
  relationship, or authority is disputed, inconsistent, or appears suspicious.
- Delete raw additional evidence after recording the verification result unless
  a documented legal requirement justifies limited retention.

## Withdrawal and disputes

- Accept withdrawal only through a verified request to
  `privacy@studybuddyng.com`; do not add a self-service route unless the policy
  changes.
- Verify the requester without collecting excessive new information.
- Immediately sign the child out, restrict the account, stop new AI and WhatsApp
  activity, and notify both the child and adult after verification.
- Retain existing data securely only while the adult chooses reauthorisation or
  permanent deletion, except for limited retention required by law.
- Record withdrawal as a new event and record the later reauthorisation or
  permanent-deletion decision.
- Escalate safeguarding conflicts to the appointed privacy/safeguarding owner.

## Access control

- Students may see whether an authorisation is active and its feature scope.
- Verified authorisers may see their own authorisation events.
- School staff have no access in the current product. Any future school role
  requires a separate approved design, notice, agreement, and access-control test.
- Support staff should see the minimum information required to resolve a case.
- Every administrative view or change must create an audit event.

## Retention

Keep evidence only for the approved period needed to demonstrate lawful
authorisation, respond to disputes, and meet legal duties. Prefer a verification
result and evidence reference over copies of identity documents. Apply the
approved Data Retention and Deletion Schedule and legal holds.

## Implementation acceptance tests

- [x] A child who requires authorisation cannot access restricted features first.
- [x] The authoriser sees current policy versions before deciding.
- [x] Links are single-use, expire, and cannot authorise a different account.
- [x] Consent is not preselected or bundled with marketing.
- [x] Routine age/authority evidence is minimised to date of birth, email-link
  control, and the adult declaration; stepped-up evidence is exception-only.
- [ ] Every grant, denial, expiry, and withdrawal creates an append-only event. Grant, denial, expiry, replacement and resend events are implemented; the operator withdrawal action remains pending.
- [ ] Verified-email withdrawal signs the child out, restricts features, stops
  new AI/WhatsApp activity, notifies both parties, and enters the approved
  reauthorisation-or-deletion review state.
- [ ] Support cannot disclose child data without verifying authority.
- [x] School staff cannot authorise or view learners because no school-facing
  account or access role is currently provided.
- [ ] Logs and evidence expire according to the approved retention schedule.
- [ ] The process works with keyboard and screen-reader navigation.
