# Data Subject Rights Request Procedure

Status: approved email-first beta procedure; in-app request centre is a future
feature  
Owners: Nick Efe Oni and Chijindu Oreh (joint privacy leads)  
Request address: `privacy@studybuddyng.com`  
Last reviewed: 12 September 2026

## Purpose

This procedure covers requests to access, correct, restrict, object to the use
of, withdraw consent for, port, or obtain human review of personal data. Account
and chat deletion use their existing product controls where available, but may
also be requested through the privacy mailbox.

During beta, email is the official route. A signed-in **Settings → Privacy and
data** request centre is a future feature and must not be advertised as
available until it is implemented and tested.

Authoritative references:

- [Nigeria Data Protection Act 2023](https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf)
- [NDPC Data Subject Access Request form](https://forms.ndpc.gov.ng/dsar-request/)

## Rights covered

- Access: explain the processing and provide an eligible copy of the person's
  personal data.
- Correction: correct inaccurate or incomplete personal data and propagate the
  correction where reasonably required.
- Restriction: pause or limit disputed or otherwise eligible processing while
  retaining only what remains lawfully necessary.
- Objection: assess and, where required, stop processing based on legitimate
  interests or another objectionable purpose.
- Consent withdrawal: stop the consent-based activity and downstream transfer
  where applicable. Withdrawal does not make earlier lawful processing
  unlawful.
- Portability: provide eligible user-supplied data in a structured, commonly
  used, machine-readable format such as JSON or CSV.
- Automated-decision review: arrange meaningful human review of a solely
  automated decision with a legal or similarly significant effect, if Study
  Buddy introduces one. No such production decision is currently intended.

## 1. Intake and acknowledgement

1. The requester emails `privacy@studybuddyng.com` and describes the right they
   wish to exercise and the relevant account.
2. Both joint privacy leads have access to the mailbox. One becomes case owner
   and the other reviewer; both remain accountable for completion.
3. Acknowledge receipt within two working days. Do not include personal data in
   the subject line or acknowledgement beyond what is necessary.
4. Create a case in the restricted privacy-request register. Do not place live
   request records, identity evidence, or exports in this repository.

## 2. Verification

- Prefer low-risk verification: a current authenticated session where an
  existing control supports it, or confirmation through the email address
  already recorded on the account.
- If the request arrives from another address, verify through the recorded
  account address when doing so will not create a safety or compromise risk.
- Ask only for the minimum additional information reasonably necessary when
  identity, account control, age, or authority is disputed, inconsistent, or
  suspicious. Do not routinely demand government identification.
- A parent or legal guardian acting for a 13–17-year-old must be matched to the
  authorisation record and must demonstrate continuing authority. Consider the
  child's own rights, understanding, confidentiality, and safety before
  disclosing information to the adult.
- Do not reveal whether an unrelated email address has an account before
  verification succeeds.

## 3. Deadlines and triage

- Acknowledge within two working days.
- Complete the request without undue delay and within 30 calendar days after a
  sufficiently verified request is received.
- Record the received, acknowledged, verification, due, action, review, and
  completion dates. Escalate an at-risk deadline to both privacy leads.
- Prioritise an urgent restriction, consent withdrawal, suspected compromise,
  or child-safety request immediately rather than waiting for the outer
  deadline.
- If more information is genuinely necessary, request it promptly and explain
  what is needed. If applicable law permits more time, notify the requester
  before the original deadline and record the lawful reason and revised date.

## 4. Search and assessment

The case owner identifies all systems likely to contain the relevant data,
including Supabase Auth and PostgreSQL, storage, Railway application logs,
Cloudflare security data, Resend delivery data, OpenAI processing records,
GoDaddy/Microsoft 365 correspondence, and any other provider approved at the
time of the request.

For each system, record:

- whether responsive personal data was found;
- the source, purpose, lawful basis, recipients, retention period, and transfer
  information where an access explanation requires them;
- any correction, restriction, objection, withdrawal, or provider instruction;
- any information withheld to protect another person, security, legal
  privilege, a legal obligation, or another documented lawful exception; and
- the person who performed and reviewed the action.

Searches and exports must not silently expose another person's data. Redact or
separate third-party information where required.

## 5. Fulfilment by request type

- **Access:** provide an understandable summary plus an eligible copy of the
  person's data.
- **Correction:** verify the accurate replacement value, update the source of
  truth, propagate it to relevant providers or derived records where required,
  and tell the requester what changed.
- **Restriction:** apply the available account or processing restriction,
  prevent incompatible new use, notify relevant processors where required, and
  record any data that must remain for a legal obligation or claim.
- **Objection:** identify the processing and lawful basis, stop it when the
  objection must prevail, or document and explain the specific overriding lawful
  reason if it continues.
- **Consent withdrawal:** stop the consent-based feature and relevant future
  disclosures promptly. Use the approved guardian-withdrawal procedure for a
  child account. Explain any core feature that can no longer be provided.
- **Portability:** provide eligible data supplied by the user in JSON or CSV.
  Portability must not reveal another person's data or compromise security.
- **Human review:** preserve the relevant inputs and output, assign a competent
  person who was not merely rubber-stamping the automated result, allow the user
  to explain their position, and communicate the reviewed outcome.

## 6. Secure delivery

- Deliver an export only after verification through a private, time-limited
  download link tied to the verified recipient. Do not attach an unencrypted
  full export to ordinary email.
- Use a short expiry appropriate to the risk, revoke the link after successful
  delivery or expiry, and record delivery without copying the exported personal
  data into the case notes.
- Store working exports only in an access-restricted temporary location and
  securely delete them after confirmed delivery or expiry under the approved
  operational retention rule.
- If secure delivery is unavailable, pause delivery and escalate to both privacy
  leads; do not substitute an insecure channel merely to meet the deadline.

## 7. Refusal, limitation, and complaint

A right may be limited only for a documented lawful reason. The response must
identify what was completed, what was refused or limited, the reason in clear
language, and how the requester may ask Study Buddy to reconsider or complain
to the [Nigeria Data Protection Commission](https://www.ndpc.gov.ng/contact/).
The second privacy lead reviews every full or partial refusal before it is sent.

## 8. Request register

The restricted register contains no more than:

- case reference and request type;
- requester/account reference and whether a child or representative is
  involved;
- received, acknowledgement, verification, due, action, review, and completion
  dates;
- verification method and result without unnecessary identity-document copies;
- systems/providers searched and actions taken;
- exceptions, refusal reasons, complaints, and escalation;
- case owner and reviewer; and
- secure-delivery method, expiry, and confirmation without storing the export
  itself.

Access is limited to the joint privacy leads and any specifically authorised
privacy adviser. The register's retention period must be approved in the data
retention schedule; it must not be kept indefinitely by default.

## 9. Quality control and future automation

- Use two-person review for exports, refusals, guardian disclosures, and
  high-risk restrictions before release where urgency permits.
- Test the process end to end using synthetic data before relying on it for a
  live request.
- Review a privacy-safe sample of closed cases quarterly for missed systems,
  excessive verification, missed deadlines, insecure delivery, and incomplete
  provider actions.
- The future in-app request centre must use authenticated requests, confirmation
  for high-risk actions, status tracking, accessible explanations, and the same
  case register and review rules. It does not replace the email route.
