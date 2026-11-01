# Marking-review operations

This public document describes behaviour, not the live operator roster. Store
authorised user identifiers, access-review evidence, and account-recovery
details in the restricted operations system.

Study Buddy stores disputed AI marks as tracked cases instead of preparing an
email. A learner creates a case from the relevant question in a completed
written mock exam and receives a reference in the form
`SBMR-YYYYMMDD-XXXXXXXXXXXX`.

## Grant support access

Support access is restricted server-side to verified, active company identities
and any explicitly approved user-ID exceptions. Lookalike domains and ordinary
learner accounts are not accepted.

The optional exception list is server-only configuration. Never use email
addresses as the stored identifiers, never expose the value through a
`NEXT_PUBLIC_*` variable, and never commit the live list. Keep access to the
minimum number of staff, remove it immediately when duties change, and review
the effective roster on a fixed cadence.

The support queue URL and exact access mechanism are implementation details in
the application. Operators should enter through the normal authenticated UI;
do not distribute direct links or document test/operator identities publicly.

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
