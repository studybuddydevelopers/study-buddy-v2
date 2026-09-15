# Independent Security Review

Last updated: 16 September 2026

## Status and launch gate

This document is the quote and engagement brief for an independent manual
penetration test of Study Buddy. It does not authorise testing by itself.

- Owner: Nick Efe Oni, with Chijindu Oreh as the second company contact.
- Contracting entity: Study Buddy Global Projects Limited.
- Status: quote-ready; provider, price, test dates and named testers are not yet
  selected.
- Required before: a large public launch, accepting live subscription payments,
  or materially expanding beyond the controlled invite-only beta.
- Gate: do not proceed with that launch while a critical or high-severity finding
  remains open. Medium findings require a named owner, written risk decision and
  remediation date. The provider must retest fixes and issue closure evidence.

The existing OWASP ZAP staging baseline is useful evidence, but it is not a
substitute for this independent, authenticated, business-logic review.

## Provider selection

Request comparable fixed-price quotes from at least three providers. Confirm the
firm's accreditation and the assigned testers' qualifications immediately before
signing; a directory listing is not a guarantee about a particular tester.

Current candidates from the CREST accredited-provider directory:

1. [WorkNest Cyber (including Pentest People and Bulletproof)](https://marketplace.crest.org/supplier/worknest-cyber-comprising-bulletproof-cyber-target-defence-and-pentest-people/) — CREST penetration-testing provider whose profile describes consultant-led PTaaS and web-application testing. Ask for a fixed-scope startup web/API test, not an ongoing platform contract.
2. [Claranet Cyber Security](https://marketplace.crest.org/supplier/claranet-cyber-security/) — CREST penetration-testing provider with web/application and continuous-testing capability. Ask for a small, bounded manual engagement.
3. [NCC Group](https://marketplace.crest.org/supplier/ncc-group/) — CREST penetration-testing provider suitable as the higher-assurance comparison quote.

If none fits the budget or schedule, select another current
[CREST-accredited provider](https://marketplace.crest.org/) that can demonstrate
manual web, API and business-logic testing. A cheaper non-CREST firm may only be
considered after checking tester qualifications, references, professional
indemnity insurance, secure evidence handling and an equivalent methodology.

Compare quotes on total price, days of manual testing, named tester experience,
test coverage, reporting quality, one included retest, scheduling, insurance,
data location/deletion, NDA/DPA terms and conflicts of interest. Do not select on
the lowest price alone.

## Proposed scope

### Environment

- Test the isolated Railway staging deployment, currently identified as
  `study-buddy-v2-staging.up.railway.app`, with its separate staging Supabase
  project and test-only provider credentials.
- Use synthetic accounts and data only. Provide adult and age-13-to-17 guardian
  test journeys, including separate attacker/victim accounts.
- Production is excluded except for passive confirmation of public TLS, DNS and
  security headers expressly listed in the signed rules of engagement.
- Railway, Cloudflare, Supabase, OpenAI, Resend and Paystack infrastructure is
  excluded. Testing must stay within Study Buddy's application tenancy and must
  not attack or load-test those providers.

### In scope

- Next.js web application and exposed first-party API routes.
- Supabase authentication integration: registration, email verification, login,
  logout, sessions/cookies, password recovery and password-abuse locking.
- Account and object authorisation, including horizontal/vertical privilege
  escalation, IDOR/BOLA and cross-account data access.
- Age gating, minor-account restrictions, guardian authorisation and withdrawal
  boundaries exposed in the staged product.
- Account deactivation, deletion confirmation, recovery/cancellation and
  lifecycle endpoints.
- CSRF/origin enforcement, CORS, CSP and other security headers, clickjacking,
  open redirects, injection, request smuggling indicators and unsafe error
  disclosure at the application boundary.
- Per-account, per-IP and global rate limits, request-size limits and timeouts,
  using safe agreed thresholds rather than denial-of-service volumes.
- AI endpoints: unauthorised use, quota/cost bypass, cross-user history access,
  prompt-injection effects on application actions/data, output handling and
  abuse-control bypass. Model quality or educational correctness is excluded.
- Paystack checkout and webhook flows only in test mode: signature validation,
  replay/idempotency, amount/currency/reference tampering, renewal, cancellation
  and refund business logic that is actually deployed at test time.
- Configuration and secrets review based on redacted evidence supplied by Study
  Buddy; no secret values should appear in the report.
- Dependency and exposed-source review relevant to exploitable application risk.
- Any upload surface actually enabled for launch. If uploads remain inaccessible,
  record them as not exposed rather than testing dormant internal tooling.

Testing should use the current
[OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/),
[OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
and [OWASP API Security Top 10](https://owasp.org/API-Security/) as baselines,
supplemented by manual business-logic testing.

### Explicitly excluded without a separately signed change

- denial-of-service, stress or volumetric testing;
- phishing, social engineering, physical testing or attacks on founders/users;
- persistence, destructive database actions or deletion of non-test data;
- malware, ransomware or destructive payload execution;
- accessing or retaining real child, customer, payment or conversation data;
- testing third-party/provider control planes or shared infrastructure;
- publishing findings or making public disclosure; and
- production exploitation beyond the minimum non-invasive proof expressly
  authorised in writing.

## Rules of engagement required before testing

The signed statement of work must name the exact hosts, dates, time zone, source
IPs, techniques, test accounts and provider personnel. It must also include:

- written authorisation from a company director or otherwise authorised company
  signatory;
- a primary contact, backup contact and 24-hour emergency/stop contact for both
  parties;
- immediate stop conditions for instability, unexpected real data, third-party
  impact or scope uncertainty;
- a process for urgent notification of suspected critical findings without
  sending secrets through ordinary email;
- NDA and appropriate data-processing terms before any personal data could be
  encountered;
- encryption in transit and at rest, least-access handling, evidence location,
  retention/deletion period and deletion confirmation;
- no subcontractor without prior written approval and equivalent obligations;
- liability, professional indemnity insurance, governing law and incident
  responsibility; and
- written confirmation that the activity will not exceed Study Buddy's authority
  over provider systems.

Cloudflare/Railway protections must not simply be disabled globally. If the test
requires allowlisting, restrict it to the provider's named source IPs, staging
only, and the agreed window, then remove it after the test.

## Required deliverables

- kickoff and confirmed test plan;
- immediate secure notification of a suspected critical finding;
- executive summary and detailed technical report;
- severity with rationale (CVSS may support, but not replace, business impact);
- affected asset/endpoint, reproducible steps, redacted evidence and practical
  remediation for every finding;
- positive coverage statement and clearly listed untested/out-of-scope areas;
- confirmation of whether any real data or secrets were encountered;
- one included retest after remediation, with results mapped to every finding;
- final closure letter/report and secure evidence-deletion confirmation.

Reports and evidence belong in the company's restricted evidence store, not this
Git repository. Only a non-sensitive completion record, date, scope, provider,
finding counts and closure status should be committed here.

## Ready-to-send quote request

Subject: Quote request — independent web/API penetration test for Study Buddy

> Hello,
>
> Study Buddy Global Projects Limited is preparing a Nigerian education platform
> for a future public/paid launch. We would like a fixed-price quote for an
> independent manual penetration test of our isolated staging environment. The
> application is a Next.js web/API service using Supabase Auth/PostgreSQL,
> Railway, Cloudflare, OpenAI, Resend and test-mode Paystack. It includes adult
> and guardian-authorised 13–17 user journeys.
>
> Please quote separately for the initial test and one retest, state the manual
> testing days included, earliest available dates, expected duration, named
> tester qualifications, methodology, deliverables, insurance, subcontractors,
> evidence location/deletion terms and any prerequisites. Testing must exclude
> denial-of-service, social engineering, real user data, production exploitation
> and attacks on third-party infrastructure. We can provide the attached scope
> and agree detailed rules of engagement before access is issued.
>
> Please also confirm your current CREST penetration-testing accreditation and
> experience testing authentication, multi-user authorisation, payment webhooks,
> account-deletion flows and AI-enabled web applications.
>
> Regards,  
> Nick Efe Oni  
> Study Buddy Global Projects Limited  
> `security@studybuddyng.com`

## Internal preparation checklist

- [ ] Approve a maximum budget and desired completion date.
- [ ] Choose the authorised company signatory and procurement owner.
- [ ] Send the same brief to at least three providers and record quotes privately.
- [ ] Select the provider and sign the statement of work, NDA/DPA and rules of
      engagement.
- [ ] Freeze the launch-candidate build and record its commit/deployment ID.
- [ ] Seed synthetic adult, minor/guardian, attacker and victim accounts.
- [ ] Confirm staging has no production data or live payment/email side effects.
- [ ] Back up staging and practise rollback before the window.
- [ ] Configure temporary staging-only source-IP allowlisting if necessary.
- [ ] Assign Nick Efe Oni and Chijindu Oreh as primary/backup test contacts.
- [ ] Triage findings, remediate, run regression tests and obtain the retest.
- [ ] Record the co-founders' final go/no-go decision and accepted residual risks.

