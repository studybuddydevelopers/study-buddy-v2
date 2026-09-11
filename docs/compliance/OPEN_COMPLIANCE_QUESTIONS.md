# Open Legal and Compliance Questions

Status: co-founder decisions and external verification required  
Last updated: 11 September 2026

This is the authoritative working list of unresolved legal, privacy, product,
and commercial questions for Study Buddy. Answers are not treated as legal
approval by themselves. Public notices, product behaviour, internal records,
and provider settings must be updated together after each answer is confirmed.

Questions 1–28 and 30 have been answered. The confirmed decisions include the company
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
locations and the required Nigeria-to-Sweden transfer safeguard remain separate
verification tasks.
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

## Open questions

29. Who owns or licenses every past question, textbook, explanation, and study resource?
31. Is NDPC registration **No** or **In progress**? CAC incorporation does not constitute NDPC registration.
32. Who will be appointed DPO or privacy lead?
33. Approximately how many registered users are expected in year one?
34. Approximately how many of those users are expected to be under 18?
35. Who is the internal personal-data-breach contact?
36. How can a parent or guardian withdraw authorisation, and what immediately happens to the child's account and data?
37. What additional evidence, if any, will verify the user's age and that the approving adult is genuinely their parent or legal guardian?
38. Who will complete and formally approve the children-and-AI Data Protection Impact Assessment, and when?
39. What lawful basis applies to each processing purpose, including account operation, AI conversations, payments, security logs, marketing, and analytics?
40. Do all personal-data processors have suitable data-processing agreements, including Supabase, Railway, OpenAI, Resend, Paystack, and any monitoring provider?
41. What legal safeguard covers each international transfer of personal data outside Nigeria?
42. How will users exercise access, correction, restriction, objection, and data-portability rights, in addition to deletion?
43. What is the complete personal-data-breach procedure, including investigation, documentation, risk assessment, escalation, and any required NDPC or user notification?
44. Is Study Buddy legally classified as a Data Controller or Data Processor of Major Importance, and what registration obligations follow?

## Completion rule

A question is complete only when the co-founders have confirmed the answer and
the answer has been reflected wherever applicable in the product, public legal
pages, internal compliance records, provider configuration, and operating
procedures. Questions requiring legal conclusions or regulatory classification
also require review by a qualified Nigerian privacy adviser or licensed Data
Protection Compliance Organisation.
