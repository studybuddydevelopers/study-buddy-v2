# Chat response reports

Learners can use **Report response** beside Copy on a completed tutor response.
The form records a reason and optional details and attaches the saved question
and response. It returns a reference and **Awaiting review** status after the
server saves the report. A failed submission retains the form; opening a report
again shows its current status. One response has one report, so retrying a
submission cannot create duplicate cases or overwrite the original details.
Submissions are limited per account and by a higher shared-IP ceiling so abuse
is bounded without treating a school network as a single learner.

Support opens **Chat response reports** from the existing restricted review
workspace. Open and reviewed cases are paginated. Each case shows the original
question, response and learner's concern. Support records a review note for the
learner and marks the case reviewed. The first saved review is retained if a
second submission races with it. The learner can reopen Report on the response
to read the note. This workflow records feedback; the original answer remains
part of the conversation.

Reports follow the chat/account deletion lifecycle. Deleting the message/chat
or the submitting account removes the linked report. Removing a reviewer account
clears its identity link without discarding another learner's report.

## Deployment and verification

The migration `20261122190000_add_ai_chat_message_reports` must be applied through
the normal staging-first deployment process before reports can be submitted.
Regenerate the Prisma client as part of the build. The migration and application
changes must be released together. Preparing and checking the migration locally
does not mean it has been applied to staging or production.

Validation covers authentication, owned completed responses, input validation,
duplicate submission, submission limits and restricted review updates. Synthetic
Chromium/WebKit checks cover submitting from the intended message, failure and
retry, pending-action protection, status reopening, review notes and 320px
layouts. These checks use synthetic data and do not establish live database or
support-operation readiness.

Keep real learner responses, case references, reviewer identities and live
operational configuration out of public documentation and screenshots.
