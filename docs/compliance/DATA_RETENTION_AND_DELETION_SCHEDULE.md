# Data Retention and Deletion Schedule

Status: account-deletion targets approved; remaining periods require co-founder and legal approval
Owner: to be appointed  
Last reviewed: 5 September 2026

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
| Supabase authentication account and core `User` record | While active or reversibly deactivated under the pending inactive-account policy | Permanent deletion restricts access immediately and purges application/Auth records within 30 days unless held | Self-service request and retryable purge are implemented; Railway must set the cron secret and invoke the job at least hourly |
| User profile and preferences | While the account is active or reversibly deactivated | Cascade-delete with the account within 30 days of a permanent request | Covered by the account purge; inactive-account duration remains undecided |
| Local practice drafts | Until submitted, cleared, or removed by the browser/user | Clear when the user chooses; provide clear control | Stored on each device; server cannot guarantee browser deletion |
| Cloud practice drafts | While needed for the unfinished activity | Proposed: delete 90 days after last draft activity or with account, whichever comes first | Automated expiry job not implemented |
| Practice attempts, quiz sessions, mock exams, answers, progress, and recommendations | While account is active and needed for learning history | Delete with account; proposed inactive-account review after 24 months | Recommendation rows already require a retention decision; no expiry job |
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
| Application/database backups | Short recovery window | Approved target: deleted data expires within 90 days of the permanent request and is not restored to live use | Verify and record Supabase/Railway backup settings before relying on this guarantee in production |
| Anonymised aggregate learning statistics | While useful | Review annually; may be kept if re-identification is not reasonably possible | Anonymisation standard and review evidence need definition |
| Administrative resources and extraction records | While licensed, approved, and needed | Remove when rights end or source is withdrawn; keep minimal audit evidence as required | Rights/provenance register must be completed |

## Deletion workflow

1. Authenticate the requester and record the scope and date.
2. Place the request in the privacy-request register.
3. Identify linked Supabase, Prisma, WhatsApp, payment, provider, and
   browser-storage data.
4. Check for a documented legal hold; do not use a generic “legal reasons” flag.
5. Restrict the account and stop optional processing where appropriate.
6. Delete or anonymise primary records and send provider deletion requests.
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
| Permanent account deletion: active systems within 30 days | Co-founders; privacy adviser review | Approved by co-founders; legal review pending |
| Reversibly deactivated/inactive account period | Co-founders/privacy adviser | Pending |
| Child authorisation evidence period | Privacy adviser | Pending |
| Transaction statutory period | Finance/legal | Pending |
| Backup expiry within 90 days of permanent request | Co-founders; engineering/provider owner | Policy approved; provider configuration verification pending |
| Support and security-log periods | Privacy/security | Pending |
| Automated account deletion implementation | Engineering | Implemented; Railway cron configuration and production verification pending |
