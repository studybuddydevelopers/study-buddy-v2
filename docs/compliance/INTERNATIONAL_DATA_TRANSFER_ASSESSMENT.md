# International Data Transfer Assessment

Status: approved working policy; provider mapping, certified-DPO validation, and
any required NDPC approval remain launch work  
Owner: Nick Efe Oni and Chijindu Oreh (joint privacy leads)  
Last reviewed: 12 September 2026

## Decision for Question 41

Study Buddy will use a layered Nigerian-law transfer approach:

1. Routine transfers that are strictly necessary to provide an account or a
   feature requested by the user rely on the contract/necessary-steps ground in
   section 43(1)(b) of the Nigeria Data Protection Act 2023.
2. Processing for users aged 13–17 remains subject to verified parent or legal-
   guardian authorisation and an age-appropriate notice. Before consent is used
   as the transfer ground, Study Buddy must clearly explain the destination,
   purpose, recipient, possible risks caused by the absence of an NDPC adequacy
   decision, and the effect of withdrawal, and must record that choice.
3. Optional transfers, including WhatsApp and any future use of selected
   conversations for Study Buddy AI training or evaluation, require a separate,
   specific, informed choice and remain disabled until their transfer assessment
   and product controls are complete.
4. Each recurring transfer is also protected by the provider's applicable DPA
   or processing terms, data minimisation, encryption in transit, access
   controls, deletion instructions, sub-processor review, and a documented
   transfer risk assessment.
5. Study Buddy will seek a Cross-Border Data Transfer Instrument approved by
   the Nigeria Data Protection Commission when the certified DPO or Nigerian
   privacy adviser determines that one is required for a recurring transfer.
   Provider EU or UK standard contractual clauses are supporting contractual
   safeguards; they are not recorded as an NDPC-approved Nigerian instrument
   unless the Commission approves or recognises them for the transfer.

Consent is not used to legitimise transfers that are unnecessary for the stated
feature. Public interest, vital interests, and legal-claims grounds are reserved
for the specific exceptional circumstances in which the statutory condition is
actually met.

## Legal framework

Sections 41–43 of the Nigeria Data Protection Act 2023 require an adequate
recipient protection or an applicable statutory condition, and require the
controller or processor to record the transfer basis and adequacy assessment.
Article 45 and Schedule 5 of the NDP Act General Application and Implementation
Directive 2025 describe three broad routes: an NDPC adequacy decision, an
NDPC-approved Cross-Border Data Transfer Instrument, or another applicable
jural/fiduciary ground such as informed consent or contractual necessity.

Authoritative references:

- [Nigeria Data Protection Act 2023](https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf)
- [NDP Act GAID 2025](https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf)
- [NDPC cross-border transfer FAQ](https://ndpc.gov.ng/faqs/)

## Current transfer map

This table records the selected legal approach, not a claim that every
operational check is complete.

| Provider/recipient | Current transfer and purpose | Selected Nigerian-law ground | Supporting safeguards | Remaining evidence or gate |
| --- | --- | --- | --- | --- |
| Supabase | Account, authentication, application database, and storage data from Nigeria to the confirmed primary region in North EU (Stockholm), Sweden (`eu-north-1`), with possible support, security, backup, and sub-processor access elsewhere | Section 43(1)(b) contractual necessity for requested core service; guardian-authorised child processing for ages 13–17 | Supabase DPA, incorporated SCCs, configured primary region, encryption, access controls, and minimisation | Reconcile the current DPA with the retained TIA; map support, backup, and sub-processor countries; complete the Nigeria-specific assessment |
| Railway | Application requests, limited logs, and hosted application processing outside Nigeria | Section 43(1)(b) contractual necessity for site delivery | Executed Railway DPA, SCCs and supplementary measures, TLS, limited logging, and access controls | Verify the production deployment country, log retention, and sub-processors; complete the Nigeria-specific assessment |
| Cloudflare and Turnstile | DNS/proxy, TLS, request/network security data, and CAPTCHA signals through a global network | Section 43(1)(b) contractual necessity for secure site delivery | Cloudflare DPA, contractual transfer safeguards, TLS, IP minimisation or hashing where applicable, and short-lived security controls | Verify active Turnstile configuration, relevant processing countries, retention, and sub-processors; complete the Nigeria-specific assessment |
| Resend | Account verification, password recovery, guardian approval, deletion, and lifecycle email data; Resend states that its primary processing operations are in the United States | Section 43(1)(b) contractual necessity for essential account/service messages | Resend DPA, incorporated SCCs, TLS, minimal email content, and restricted API credentials | Verify event/log retention, suppression data, sub-processors, and any additional processing countries; complete the Nigeria-specific assessment |
| OpenAI | Prompts, bounded conversation/learning context, responses, and model/token metadata sent only when an authorised user invokes an AI feature | Section 43(1)(b) contractual necessity for the requested AI feature; the existing guardian AI authorisation remains required for ages 13–17 | OpenAI DPA, limited context, API-data sharing for model improvement confirmed off, access controls, and usage limits | Verify account entity, processing/sub-processor locations, abuse-monitoring retention, and data-control settings; complete the Nigeria-specific assessment |
| GoDaddy / Microsoft 365 | Support, privacy, security, billing, and general-enquiry messages sent to or handled through company mailboxes | Section 43(1)(b) where necessary to respond to the sender's request; legal obligation or legal-claims condition only for the relevant case | Incorporated GoDaddy/Microsoft processing terms, mailbox access controls, and content minimisation | Verify tenant data location, support access, retention/deletion, and sub-processors; complete the Nigeria-specific assessment |
| GitHub | Source code and CI only | No production-user transfer is approved | Secret scanning, dependency controls, and repository access controls | Keep production personal data and secrets out of source, issues, and CI logs |
| Meta / WhatsApp | Optional messaging; integration exists in code but is not approved for unrestricted activation | Separate informed opt-in plus guardian authorisation and student participation for ages 13–17 | Provider terms, minimised message context, deletion controls, and access restrictions are required | Do not activate until the provider agreement, destinations, retention, child controls, and transfer assessment are approved |
| Paystack | Future payment and subscription processing | Section 43(1)(b) contractual necessity when a user requests paid service; legal obligation for required transaction records | Merchant terms, payment-provider controls, minimal Study Buddy payment records, and no storage of full card/bank credentials | Paid checkout remains disabled; complete merchant, role, destination, retention, and transfer review before activation |

## Operational actions still required

- Obtain an exact current country and sub-processor map from every active
  provider account and record material changes.
- Complete a provider-by-provider transfer risk assessment covering foreign
  law, government access, enforceable rights and redress, security, onward
  transfers, and Nigerian data-subject access to remedies.
- Have the certified DPO or qualified Nigerian privacy adviser validate that
  each transfer is truly necessary for the relevant contract and determine
  whether a provider DPA/SCC package should be submitted to the NDPC as a CBDTI.
- Add and retain sufficiently specific transfer notice/consent evidence wherever
  consent is used, particularly for children and optional features.
- Stop or redesign a transfer if the chosen ground fails, consent is withdrawn,
  the provider changes destinations materially, or adequate supplementary
  controls cannot be established.
- Re-run this assessment before enabling WhatsApp, Paystack, conversation-based
  AI training/evaluation, analytics, advertising, or any new provider.

## Approval boundary

This document answers the policy choice in Question 41. It does not constitute
an NDPC adequacy decision, NDPC approval of a transfer instrument, or legal
sign-off. The transfer launch gate remains open until the operational actions
above are evidenced and the certified DPO or qualified Nigerian privacy adviser
has recorded the final conclusion.
