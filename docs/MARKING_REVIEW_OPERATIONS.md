# Marking-review operations

Study Buddy stores disputed AI marks as tracked cases instead of preparing an
email. A learner creates a case from the relevant question in a completed
written mock exam and receives a reference in the form
`SBMR-YYYYMMDD-XXXXXXXXXXXX`.

## Grant support access

Verified, active accounts whose email address is on the exact
`@studybuddyng.com` domain receive support access automatically. The account
must exist in Supabase Auth, have a confirmed email address, and have an active
application `User` record. Lookalike domains are not accepted.

`MARKING_REVIEW_SUPPORT_USER_IDS` is an optional exception list for authorised
staff who do not use the company domain. Set it on the web service to a
comma-separated list of application `User.id` values. These are the same stable
UUIDs used by Supabase Auth. Do not use email addresses and do not put this
server-only value in a `NEXT_PUBLIC_` variable.

Authorised staff use `/support/marking-reviews`. Keep the list to the minimum
number of staff needed, remove access when a staff member changes role, and
review it whenever production secrets are rotated. An empty or missing value
only disables allowlist exceptions; verified `@studybuddyng.com` accounts can
still access the support queue.

## Case handling

- `Approve original mark` records that support upheld the AI score.
- `Change mark` requires a whole-number mark within the question's allowed
  range.
- Every decision needs a learner-visible note.
- A resolved case cannot be resolved again through the application.
- A mark change, the recalculated paper total, and any applicable current
  subject-progress update run in one database transaction.
- Progress is changed only when the reviewed paper is the learner's latest
  graded paper for that subject; historical corrections must not replace a
  newer result.

The case preserves snapshots of all evidence present when it was reported. Its
append-only event records retain the original score and the support decision.
Normal account-deletion cascades still remove cases and events belonging to the
deleted learner.
