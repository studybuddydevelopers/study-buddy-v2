# Open Legal and Compliance Questions

Status: co-founder decisions and external verification required  
Last updated: 10 September 2026

This is the authoritative working list of unresolved legal, privacy, product,
and commercial questions for Study Buddy. Answers are not treated as legal
approval by themselves. Public notices, product behaviour, internal records,
and provider settings must be updated together after each answer is confirmed.

Questions 1–22 have been answered. The confirmed decisions include the company
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
through Resend. Code paths and local configuration names match this decision,
but the production Supabase dashboard's custom-SMTP state and an end-to-end
delivery test to a non-team address still need to be verified before Question 23
meets the completion rule.

## Open questions

23. Which provider will send production account and password-reset emails?
    **Decision:** Supabase Auth with Resend custom SMTP. **Still open:** verify
    the production dashboard configuration and successful delivery to a
    non-team address.
24. Are any analytics, advertising, error-monitoring, or user-tracking services used? If yes, list every provider.
25. Will paid subscriptions renew automatically?
26. Exactly how will users cancel subscriptions?
27. What refund period, if any, will apply?
28. Which circumstances qualify for refunds?
29. Who owns or licenses every past question, textbook, explanation, and study resource?
30. Does Study Buddy have any official WAEC partnership, licence, or affiliation?
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
