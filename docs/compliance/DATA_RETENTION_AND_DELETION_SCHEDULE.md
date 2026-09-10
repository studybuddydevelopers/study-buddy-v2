# Data Retention and Deletion Schedule

Status: account-deletion targets approved; remaining periods require co-founder and legal approval
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

## Proposed schedule

| Data category | Active retention | Proposed deletion trigger and target | Current implementation gap |
| --- | --- | --- | --- |
| Supabase authentication account and core `User` record | While active; for 36 months after voluntary deactivation | Deactivated accounts receive notices 90, 60, 15, and 1 day before automatic deletion. A user-requested permanent deletion instead uses a 24-hour confirmation link, locks access after confirmation, and starts a 15-day cancellation window | Both paths feed the retryable application/Auth purge; Railway must set the cron secret and invoke the job at least hourly |
| User profile and preferences | While active or during the 36-month reversible-deactivation period | Cascade-delete at inactive-account expiry, or after the separate confirmed-deletion cancellation window | Covered by the account purge; provider backup expiry still requires verification |
| Local practice drafts | Until submitted, cleared, or removed by the browser/user | Clear when the user chooses; provide clear control | Stored on each device; server cannot guarantee browser deletion |
| Cloud practice drafts | While needed for the unfinished activity | Proposed: delete 90 days after last draft activity or with account, whichever comes first | Automated expiry job not implemented |
| Practice attempts, quiz sessions, mock exams, answers, progress, and recommendations | While account is active or within the approved 36-month reversible-deactivation period | Delete with the account at inactive-account expiry or confirmed permanent deletion | Recommendation rows still require a separate active-account retention decision |
| Web AI chats and messages | Until user deletes the chat, closes the account, or it is no longer needed | Remove from view immediately; proposed hard deletion within 30 days, subject to hold | Product currently soft-deletes chats using `deletedAt`; permanent purge is not implemented |
| Legacy AI-question and WhatsApp tutoring threads | While account/WhatsApp service is active | Proposed: delete 12 months after last activity or with account | Expiry and user-facing deletion workflow not implemented |
| AI generation metadata and token counts | While needed for service reliability, disputes, and cost controls | Proposed: aggregate/anonymise after 12 months; delete identifiable records with chat/account | Automated anonymisation not implemented |
| AI daily usage counters and rate-limit buckets | Short operational period | Rate-limit buckets at configured expiry; proposed usage-counter anonymisation after 90 days | Confirm purge job and database TTL behaviour |
| Parent/legal-guardian authorisation events | While account is active plus approved evidence period | Proposed: six years after withdrawal/account closure only if legal advice confirms necessity; otherwise shorter | Event register is implemented; exact evidence period remains undecided |
| Subscription records | Subscription term plus dispute/financial period | Delete or anonymise after statutory period | Statutory period requires finance/legal confirmation |
| Transaction references, amount, currency, and status | Required financial, tax, fraud, and consumer period | Proposed: six years after transaction, subject to advice | Confirm exact legal period and purge/export process |
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
| Child authorisation evidence period | Privacy adviser | Pending |
| Transaction statutory period | Finance/legal | Pending |
| Backup expiry within 90 days of final confirmation | Co-founders; engineering/provider owner | Policy approved; provider configuration verification pending |
| Support and security-log periods | Privacy/security | Pending |
| Automated account deletion implementation | Engineering | Implemented; Railway cron configuration and production verification pending |
