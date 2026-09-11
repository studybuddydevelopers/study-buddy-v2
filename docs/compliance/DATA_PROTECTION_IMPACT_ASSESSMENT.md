# Study Buddy Data Protection Impact Assessment

Status: preliminary working assessment — not approved for launch  
Assessment date: 5 September 2026  
Last updated: 11 September 2026
Assessment owner: to be appointed  
Approver: co-founders and qualified Nigerian privacy adviser  
Next review: before production launch and after any material processing change

## 1. Decision and scope

Study Buddy processes children’s account and learning data, provides AI chat,
creates progress and recommendation profiles, and supports WhatsApp messaging.
These activities can create a high risk to data subjects and should not launch
without a completed DPIA and approved controls.

The current first-year planning estimate is approximately 50 registered users,
with about 40 (80%) expected to be under 18. These forecasts are not technical
account limits and do not by themselves determine Study Buddy's NDPC
registration or DCPMI classification. The expected child majority means that
child safeguards must be part of the normal product design rather than an edge
case.

This assessment covers:

- registration, authentication, account recovery, and profiles;
- practice answers, drafts, mock exams, progress, and recommendations;
- web AI chat and legacy AI-question threads;
- WhatsApp tutoring messages and account linkage;
- subscriptions, transaction records, and Paystack verification;
- security logs, rate limiting, CAPTCHA, and hosting logs; and
- administrative learning-resource ingestion and review.

It does not cover a future school-facing service, human-tutor marketplace,
advertising, behavioural analytics, or mobile application. Each would require a
new or revised DPIA. The launch decision is that the current product provides no
school or teacher accounts and no school-staff access to student data.

## 2. Why a DPIA is required

The processing involves vulnerable data subjects, profiling, new AI technology,
systematic learning records, and an online service. Section 28 of the Nigeria
Data Protection Act 2023 and Article 28/Schedule 4 of the NDP Act GAID 2025
require a DPIA where processing is likely to create high risk.

Authoritative references:

- [Nigeria Data Protection Act 2023](https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf)
- [NDP Act General Application and Implementation Directive 2025](https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf)

## 3. Data subjects and data

| Data subjects | Relevant data |
| --- | --- |
| Students, including children | Identity, contact details, profile, learning activity, answers, scores, progress, recommendations, AI and WhatsApp messages, device and security data |
| Parents and guardians | Identity, contact details, relationship or authority evidence, authorisation and withdrawal records, support messages |
| Individual subscribers or payers | Account identifiers, plan, amount, currency, transaction reference and status |
| Administrators and content reviewers | Identity, role, resource actions, approval and security logs |

Users must be instructed not to submit passwords, full payment details, health
information, intimate information, or unnecessary third-party data to AI chat.
However, accidental sensitive-data submission remains a foreseeable risk.

## 4. Processing map

| Activity | Source | Main system or recipient | Output/retention point |
| --- | --- | --- | --- |
| Registration and sign-in | Student/adult | Study Buddy, Supabase Auth, Resend custom SMTP, CAPTCHA provider | Auth account, transactional verification/recovery email, session cookie, user profile, security record |
| Practice and exams | Student activity | Study Buddy/PostgreSQL; browser local storage for local drafts | Attempts, drafts, sessions, scores, progress |
| AI chat | Student prompts and learning context | Study Buddy/PostgreSQL and OpenAI API | Prompt, response, model and token metadata, safety/security records |
| Planned conversation-based AI improvement | Separately opted-in, de-identified conversation samples; no current user-chat input | Disabled during beta; future restricted Study Buddy evaluation/training environment and approved providers only | Evaluation results and, only after further approval, trained-model artefacts; retention not yet approved |
| WhatsApp tutoring | WhatsApp sender and messages | Meta/WhatsApp, Study Buddy, OpenAI | Linked number, thread and messages |
| Payments | Subscriber and Paystack | Paystack and Study Buddy | Reference, amount, currency, status and subscription record |
| Hosting/security | User device and requests | Railway, Cloudflare, Supabase, CAPTCHA and Study Buddy | Technical logs, rate-limit buckets and incident evidence |

The Supabase production project's primary data region is confirmed as North EU
(Stockholm), Sweden (`eu-north-1`). Remaining provider and Supabase
support/security/sub-processor locations, transfer mechanisms, and contract
settings must be entered in the processor register before approval. The primary
region alone is not treated as proof of transfer compliance.
The co-founders have confirmed that optional OpenAI API-data sharing for model
training or improvement is disabled. Preserve dated settings evidence and
recheck it after organisation ownership or data-control changes.

## 5. Purposes and preliminary lawful bases

| Purpose | Preliminary basis | Conditions before approval |
| --- | --- | --- |
| Create and provide an account and requested learning features | Contract or steps requested before contract | Confirm the final basis with Nigerian counsel; the product uses a 13+ minimum and independent activation from 18 |
| Child account processing | Parent/legal guardian authorisation for ages 13–17 | Review the email-link/declaration assurance level, build the approved verified-email operator withdrawal workflow, and approve the pending-choice and event-retention periods |
| AI answers and personalised recommendations | Contract for requested features; legitimate interests where appropriately balanced | Explain processing, minimise context, provide controls and human-review route |
| Account and service security | Legitimate interests; legal obligation where applicable | Complete legitimate-interest assessment and retention period |
| Transaction and compliance records | Contract and legal obligation | Confirm statutory retention with finance/legal adviser |
| Optional communications or future analytics | Consent or another documented basis | Separate opt-in and consent withdrawal before activation |

No team member should assume that consent is always the appropriate basis.
Every purpose must have one recorded basis and any required balancing or consent
evidence.

## 6. Necessity and proportionality

Current positive controls include authenticated access, HTTPS, CAPTCHA,
rate-limiting, scoped API routes, private resource storage, low-data controls,
local-first practice drafts, AI usage limits, and the ability to hide deleted
chats from the account. The account flow now also records date of birth,
restricts unverified and minor accounts, uses hashed one-time guardian tokens,
records versioned decision events, gates AI separately from the core account,
and provides immediate account restriction plus a retryable permanent-deletion
queue. The production scheduler and chat-level hard deletion are implemented;
provider backup settings still need verification.

The following must be demonstrated before final approval:

- every collected field is necessary for a defined user or legal purpose;
- phone number is necessary at initial registration or made optional;
- AI receives only the minimum conversation and learning context required;
- staff access to conversations is restricted, logged, and policy-based;
- permanent deletion follows the approved retention schedule;
- privacy information is understandable to children and available before use;
- a non-AI route remains available for important support and complaints; and
- providers and international transfers are contractually and legally covered.

## 7. Risk assessment

Scale: likelihood and impact are Low, Medium, or High. Residual ratings are
provisional until mitigations are implemented and tested.

| Risk | Initial risk | Required mitigation | Provisional residual risk |
| --- | --- | --- | --- |
| A child creates an account without valid parent/legal guardian authority | High | Implemented 13+ age gate, restricted account, expiring email-link declaration and event trail; no routine identity documents; use minimal stepped-up evidence only for disputed, inconsistent, or suspicious cases and delete it after recording the result; add the approved verified-email operator withdrawal workflow | Medium; email control plus declaration does not independently prove the real-world relationship |
| AI gives harmful, biased, or confidently incorrect advice | High | Age-appropriate system rules, safety testing, reporting, escalation, narrow educational scope, clear limitations | Medium after validation |
| A student discloses sensitive or third-party data in chat | High | Just-in-time warning, minimised context, redaction where feasible, access controls, deletion route | Medium |
| Staff access conversation content without a necessary case | High | Approved no-routine-reading rule; limit beta access to Nick Efe Oni and Chijindu Oreh; require a documented permitted reason, minimum-message scope, confidentiality, and an auditable break-glass workflow before any staff-review interface is introduced | Medium until technical enforcement and access-log review are implemented |
| Conversation content is repurposed for AI improvement without a valid, understood choice or is memorised by a trained model | High | Keep feature disabled during beta; use a separate off-by-default choice, adult opt-in or guardian authorisation plus student participation for ages 13–17, de-identification and sensitive-data screening, isolated datasets, withdrawal handling, membership/deletion evidence, model memorisation tests, and clear pre-training deletion-limit disclosure | High until the revised DPIA, controls, tests, and legal review are complete |
| A future school feature exposes student data unexpectedly | High | Keep school-facing access unavailable; require a revised DPIA, notice, agreement, tenant isolation, least privilege, and field-level tests before activation | Low while unavailable; reassess before development or activation |
| Deleted chats/accounts remain indefinitely | High | Hard-deletion workflow, backup expiry, deletion job, evidence and exception register | Low/Medium |
| Account takeover exposes learning and chat records | High | Secure auth, CAPTCHA, rate limits, recovery controls, alerts, session revocation and monitoring | Medium |
| Provider or cross-border processing lacks an approved safeguard | High | Processor register, DPA review, transfer assessment and approved mechanism | Medium |
| User cannot understand or exercise rights | Medium | Child-friendly notice, privacy request process, identity checks, response tracker and escalation | Low |
| Payment dispute is handled unfairly or data is over-collected or retained indefinitely | Medium | Paystack-only payment handling, transparent refunds, minimal transaction records, seven-year transaction policy, complaint route; implement expiry and legal-hold controls | Low/Medium until automated expiry is verified |
| Learning analytics unfairly labels or discourages a student | Medium | Explain recommendations, avoid high-stakes decisions, allow correction/review, test for bias | Low/Medium |
| Accessibility barriers prevent exercise of privacy or safety rights | High | WCAG audit, accessible alternatives, non-CAPTCHA support route, remediation tracking | Medium |
| A breach involving children is detected or reported too late | High | Incident plan, owner/on-call list, drills, 72-hour decision clock and breach register | Medium |

## 8. Consultation required

Before approval, obtain and record input from:

- a representative group of students of relevant ages;
- parents or guardians;
- engineering and information security;
- the joint privacy leads;
- product/content owners; and
- a qualified Nigerian privacy adviser or licensed DPCO where appropriate.

Consultation must not expose production personal data. Record material feedback,
decisions, and reasons when a recommendation is not adopted.

## 9. Launch gates

- [x] Exact legal controller identity, RC number, and registered office confirmed.
- [x] Joint privacy leads and mailbox approved: Nick Efe Oni and Chijindu Oreh through `privacy@studybuddyng.com`.
- [x] Both co-founders are mandatory internal breach contacts through `security@studybuddyng.com`, with `privacy@studybuddyng.com` copied.
- [x] Age and parent/legal-guardian authorisation design approved and implemented.
- [ ] Data inventory and lawful-basis record completed.
- [x] Current launch excludes school/teacher accounts and school-staff access.
- [x] Co-founders confirmed that OpenAI API-data sharing for model improvement is disabled.
- [x] Co-founders approved future use of selected conversation data for Study Buddy's own AI training/evaluation, subject to the documented activation gates.
- [x] Conversation-based AI training/evaluation remains disabled for the current beta and existing evaluations use purpose-built fixtures.
- [x] Resend custom SMTP is enabled for production Supabase Auth, and production account-verification and password-reset delivery have been exercised.
- [ ] AI safety evaluation passes agreed child-safety and educational thresholds.
- [ ] Verify 90-day provider backup expiry and implement the remaining approved retention jobs; the account scheduler and chat-only hard deletion are deployed in code and the scheduler has passed a production invocation.
- [ ] Processor agreements, regions, sub-processors, and transfer bases verified.
- [ ] Incident-response contacts and breach register are operational.
- [ ] Privacy-right request workflow and response register are operational.
- [ ] Accessibility audit covers sign-up, privacy requests, chat, and exams.
- [ ] Co-founders and privacy adviser accept the residual risks in writing.

## 10. Approval record

| Role | Name | Decision | Date | Signature/reference |
| --- | --- | --- | --- | --- |
| Assessment owner | Pending | Pending | — | — |
| Engineering/security owner | Pending | Pending | — | — |
| Product owner | Pending | Pending | — | — |
| Privacy adviser/DPO | Pending | Pending | — | — |
| Company approver | Pending | Pending | — | — |

Approval is invalid if the underlying processing materially changes or a launch
gate is incomplete. Re-open the assessment after a serious incident, a new AI
provider/model or use case, behavioural analytics, advertising, a tutor
marketplace, significant school-data expansion, or entry into a new country.
