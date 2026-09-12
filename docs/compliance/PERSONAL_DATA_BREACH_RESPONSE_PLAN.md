# Personal Data Breach Response Plan

Status: approved working procedure — secure register setup, external contact,
mailbox resilience, and exercise evidence pending

Owner: Nick Efe Oni (primary incident commander); Chijindu Oreh (backup)

Last reviewed: 12 September 2026

## Purpose

This plan applies to suspected or confirmed loss, destruction, alteration,
unauthorised disclosure of, or access to personal data. Examples include an
account takeover, exposed database credential, AI prompt leakage, lost
administrative device, misdirected export, malicious insider action, provider
incident, or—in a future school service—a school access-control failure.

The Nigeria Data Protection Act 2023 requires notification to the Nigeria Data
Protection Commission within 72 hours after awareness when a breach is likely to
risk individuals’ rights and freedoms. A high-risk breach must be communicated
to affected data subjects immediately in plain language. All personal-data
breaches must be recorded, including those that do not meet a notification
threshold. Incomplete information may be provided in phases without undue delay.

## Emergency contacts

Keep an offline copy of this table and the private contact details needed to use
each secure channel. Personal phone numbers and credentials must not be committed
to this repository.

| Role | Primary contact | Backup contact | Secure channel |
| --- | --- | --- | --- |
| Incident commander | Nick Efe Oni | Chijindu Oreh | `security@studybuddyng.com`, followed by the founders' private Signal message or call |
| Engineering/security lead | Nick Efe Oni | Chijindu Oreh | Restricted incident channel and provider dashboards |
| Joint privacy leads and mandatory breach contacts | Nick Efe Oni and Chijindu Oreh | Each other | `security@studybuddyng.com`; copy `privacy@studybuddyng.com` |
| Company notification decision | Nick Efe Oni and Chijindu Oreh jointly | Acting incident commander when the other is unavailable and a deadline cannot wait | Restricted decision record |
| Communications/support lead | Chijindu Oreh | Nick Efe Oni | Approved notice templates and company mailboxes |
| External privacy adviser/DPCO | To be engaged | Proceed without waiting when urgent containment or the 72-hour deadline requires action | Record in the private contact roster when appointed |
| Cyber-insurance contact | Not confirmed | Not confirmed | Not confirmed |
| Supabase escalation | Pending | Pending | Provider portal |
| Railway escalation | Pending | Pending | Provider portal |
| Cloudflare escalation | Pending | Pending | Provider portal |
| OpenAI escalation | Pending | Pending | Provider portal |
| Meta/WhatsApp escalation | Pending | Pending | Provider portal |
| Paystack escalation | Pending | Pending | Provider portal |

Privacy contact: `privacy@studybuddyng.com`
Joint privacy leads: Nick Efe Oni and Chijindu Oreh
Security contact: `security@studybuddyng.com`
Mandatory internal breach contacts: Nick Efe Oni and Chijindu Oreh; send to
`security@studybuddyng.com` and copy `privacy@studybuddyng.com`
NDPC breach portal: [services.ndpc.gov.ng/breach](https://services.ndpc.gov.ng/breach/)

The incident commander directs the response and owns the timeline; this does not
remove the joint privacy leads' responsibilities. Chijindu Oreh automatically
becomes incident commander when Nick Efe Oni is unavailable, is affected by a
conflict, or delegates the role. The acting commander may contain the incident
immediately and may make a time-critical regulator notification after recording
the available facts when waiting for the other founder or an external adviser
would risk missing the legal deadline. When the notification threshold remains
genuinely uncertain near the deadline, the conservative default is to notify
with the available information and follow up in phases.

## First report

Anyone who suspects a breach must immediately:

1. preserve evidence and note the UTC discovery time;
2. notify both Nick Efe Oni and Chijindu Oreh immediately by sending the report
   to `security@studybuddyng.com` and copying `privacy@studybuddyng.com`;
3. avoid deleting logs, contacting an attacker, or making public claims;
4. use a secure channel rather than the affected system where possible; and
5. record only necessary incident details, not copies of exposed personal data.

The founder who first sees the report must alert the other through a private
Signal message or call using only the incident identifier and an instruction to
join the restricted response channel. Do not forward raw personal data into
personal email or ordinary chat. Until both founders have separate secured
company identities with mailbox access, Nick Efe Oni monitors the company
security mailbox and the Signal alert is the backup route.

The 72-hour assessment clock is measured from organisational awareness, not from
the end of the investigation. Record the awareness decision and its basis.

## Response timeline

### First hour

- Open an incident identifier and appoint the incident commander.
- Restrict access to the incident channel and evidence store.
- Confirm whether personal data may be involved.
- Contain ongoing exposure without destroying forensic evidence.
- Revoke or rotate affected credentials and sessions when safe.
- Preserve relevant application, database, provider, and audit logs, plus school
  logs if a future school service is involved.

### First 4 hours

- Identify affected systems, categories of data, people, approximate volumes,
  start time, continuing access, and geographic/provider scope.
- Assess whether children, AI conversations, passwords/tokens, payment data,
  sensitive data, or future school records are involved.
- Contact relevant providers under their incident procedures.
- Begin the risk assessment and notification decision record.

### First 24 hours

- Confirm containment and safe service restoration plan.
- Evaluate likelihood and severity of identity theft, discrimination, physical or
  psychological harm, confidentiality loss, fraud, account takeover, academic or
  safeguarding harm.
- Draft the NDPC notice if the legal threshold may be met.
- Draft an age-appropriate affected-person notice if high risk is possible.
- Brief only authorised decision-makers; do not minimise uncertainty.

### Before 72 hours

- Both privacy leads decide and record whether NDPC notification is required;
  the acting incident commander follows the time-critical rule above if joint
  review is unavailable.
- Submit the available notice on time when required, even if investigation is
  incomplete, and provide updates as permitted.
- If notification is not made, record a reasoned threshold assessment.
- Communicate immediately to affected individuals if high risk is established,
  unless a lawful exception applies and is documented.

## Risk assessment

Record:

- what happened and whether the breach is continuing;
- data categories, sensitivity, volume, and identifiability;
- number and type of people, especially children or vulnerable learners;
- security measures such as encryption or effective de-identification;
- likely consequences and ease of misuse;
- affected countries, schools, and providers;
- containment and mitigation already completed; and
- initial, current, and residual risk ratings with decision owners.

Use Low only where harm is unlikely, Medium where harm is reasonably possible,
High where serious harm is likely or impact is severe, and Critical for ongoing
or widespread high-risk exposure requiring executive and external coordination.

## Required notification content

A regulator or affected-person notice should, as applicable, include:

- the nature and known timing of the breach;
- categories and approximate numbers of people and records;
- privacy contact details;
- likely consequences;
- measures taken or proposed;
- practical steps the person can take;
- what remains under investigation; and
- when the next update will be provided.

Notices must be accurate, plain, non-blaming, accessible, and age-appropriate.
Do not disclose details that create a new security risk.

## Child-specific response

- Notify and support the child in language they can understand.
- Determine whether and how to notify a parent or guardian without creating a
  safeguarding risk. Contact a school only when a specific legal or urgent
  safety reason requires it; the current product gives schools no account data
  access.
- Provide a trusted-adult and non-digital support route.
- Prioritise exposed AI conversations, contact details, school links, or content
  that could enable bullying, coercion, exploitation, or physical targeting.
- Remove harmful exposed content and invalidate links or tokens rapidly.

## Recovery and closure

- Validate patches and access controls before full restoration.
- Monitor for misuse, repeat access, complaints, and credential attacks.
- Offer proportionate support such as password reset, account monitoring,
  corrected school records, or refund assistance.
- Complete a root-cause analysis without blaming individuals for system failures.
- Track corrective actions to named owners and dates.
- Update the DPIA, provider register, retention schedule, training, and notices.
- Close only after privacy/security approval and preservation of required records.

## Breach register fields

Keep the register in a restricted folder in the company's Microsoft 365
OneDrive, not this repository. Require MFA, disable public/anonymous links, give
access only to Nick Efe Oni, Chijindu Oreh through a named identity, and an
appointed privacy adviser when necessary, and review access quarterly. Until
Chijindu has a separate company identity, named guest access with MFA may be
used as a temporary measure; do not share the folder through an unrestricted
link. Keep an encrypted offline recovery copy of the minimal register so that a
Microsoft 365 incident does not make the response record unavailable.

This permanent setup is in the later implementation queue. Until it is ready,
the acting incident commander must create an encrypted, access-restricted local
case file, keep an encrypted backup on a separate controlled device, and share
only the minimum necessary information with the other founder through the
restricted incident channel. The temporary file must later be migrated into the
permanent register and securely removed from the temporary devices.

The register contains: incident ID, detection and awareness times, reporter,
systems, data and people affected, child/sensitive-data flags, timeline,
containment, risk decision, NDPC decision/time/reference, data-subject notice
decision/time, provider notifications, actions, owner, closure date, and lessons
learned. Store raw evidence in a separate restricted incident folder and link it
by reference; do not duplicate exposed personal data into the register.

## Notification decision record

For every incident, record one of these outcomes before closure:

- **No personal-data breach:** explain the evidence supporting that conclusion.
- **Breach unlikely to risk rights and freedoms:** do not notify the NDPC, but
  retain the reasoned assessment in the breach register.
- **Breach likely to risk rights and freedoms:** notify the NDPC within 72 hours
  of awareness through the current official channel, even if facts must be
  supplied in phases.
- **High risk to affected people:** notify the NDPC as required and communicate
  to affected people immediately in accessible, plain, age-appropriate language,
  unless a specific lawful exception is documented.

Notification is a risk decision, not a public-relations decision. Cost,
embarrassment, uncertainty, or the absence of an external adviser is not a
reason to delay or suppress a legally required notice.

## Exercises

The tabletop exercise is in the later implementation queue. When scheduled, use
an exposed child AI-chat scenario, record participants, response times,
notification-decision quality, gaps, and owners, then repeat at least annually
and after a major architectural change. A future school service must add a
school permission-failure scenario before activation. Deferring the exercise
does not defer the response and notification duties in this plan.
