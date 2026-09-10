# Record of Processing Activities

Status: initial Article 24 accountability record — owners and final decisions
pending  
Controller: STUDY BUDDY GLOBAL PROJECTS LIMITED (RC 9825797), 24 Anthony Enahoro Street, Utako, Abuja, FCT, Nigeria
Privacy contact: `privacy@studybuddyng.com`
Privacy request handlers: Nick Efe Oni and Chijindu Oreh (jointly)
Last reviewed: 10 September 2026

This record must be maintained as the product changes. “Pending” is a work item,
not approval to process. Confirm the controller/processor role, lawful basis,
retention, provider region, and transfer safeguard before production use.

## Controller processing

| ID | Activity and purpose | Data subjects and data | Preliminary basis | Recipients/transfers | Retention | Owner/status |
| --- | --- | --- | --- | --- | --- | --- |
| ROPA-01 | Register, authenticate, recover and secure user accounts | Students/adults; name, email, phone, date of birth, terms version, account/AI-authorisation status, auth ID, session and security data; for ages 13–17, guardian name/email/relationship and decision events | Contract/requested steps; legitimate interests for security; parent/legal guardian authority for ages 13–17 | Supabase, CAPTCHA, Resend, hosting; regions pending | Account life or reversible deactivation; confirmed deletion has a 15-day cancellation window and active purge within 30 days; other periods pending | 13+/18-independent and two-stage email-confirmed account-lifecycle workflows implemented; production deletion scheduler and legal assurance pending |
| ROPA-02 | Maintain learner profile and preferences | Students; name, phone, grade, exam year, subjects, avatar, settings | Contract/requested service | Supabase/PostgreSQL, hosting | Account life plus approved deletion period | Product owner pending |
| ROPA-03 | Deliver practice questions, drafts and explanations | Students; question IDs, answers, drafts, results, session/activity data | Contract/requested service; legitimate interests for reliability | Supabase/PostgreSQL; browser local storage | See retention schedule; cloud/local controls apply | Learning owner pending |
| ROPA-04 | Deliver and grade mock exams | Students; template/instance IDs, answers, timing, score and completion status | Contract/requested service | Supabase/PostgreSQL, hosting | See retention schedule | Learning owner pending |
| ROPA-05 | Calculate progress and recommendations | Students; attempts, scores, subjects, topics, usage and recommendation records | Contract; legitimate interests subject to balancing | Supabase/PostgreSQL; OpenAI where recommendation generation uses it | Account life; review/anonymisation period pending | DPIA required; human-review route pending |
| ROPA-06 | Provide persistent web AI chat | Students/adults; prompts, relevant context, responses, provider/model/token data, status/failure data | Contract/requested feature; security legitimate interests | OpenAI, Supabase, hosting; international transfer pending | Account closure purges through cascade within 30 days; chat-only hard-purge period pending | High risk; safety and chat-only deletion gates open |
| ROPA-07 | Provide WhatsApp tutoring | Students/adults; WhatsApp number/sender ID, messages, responses, thread/account link | Contract/requested feature; valid messaging/child authority as applicable | Meta/WhatsApp, OpenAI, Supabase, hosting | Proposed activity period pending approval | Opt-in, deletion and child controls pending |
| ROPA-08 | Manage subscriptions and payment verification | Subscribers/payers; user ID, plan, reference, amount, currency, status and dates | Contract; legal obligation; fraud-prevention legitimate interests | Paystack, Supabase, hosting, financial/regulatory recipients where legally required | Statutory period to be confirmed | Finance owner and refund operations pending |
| ROPA-09 | Provide support and handle complaints/rights | Students, adults, schools; name, email, subject, message, identity/authority evidence, correspondence and decision | Contract; legal obligation; legitimate interests | Hosting/email/support providers when approved; regulators where required | Proposed 12 months after closure unless hold; approve | Joint handlers: Nick Efe Oni and Chijindu Oreh; operating workflow pending |
| ROPA-10 | Prevent fraud, abuse and security incidents | All users/attackers; IP/network data, account ID, timestamps, CAPTCHA, rate limits, audit/security events | Legitimate interests; legal obligation where applicable | Hosting, Supabase, CAPTCHA, security advisers/regulators where required | Proposed short operational periods/12-month logs; approve | Security owner pending |
| ROPA-12 | Manage learning resources and rights | Administrators/content owners; staff IDs, uploaded content, source, approval and processing records | Contract/legitimate interests; legal obligations for rights disputes | Supabase storage, hosting, extraction/security tools | Licence/service period plus dispute record | Provenance/rights register incomplete |
| ROPA-13 | Improve service with aggregate analysis | Users; product/learning events transformed into aggregate or anonymised statistics | Legitimate interests; consent if future non-essential tracking requires it | Internal team and approved analytics provider only if onboarded | Review annually; retain only if effectively anonymised | No behavioural analytics approved |
| ROPA-14 | Communicate account and important service notices | Account users/authorisers; email/phone, notice type, delivery event | Contract; legal obligation; legitimate interests | Supabase Auth email; Resend guardian-authorisation email; Meta for WhatsApp | Delivery/provider period pending | Code implemented; production Resend and Supabase SMTP configuration must be verified |

## Special/high-risk processing flags

- Children and other vulnerable learners: yes
- Profiling/recommendations: yes
- AI/new technology: yes
- Systematic learning history: yes
- Potential sensitive data in free-text: foreseeable, not requested
- Solely automated legally significant decisions: no intended use
- Advertising or sale of personal data: no
- Biometric identification: no intended use
- Full card/bank data stored by Study Buddy: no intended use
- International processing: likely; exact countries and mechanisms pending

## Rights and controls

| Requirement | Current route/control | Gap |
| --- | --- | --- |
| Notice | Privacy Policy, Parent/Student Notice and versioned guardian decision screen | Legal/content review remains pending |
| Access/copy | Email/contact request | Build secure request register and export process |
| Correction | Some profile fields editable; email request | Define correction for results, school links and AI metadata |
| Deletion | Chat soft delete; self-service deactivation; password plus one-time email-confirmed permanent deletion; 15-day cancellation window; retryable account/Auth purge | Deploy account purge scheduler, verify backup expiry, and implement chat-only hard deletion |
| Restriction/objection | Email request | Add operational flags and downstream provider handling |
| Consent withdrawal | Verified email request | Build operator/self-service restriction action and append the withdrawal event |
| Portability | Email request | Define machine-readable export and authentication |
| Automated decision review | Email request | Define owner, evidence, response and correction path |
| Complaint | Email, NDPC route in Privacy Policy | Implement case ownership and deadline tracking |

## Review triggers

Review this record before adding a provider, data field, analytics/advertising,
new AI model/use case, tutor marketplace, mobile app, school report, sensitive
data use, new country, materially different retention, or new data recipient.
Reconcile it against the Prisma schema, API routes, provider dashboards, live
environment, public notices, DPIA, retention schedule, and signed contracts.
