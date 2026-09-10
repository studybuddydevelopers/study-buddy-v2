# Data Retention and Deletion Schedule

Status: account, conversation, learning, and transaction targets approved; remaining periods require co-founder and legal approval
Owner: to be appointed  
Last reviewed: 10 September 2026

## Rules

Study Buddy must keep identifiable data only while it serves a documented
purpose or legal requirement. Expiry must trigger deletion, irreversible
anonymisation, or a documented legal hold. Moving data to a backup, archive, or
soft-deleted row does not complete deletion.

The proposed periods below are conservative operational targets, not statements
of statutory periods. Finance/legal must confirm Nigerian tax, accounting,
consumer, safeguarding, limitation, and regulatory requirements before approval.

The approved seven-year transaction period is an operational buffer around two
current statutory baselines: section 31(5) of the [Nigeria Tax Administration
Act 2025](https://nass.gov.ng/documents/download/11250) requires relevant books
and records for at least six years after the applicable year of assessment, and
sections 374–375 of [CAMA
2020](https://www.cac.gov.ng/wp-content/uploads/2020/12/CAMA-NOTE-BOOK-FULL-VERSION.pdf)
require company accounting records to be preserved for six years from creation.
An accountant or Nigerian legal adviser must confirm application to Study Buddy
and any transition-period records.

## Proposed schedule

| Data category | Active retention | Proposed deletion trigger and target | Current implementation gap |
| --- | --- | --- | --- |
| Supabase authentication account and core `User` record | While active; for 36 months after voluntary deactivation | Deactivated accounts receive notices 90, 60, 15, and 1 day before automatic deletion. A user-requested permanent deletion instead uses a 24-hour confirmation link, locks access after confirmation, and starts a 15-day cancellation window | Both paths feed the retryable application/Auth purge; the hourly Railway cron has passed a production invocation |
| User profile and preferences | While active or during the 36-month reversible-deactivation period | Cascade-delete at inactive-account expiry, or after the separate confirmed-deletion cancellation window | Covered by the account purge; provider backup expiry still requires verification |
| Local practice drafts | Until submitted, cleared, or removed by the browser/user | Clear when the user chooses; provide clear control | Stored on each device; server cannot guarantee browser deletion |
| Cloud practice drafts | While needed for the unfinished activity | Proposed: delete 90 days after last draft activity or with account, whichever comes first | Automated expiry job not implemented |
| Practice attempts, quiz sessions, submitted answers, mock-exam results, and progress | While the account is active and throughout the approved 36-month reversible-deactivation period | Delete with the account at inactive-account expiry or through confirmed permanent deletion, subject only to a documented legal hold or mandatory limited retention | Implemented through user-linked cascade deletion in the account purge |
| Recommendation rows | While needed to provide current recommendations | Retention/anonymisation period remains to be approved; delete identifiable rows with the account | Separate retention decision and any active-account expiry job remain pending |
| Web AI chats and messages | While the account is active, as user-accessible saved study history | Permanently delete from the live database when the user deletes the chat, permanently deletes the account, or reaches the 36-month deactivated-account expiry | Chat-level hard deletion is implemented; provider and backup copies follow their separate periods |
| Legacy AI-question and WhatsApp tutoring threads | While the account is active, as user-accessible saved study history | Delete on a verified privacy request, permanent account deletion, or 36-month deactivated-account expiry; WhatsApp users can use the two-step `DELETE MY CHAT` command with a 15-minute confirmation window | WhatsApp self-service hard deletion is implemented; legacy non-WhatsApp threads still use the privacy-request route |
| AI generation metadata and token counts | While needed for service reliability, disputes, and cost controls | Proposed: aggregate/anonymise after 12 months; delete identifiable records with chat/account | Automated anonymisation not implemented |
| Future AI-improvement source samples, derived datasets, evaluation results, and model artefacts | No current retention because conversation-based improvement is disabled during beta | Periods must be approved before activation; withdrawal/account deletion must remove eligible source and derived copies, while any limits for already-trained models must be disclosed before opt-in | Consent, lineage, de-identification, retention, withdrawal, memorisation testing, and deletion controls are not implemented |
| AI daily usage counters and rate-limit buckets | Short operational period | Rate-limit buckets at configured expiry; proposed usage-counter anonymisation after 90 days | Confirm purge job and database TTL behaviour |
| Parent/legal-guardian authorisation events | While account is active plus approved evidence period | Proposed: six years after withdrawal/account closure only if legal advice confirms necessity; otherwise shorter | Event register is implemented; exact evidence period remains undecided |
| Subscription/service-access records | While the account is active and throughout the 36-month reversible-deactivation period | Delete with the account; retain only the minimum billing evidence copied into the restricted transaction record | Current account-purge cascade deletes the subscription row; confirm necessary billing evidence is captured by the transaction ledger |
| Essential payment, invoice, and transaction records | Seven years from the transaction date, including after account deletion | At seven years, delete or irreversibly anonymise unless a documented tax audit, chargeback, dispute, investigation, or legal hold remains active | Account deletion already sets `Transaction.userId` to null; automated expiry, legal-hold fields/workflow, and deletion evidence remain to be implemented |
| Full card/bank data | Not stored by Study Buddy | Paystack controls its retention | Verify no logs or metadata accidentally contain it |
| Contact/support requests | Until resolved and needed for follow-up | Proposed: 12 months after resolution; longer only for a documented dispute/hold | Current contact endpoint does not provide a complete ticket register |
| Security/audit events | Based on risk and investigation need | Proposed: 12 months; extend only for an active incident or legal hold | Central retention and deletion controls need verification |
| CAPTCHA/provider logs | Provider-defined and configuration-dependent | Minimise transmission; document provider period and contract | Provider settings and periods need confirmation |
| Application/database backups | Short recovery window | Approved target: deleted data expires within 90 days of final email confirmation and is not restored to live use | Verify and record Supabase/Railway backup settings before relying on this guarantee in production |
| Anonymised aggregate learning statistics | While useful | Review annually; may be kept if re-identification is not reasonably possible | Anonymisation standard and review evidence need definition |
| Administrative resources and extraction records | While licensed, approved, and needed | Remove when rights end or source is withdrawn; keep minimal audit evidence as required | Rights/provenance register must be completed |

## Deletion workflow

1. Re-authenticate the requester with the current password and exact typed confirmation.
2. Email a one-time confirmation link; do not restrict or schedule the account until the user deliberately confirms on the linked page.
3. Record final confirmation, immediately restrict the account, and start the 15-day cancellation window.
4. Identify linked Supabase, Prisma, WhatsApp, payment, provider, and
   browser-storage data.
5. Check for a documented legal hold; do not use a generic “legal reasons” flag.
6. At the cancellation deadline, delete or anonymise primary records and send provider deletion requests.
7. Prevent deleted records from being restored into live processing from backup.
8. Record systems checked, exceptions, completion date, and evidence reference.
9. Confirm completion to the requester without disclosing internal security data.

## Legal holds

A legal hold must state the category, person authorising it, legal reason, start
date, review date, affected records, and release decision. Review holds at least
every 90 days. A hold must preserve only information relevant to the stated need.

## Verification and ownership

- Engineering owns automated expiry, hard deletion, and backup behaviour.
- Privacy/support owns identity verification, the request register, and notices.
- Finance owns the confirmed transaction-retention rule.
- The appointed privacy owner audits a sample of deletion evidence quarterly.

## Approval record

| Decision | Owner | Status |
| --- | --- | --- |
| Permanent account deletion: email confirmation, 15-day cancellation window, active systems within 30 days | Co-founders; privacy adviser review | Approved by co-founders; legal review pending |
| Reversibly deactivated/inactive account period: 36 months with notices at 90, 60, 15, and 1 day | Co-founders; privacy adviser review | Approved by co-founders; legal review pending |
| AI and WhatsApp conversation content: while the account is active until user/chat/account deletion or inactive-account expiry | Co-founders; privacy adviser review | Approved by co-founders; chat deletion controls implemented; legal review pending |
| Submitted study history, answers, progress, and mock-exam results: active account plus 36-month reversible-deactivation period | Co-founders; privacy adviser review | Approved by co-founders; account-purge cascade implemented; legal review pending |
| Child authorisation evidence period | Privacy adviser | Pending |
| Essential payment, invoice, and transaction records: seven years from transaction date | Co-founders; accountant/legal review | Approved by co-founders; CAMA/NTAA basis identified; expiry and legal-hold automation pending |
| Backup expiry within 90 days of final confirmation | Co-founders; engineering/provider owner | Policy approved; provider configuration verification pending |
| Support and security-log periods | Privacy/security | Pending |
| Automated account deletion implementation | Engineering | Implemented; Railway hourly cron returned a successful production invocation on 10 September 2026 |
