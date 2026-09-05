# Processor and Vendor Register

Status: initial register — contracts, production configuration, and transfer
assessments require verification  
Owner: to be appointed  
Last reviewed: 5 September 2026

## Instructions

The service owner must review this register before onboarding a provider and at
least annually. Attach the executed terms/DPA, security review, sub-processor
list, region evidence, transfer mechanism, deletion procedure, and incident
contact in the company’s secure compliance system. Do not commit confidential
contracts, credentials, or security questionnaires to this repository.

Role labels are preliminary. A provider may be an independent controller for
some data and a processor for other data.

## Current and planned providers

| Provider | Service and data | Preliminary role | Production/region status | Contract and privacy work | Decision |
| --- | --- | --- | --- | --- | --- |
| Supabase | Authentication, account identifiers, session data, PostgreSQL data, storage | Processor for hosted Study Buddy data; may have independent security/account purposes | Active in code; project region not verified | Record DPA/terms, sub-processors, backup/deletion periods, breach contact, region and transfer basis | Pending approval |
| OpenAI | AI prompts, relevant chat/learning context, responses, model/token metadata | Processor/service provider for API content, subject to contract details | Active in code; API data-control and region settings not verified | Record business terms/DPA, opt-in training state, abuse-monitoring retention, sub-processors, deletion and transfer basis | Pending approval |
| Meta / WhatsApp Cloud API | WhatsApp number/sender ID, routing metadata, message content | Likely separate/independent and processor roles depending activity | Active in code when configured; regions not verified | Confirm business terms, lawful WhatsApp opt-in, retention, complaint/deletion route and transfer basis | Pending approval |
| Paystack | Payer/account identifiers, transaction reference, amount, currency, status, payment instrument data held by Paystack | Payment provider/independent controller and processor roles depending activity | Payment verification/webhook code exists; live merchant configuration not verified | Record merchant terms, privacy terms, dispute/refund process, retention, PCI responsibilities and incident contact | Pending approval before paid launch |
| Vercel | Web hosting, request/network logs, deployment data | Processor/service provider | Privacy Policy names Vercel; actual production hosting must be confirmed | Record DPA, regions, log retention, sub-processors, deletion, transfer and incident contacts | Deployment decision pending |
| Railway | Application/database deployment may be used according to operational documentation | Processor/service provider | Railway operational documentation exists; actual production scope must be confirmed against Vercel wording | Resolve hosting architecture, then record DPA, region, logs, backups, deletion and transfers | Deployment decision pending |
| Cloudflare Turnstile | CAPTCHA token, browser/device/network signals | Provider with contractual role to confirm | Current environment configuration previously indicated Turnstile; verify production | Record terms/privacy, data fields, retention, sub-processors, accessibility route and transfer basis | Pending approval |
| hCaptcha | Alternative CAPTCHA token and browser/device/network signals | Provider with contractual role to confirm | Supported in code as an alternative; do not list as active unless configured | Same checks as Turnstile; remove unused integration or keep register current | Conditional |
| Resend | Planned custom SMTP for authentication email | Processor/service provider | Recommended in README; not confirmed active | DPA, sending region, event/log retention, sub-processors, suppression handling and transfer basis | Pending before activation |
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
