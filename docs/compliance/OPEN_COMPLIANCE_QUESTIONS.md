# Open Legal and Compliance Questions

Status: co-founder decisions and external verification required  
Last updated: 12 September 2026

This is the authoritative working list of unresolved legal, privacy, product,
and commercial questions for Study Buddy. Answers are not treated as legal
approval by themselves. Public notices, product behaviour, internal records,
and provider settings must be updated together after each answer is confirmed.

Questions 1–28, 30–37, and 39–42 have an approved working answer. The confirmed decisions include the company
identity and address, `privacy@studybuddyng.com` as the privacy-request mailbox,
joint request handling by Nick Efe Oni and Chijindu Oreh, a minimum account age
of 13, independent activation from 18, and parent or legal-guardian approval for
ages 13–17 through the implemented email decision flow. At launch, Study Buddy
does not provide school or teacher accounts, and school staff cannot access any
individual student information or create, suspend, or delete student accounts.
Permanent account deletion is available in Settings and requires password/typed
confirmation followed by a one-time account-email link and a deliberate final
confirmation page. The account remains active until that final confirmation;
then access is restricted immediately, a 15-day cancellation window begins,
active-system deletion proceeds within the approved 30-day maximum, and
protected backup copies must age out within 90 days of confirmation. A separate
reversible deactivation option is presented first for users who only want a
break. A deactivated account is retained for 36 months to permit reactivation;
automatic notices are sent 90, 60, 15, and 1 day before account deletion.
Web AI and WhatsApp conversations are kept as user-accessible study history
while the account is active, rather than expiring solely because the last
message is old. A conversation is deleted when the user deletes it, permanently
deletes the account, or reaches the 36-month deactivated-account expiry.
Submitted study history, answers, progress, and mock-exam results are retained
while the account is active and throughout the 36-month reversible-deactivation
period, then deleted with the account at expiry or through confirmed permanent
account deletion, subject only to a documented legal hold or mandatory limited
retention.
Essential payment, invoice, and transaction records are retained for seven years
from the transaction date. They may be retained longer only for a documented tax
audit, chargeback, dispute, investigation, or legal hold, after which they must
be deleted or anonymised. Full card numbers, CVVs, PINs, and bank credentials are
not stored by Study Buddy.
Study Buddy staff do not routinely read individual AI or WhatsApp
conversations. During beta, access is limited to Nick Efe Oni and Chijindu Oreh
and only to the minimum messages necessary for a documented user-authorised
support request, reported harmful response or credible child-safety or
imminent-harm concern, account compromise, fraud, abuse, security incident,
specific technical failure that cannot be diagnosed with less intrusive
information, or valid legal or regulatory requirement. Access is not permitted
for curiosity, marketing, general surveillance, routine product improvement,
or review of identifiable or non-opted-in conversations for AI
training/evaluation. The later Question 21 decision does not permit staff to
browse raw conversations.
The co-founders have confirmed that the OpenAI API organisation has not opted
in to share Study Buddy API prompts or responses for OpenAI model training or
improvement. This does not remove OpenAI's separate processing and
abuse-monitoring retention, which must remain documented and reviewed.
The co-founders intend to use selected conversations to train or evaluate Study
Buddy's own AI systems in the future. The feature is not active during the
current beta; existing evaluation code uses purpose-built fixtures rather than
user conversations. Activation requires a separate voluntary choice that is off
by default, adult opt-in or both parent/legal-guardian authorisation and student
participation for ages 13–17, de-identification and sensitive-data screening,
restricted datasets, withdrawal for future use, an updated DPIA and notice, and
clear disclosure of any deletion limits before model training. Declining must
not reduce access to the ordinary service. This decision does not permit staff
to browse identifiable conversations for product improvement.
The production Supabase project's primary data region is confirmed as North EU
(Stockholm), Sweden (`eu-north-1`). This establishes the location of primary
project data only; Supabase support, security, network, backup, and sub-processor
locations and the implementation/validation of the approved transfer policy
remain separate verification tasks.
The selected production account-verification and password-reset architecture is
Supabase Auth with Resend as its custom SMTP delivery provider. The application
also sends guardian-authorisation and account-lifecycle messages directly
through Resend. The custom SMTP setting is enabled in the production Supabase
project, and production account-verification and password-reset delivery have
been exercised successfully. The app-owned authentication callback changes must
still be re-tested after their next production deployment.
At beta launch, Study Buddy does not use advertising services, advertising
pixels, session replay, or behavioural/product analytics. Essential operational
and security logging is provided through the application and the Cloudflare,
Railway, Supabase, and Resend services. Any future non-essential analytics,
advertising, or tracking requires a prior policy/DPIA review and any legally
required notice and consent controls.
When paid subscriptions are enabled, they will renew automatically for the
disclosed billing period until cancelled. Paid checkout remains disabled during
the current beta. Before activation, checkout must clearly disclose the price,
billing frequency, renewal timing, and cancellation route and must record the
customer's explicit authorisation. Questions 26–28 must define cancellation and
refund operations before recurring charges are accepted.
Once paid subscriptions are enabled, the primary cancellation route will be an
in-app **Cancel subscription** action under **Settings → Subscription**. After
confirmation, cancellation stops the next automatic renewal, sends an email
confirmation, and ends paid access on the cancellation date. A user who cannot
use the in-app control may email
`billing@studybuddyng.com` from the account address and include the payment
reference. Cancellation must not depend solely on the email fallback. When a
cancellation ends access, Study Buddy will automatically refund the prorated
unused subscription time from the cancellation time to the next scheduled
renewal. The user does not need to submit a separate refund request. The refund
is returned through the original payment method; provider and bank settlement
time is separate from Study Buddy initiating it.
Apart from that automatic cancellation refund, Study Buddy will issue refunds
only for a duplicate payment, a payment taken when the paid service was not
provided, Study Buddy discontinuing a prepaid service, or another refund
required by Nigerian consumer law. An unauthorised-payment claim, accidental
purchase, change of mind, outage, or general dissatisfaction is not a separate
discretionary ground unless the facts also meet one of those four grounds.
Nick Efe Oni has confirmed that the contractor signed an agreement assigning
the contractor's original deliverables to Study Buddy Global Projects Limited,
and that Chijindu Oreh holds the agreement details. This confirmation covers the
contractor's original analysis and explanations; it does not establish rights
in any WAEC question, examiner report, marking material, textbook extract, or
other third-party content included or referenced in a deliverable. The current
seeded question bank was generated using AI. Question 29 therefore remains open
until the source and permitted use of every learner-visible item are recorded,
including separate permission for any genuine past-question content.
Study Buddy does not currently have an official partnership, licence,
permission, affiliation, sponsorship, approval, or endorsement from WAEC. The
co-founders intend to seek an appropriate written relationship or permission.
That intention must not be represented as an existing relationship, and public
claims must be updated only after an agreement is executed and its scope is
verified.
Study Buddy is not currently registered with the Nigeria Data Protection
Commission. Its status is **No — planned**: no registration application has
been started or submitted. CAC incorporation is separate and does not amount to
NDPC registration. Whether Study Buddy is a Data Controller or Data Processor
of Major Importance, the applicable category, and the point by which
registration is legally required remain subject to Question 44 and qualified
Nigerian data-protection advice.
Co-founders Nick Efe Oni and Chijindu Oreh are appointed as Study Buddy's joint
privacy leads. They share responsibility through `privacy@studybuddyng.com`.
Whether Study Buddy's eventual DCPMI classification requires a separate formal
DPO designation, and whether either co-founder then has the required expertise
or an external DPO should be engaged, remains part of Question 44.
The current planning estimate is approximately 50 registered users during the
first year. This is a forecast, not an account cap, and must be reviewed if
actual growth or launch plans materially change.
Approximately 40 of those 50 users (about 80%) are expected to be under 18.
This is also a planning estimate rather than a limit, and child-focused controls
must be designed for the expected majority of users rather than treated as an
edge case.
Nick Efe Oni and Chijindu Oreh are both mandatory internal contacts for every
suspected personal-data breach. The report must be sent immediately through
`security@studybuddyng.com`, with `privacy@studybuddyng.com` copied. This contact
decision does not replace the separate outstanding assignment of an incident
commander and other operational roles in the breach-response plan.
A parent or legal guardian may withdraw authorisation only through a verified
request to `privacy@studybuddyng.com`. Once verified, Study Buddy must
immediately sign the child out, restrict the account, stop new AI and WhatsApp
activity, and notify both the child and the adult. Existing data is retained
securely only while the adult chooses reauthorisation or permanent deletion,
subject to any limited retention required by law. The restricted operator
workflow, session termination, audit event, notifications, and final pending
state retention limit still require implementation and verification.
Routine age and guardian checks use the student's declared date of birth plus
the adult's control of the guardian email link and declaration of authority.
Study Buddy does not routinely collect identity documents. Minimal,
proportionate additional evidence may be requested only when age, relationship,
or authority is disputed, inconsistent, or appears suspicious. The raw evidence
must be deleted after the verification result is recorded unless a documented
legal requirement justifies limited retention.
The co-founders have selected contractual necessity for requested core account,
learning, AI, support, and subscription services provided to adults. For users
aged 13–17, verified parent or legal-guardian consent is required for processing
the child's data, with the service agreement made with the guardian where
appropriate. Legal obligation applies to compulsory financial, compliance,
privacy-rights, and regulatory records. Legitimate interests apply only to
necessary security, fraud and abuse prevention, service reliability, limited
incident investigation, legal claims, and proportionate internal improvement
after a documented balancing assessment. Optional WhatsApp communications,
non-essential marketing, and any future use of selected conversations to train
or evaluate Study Buddy's own AI require separate, specific consent and the
additional controls already recorded for children. Study Buddy will not rely on
public interest for its ordinary commercial service. Vital interests are
reserved for genuine emergencies involving immediate safety. Irreversibly
anonymised statistics may be used for product planning, but pseudonymised data
remains personal data. These selections remain subject to the certified DPO's
formal validation through Question 38.
Question 40 is answered **Yes** for the current beta provider set. Railway's DPA
is fully executed, while the applicable Supabase, OpenAI, Resend, Cloudflare,
and GoDaddy/Microsoft 365 DPAs or processing terms form part of their accepted
self-service agreements. Separate countersignatures are not required for those
incorporated terms. Meta/WhatsApp terms must be confirmed with the business
account before that optional channel is activated, and Paystack's merchant/DPA
position remains a precondition to enabling paid checkout. Agreement coverage
does not by itself complete the Question 41 country mapping, risk assessment, or
regulatory validation, and account, sub-processor, retention, deletion,
incident and security evidence must continue to be maintained in the processor
register.
Question 41 adopts a layered international-transfer policy. Strictly necessary
core-service transfers rely on section 43(1)(b) contractual necessity. Child
processing remains subject to verified parent or legal-guardian authorisation,
and any transfer that relies on consent must follow a specific risk notice and
recorded choice. Optional WhatsApp and future conversation-based AI improvement
transfers remain disabled until their separate consent and transfer gates are
complete. Provider DPAs, contractual clauses, encryption, minimisation, access
controls, sub-processor review, and transfer assessments provide supporting
safeguards. EU or UK SCCs are not labelled as an NDPC-approved Nigerian CBDTI
without Commission approval or recognition. A certified DPO or qualified
Nigerian privacy adviser must validate the necessity analysis, destination map,
transfer risk assessments, and whether an NDPC-approved CBDTI is required. The
full provider map and remaining actions are in the
[International Data Transfer Assessment](./INTERNATIONAL_DATA_TRANSFER_ASSESSMENT.md).
Question 42 adopts an email-first privacy-rights procedure for beta. Requests for
access, correction, restriction, objection, consent withdrawal, portability,
and human review go to `privacy@studybuddyng.com`; the in-app request centre is
a future feature. Nick Efe Oni and Chijindu Oreh jointly handle requests, target
acknowledgement within two working days, and complete a sufficiently verified
request without undue delay and within 30 calendar days. Verification uses the
recorded account email or another proportionate method, with parent/legal-
guardian authority verified for child requests and extra evidence requested
only where reasonably necessary. Exports use JSON or CSV and a private,
expiring link. Every case records verification, systems/providers searched,
actions, deadlines, reviewer, delivery, and outcome. Any refusal or limitation
requires a documented lawful reason, second-person review, a clear explanation,
and an NDPC complaint route. The approved procedure is in the
[Data Subject Rights Request Procedure](./DATA_SUBJECT_RIGHTS_REQUEST_PROCEDURE.md).

## Open questions

29. Who owns or licenses every past question, textbook, explanation, and study resource?
38. Who will complete and formally approve the children-and-AI Data Protection Impact Assessment, and when?
43. What is the complete personal-data-breach procedure, including investigation, documentation, risk assessment, escalation, and any required NDPC or user notification?
44. Is Study Buddy legally classified as a Data Controller or Data Processor of Major Importance, and what registration obligations follow?

## Completion rule

A policy question has a working answer when the co-founders have adopted it and
the answer has been reflected wherever applicable in the product, public legal
pages, and internal compliance records. Operational and legal launch gates stay
open until the corresponding provider configuration, evidence, operating
procedures, and product controls are complete. Questions requiring legal
conclusions or regulatory classification also require review by a qualified
Nigerian privacy adviser or licensed Data Protection Compliance Organisation.
