# Personal Data Breach Response Plan

Status: operating draft — contact roster and regulator workflow pending  
Owner: incident commander to be appointed  
Last reviewed: 8 September 2026

## Purpose

This plan applies to suspected or confirmed loss, destruction, alteration,
unauthorised disclosure of, or access to personal data. Examples include an
account takeover, exposed database credential, school access-control failure,
AI prompt leakage, lost administrative device, misdirected export, malicious
insider action, or provider incident.

The Nigeria Data Protection Act 2023 requires notification to the Nigeria Data
Protection Commission within 72 hours after awareness when a breach is likely to
risk individuals’ rights and freedoms. A high-risk breach must be communicated
to affected data subjects immediately in plain language. Legal/privacy must
confirm each decision and any applicable GAID procedure.

## Emergency contacts

Complete this table before launch and keep an offline copy.

| Role | Primary contact | Backup contact | Secure channel |
| --- | --- | --- | --- |
| Incident commander | Pending | Pending | Pending |
| Engineering/security lead | Pending | Pending | Pending |
| Privacy lead/DPO | Pending | Pending | Pending |
| Company decision-maker | Pending | Pending | Pending |
| Communications/support lead | Pending | Pending | Pending |
| External privacy adviser/DPCO | Pending | Pending | Pending |
| Cyber-insurance contact | Not confirmed | Not confirmed | Not confirmed |
| Supabase escalation | Pending | Pending | Provider portal |
| Railway escalation | Pending | Pending | Provider portal |
| Cloudflare escalation | Pending | Pending | Provider portal |
| OpenAI escalation | Pending | Pending | Provider portal |
| Meta/WhatsApp escalation | Pending | Pending | Provider portal |
| Paystack escalation | Pending | Pending | Provider portal |

Privacy contact: `sbstudybuddy0@gmail.com`  
NDPC contact: [ndpc.gov.ng/contact](https://www.ndpc.gov.ng/contact/)

## First report

Anyone who suspects a breach must immediately:

1. preserve evidence and note the UTC discovery time;
2. contact the incident commander and security/privacy leads;
3. avoid deleting logs, contacting an attacker, or making public claims;
4. use a secure channel rather than the affected system where possible; and
5. record only necessary incident details, not copies of exposed personal data.

The 72-hour assessment clock is measured from organisational awareness, not from
the end of the investigation. Record the awareness decision and its basis.

## Response timeline

### First hour

- Open an incident identifier and appoint the incident commander.
- Restrict access to the incident channel and evidence store.
- Confirm whether personal data may be involved.
- Contain ongoing exposure without destroying forensic evidence.
- Revoke or rotate affected credentials and sessions when safe.
- Preserve relevant application, database, provider, school, and audit logs.

### First 4 hours

- Identify affected systems, categories of data, people, approximate volumes,
  start time, continuing access, and geographic/provider scope.
- Assess whether children, AI conversations, passwords/tokens, payment data,
  school records, or sensitive data are involved.
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

- Privacy/legal decides and records whether NDPC notification is required.
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
- Determine whether and how to notify a parent, guardian, or school without
  creating a safeguarding risk.
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

Keep the register in a secure system, not this repository: incident ID, detection
and awareness times, reporter, systems, data and people affected, child/sensitive
data flags, timeline, containment, risk decision, NDPC decision/time/reference,
data-subject notice decision/time, provider notifications, actions, owner,
closure date, and lessons learned.

## Exercises

Run at least an annual exercise and after major architectural change. Include a
scenario involving a school permission failure or exposed child AI chat. Record
participants, response times, notification decision quality, gaps, and owners.
