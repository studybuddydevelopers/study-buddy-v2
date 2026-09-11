# Processor and Vendor Register

Status: Question 40 answered **Yes** for the current beta provider set — Railway
is executed and the other applicable DPAs or processing terms are incorporated
into accepted self-service agreements
Owner: Nick Efe Oni and Chijindu Oreh (joint privacy leads)
Last reviewed: 12 September 2026

## Instructions

The service owner must review this register before onboarding a provider and at
least annually. Attach the executed terms/DPA, security review, sub-processor
list, region evidence, transfer mechanism, deletion procedure, and incident
contact in the company’s secure compliance system. Do not commit confidential
contracts, credentials, or security questionnaires to this repository.

Role labels are preliminary. A provider may be an independent controller for
some data and a processor for other data.

## Agreement position

The current beta processors are covered through Railway's executed DPA or the
applicable self-service DPA/processing terms incorporated into the provider's
accepted service agreement. Separate signatures are not required merely because
Railway used DocuSign. This conclusion does not close the distinct account-name,
processing-location, transfer, retention, sub-processor, deletion, incident and
security reviews. Before onboarding a new provider, record the applicable DPA or
processor terms, legal contracting entity, version and acceptance method. A
public privacy policy alone is not a DPA. Do not store confidential contracts or
account screenshots in this repository. Public sources and private evidence
hashes are recorded in the [Provider Agreement Evidence Index](./PROVIDER_AGREEMENT_EVIDENCE.md).

## Current and planned providers

| Provider | Service and data | Preliminary role | Production/region status | Contract and privacy work | Decision |
| --- | --- | --- | --- | --- | --- |
| Supabase | Authentication, account identifiers, session data, PostgreSQL data, storage | Processor for hosted Study Buddy data; may have independent security/account purposes | Active in production; primary project data region confirmed as North EU (Stockholm), Sweden (`eu-north-1`); production organisation name confirmed as STUDY BUDDY GLOBAL PROJECTS LIMITED and billing details founder-confirmed as saved | Current DPA Version 1 (1 August 2026) is incorporated into the service agreement; dashboard DPA, 14 March 2025 TIA and company-organisation evidence retained privately. Record the original service-agreement acceptance date if available; retain billing evidence; review sub-processors, backups/deletion, support locations, breach contact and Nigeria-to-Sweden/Singapore transfer basis | DPA terms and company organisation evidenced; operational and transfer review pending |
| OpenAI | AI prompts, relevant chat/learning context, responses, model/token metadata | Processor/service provider for API content, subject to contract details | Active in code; co-founders confirmed that optional API-data sharing for model improvement is disabled; region and other data-control settings are not verified | Current DPA is incorporated into the OpenAI Services Agreement. Preserve company organisation/billing and acceptance evidence; review abuse-monitoring retention, sub-processors, deletion and transfer basis | DPA coverage and training-sharing decision confirmed; remaining privacy/transfer review pending |
| Meta / WhatsApp Cloud API | WhatsApp number/sender ID, routing metadata, message content | Likely separate/independent and processor roles depending activity | Active in code when configured; regions not verified | Confirm business terms, lawful WhatsApp opt-in, retention, complaint/deletion route and transfer basis | Pending approval |
| Paystack | Payer/account identifiers, transaction reference, amount, currency, status, payment instrument data held by Paystack | Payment provider/independent controller and processor roles depending activity | Payment verification/webhook code exists; live merchant configuration not verified | Record merchant terms, privacy terms, dispute/refund process, retention, PCI responsibilities and incident contact | Pending approval before paid launch |
| Railway | Application hosting, request/network logs and deployment data | Processor/service provider | Confirmed production application host | Fully executed DPA and DocuSign completion certificate retained privately; effective 11 September 2026. Confirm workspace/billing customer, deployment region, log retention, sub-processors, deletion, transfer safeguard and incident contacts | DPA complete; remaining account, operational and transfer review pending |
| Cloudflare | Authoritative DNS, reverse proxy, TLS and network-abuse protection; IP addresses and request metadata | Processor/service provider and possible independent security purposes, subject to contract | Confirmed active for the production domain | DPA Version 6.4 forms part of the applicable self-service agreement. Preserve company account/acceptance evidence; review region, log retention, sub-processors, deletion, transfers and incident contact | DPA coverage and infrastructure use confirmed; remaining privacy/transfer review pending |
| Cloudflare Turnstile | CAPTCHA token, browser/device/network signals | Provider with contractual role to confirm | Current environment configuration previously indicated Turnstile; verify production | Covered by the applicable Cloudflare service agreement/DPA when enabled; verify data fields, retention, sub-processors, accessibility route and transfer basis | Contract coverage confirmed; configuration and privacy review pending |
| hCaptcha | Alternative CAPTCHA token and browser/device/network signals | Provider with contractual role to confirm | Supported in code as an alternative; do not list as active unless configured | Same checks as Turnstile; remove unused integration or keep register current | Conditional |
| Resend | Direct delivery of guardian-authorisation and account-lifecycle messages; custom SMTP delivery provider for Supabase Auth verification and password-reset email | Processor/service provider | Direct API integration and production Supabase custom SMTP are enabled; production verification and password-reset delivery have been exercised | Current DPA is binding through the accepted Terms of Service. Preserve company-account/acceptance and privacy-safe test evidence; review sending/processing regions, event/log retention, sub-processors, suppression handling, breach contact and transfer basis | DPA coverage and production activation confirmed; remaining privacy/transfer review pending |
| GoDaddy / Microsoft 365 | Company support, privacy, security, billing and general-enquiry mailboxes; message content, sender/recipient details and attachments | GoDaddy contracting/reseller service with Microsoft processing under incorporated customer terms; exact roles vary by activity | Company-domain mailbox service confirmed active | GoDaddy DPA is effective with its customer agreement; the electronically accepted Microsoft 365 terms incorporate the Microsoft Customer Agreement. Retain the company invoice/order and billing evidence; review retention, sub-processors, account access, deletion, incident contacts and transfers | Agreement coverage confirmed; remaining operational and transfer review pending |
| GitHub | Source code, issues, CI logs; must not contain production personal data | Business service provider | Repository/CI use evident | Confirm organisation controls, access review, secret scanning, log retention and DPA/terms | Pending review |

## Required review fields for every provider

- Legal provider name and contracting entity
- Product/service and internal owner
- Data categories and data-subject categories
- Controller/processor role by activity
- Purpose and documented lawful basis
- Production countries/regions and support-access locations
- DPA/terms version and acceptance date
- International-transfer mechanism and assessment
- Sub-processor list and change-notification method
- Security review date and key controls
- Default and configured retention/deletion periods
- Data-export and deletion procedure
- Breach-notification commitment and incident contact
- Availability and exit/portability plan
- Accessibility impact where the provider appears in a user flow
- Approval, renewal, and termination dates

## Onboarding gates

- [ ] Business need and data minimisation documented.
- [ ] No lower-risk reasonable alternative is available.
- [ ] Security and privacy review completed.
- [ ] Child and school data implications assessed.
- [ ] Contract/DPA and sub-processors reviewed.
- [ ] Region and cross-border mechanism approved.
- [ ] Retention and deletion tested or evidenced.
- [ ] Incident and rights-request process tested.
- [ ] Public notices updated before data is sent.
- [ ] DPIA updated for material/high-risk processing.

## Offboarding

When a provider is removed, stop new transfers, revoke credentials and webhooks,
export only data that remains necessary, request deletion, obtain evidence where
available, update code/configuration/notices, remove unused DNS or integrations,
and retain only the minimal contract and audit evidence required.
