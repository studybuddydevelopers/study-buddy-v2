# Chat response reports

Learners can use **Report response** beside Copy on a completed tutor response.
The form records a reason and optional details and attaches the saved question
and response. It returns a reference and **Awaiting review** status after the
server saves the report. A failed submission retains the form; opening a report
again shows its current status. One response has one report, so retrying a
submission cannot create duplicate cases or overwrite the original details.

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

The migration `20261122190000_add_ai_chat_message_reports` was applied to staging
and then production on 22 November 2026 using Prisma Migrate. Both environments
passed checks for the migration record, expected schema, access restrictions and
application database permissions. Neither environment has pending migrations.

Regenerate the Prisma client as part of the application build. This database
operation did not deploy application code or run authenticated live report and
support-review flows; those remain separate release acceptance checks.

A local report-status lookup failure was traced to a development server retaining
a Prisma client created before the report model was generated. The client cache
now checks the generated schema before reuse, with regression coverage in
[Prisma cache tests](../lib/prisma.test.ts). Restart the development server after
regenerating Prisma so route modules also load the current generated code.
Fresh-client report lookups against both databases passed without reading or
creating learner reports. After the local server restart, the learner confirmed
the form opened, and the server returned successful responses for an
authenticated status lookup, report submission and subsequent lookup. The
authenticated support-review cycle and deployed application acceptance remain
unverified.

Validation covers authentication, owned completed responses, input validation,
duplicate submission, submission limits and restricted review updates. Synthetic
Chromium/WebKit checks cover submitting from the intended message, failure and
retry, pending-action protection, status reopening, review notes and 320px
layouts. These checks use synthetic data and do not establish live database or
support-operation readiness.

Keep real learner responses, case references, reviewer identities and live
operational configuration out of public documentation and screenshots.
