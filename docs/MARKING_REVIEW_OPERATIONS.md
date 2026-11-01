# Marking-review operations

This public document describes behaviour, not the live operator roster. Store
authorised user identifiers, access-review evidence, and account-recovery
details in the restricted operations system.

Study Buddy stores disputed AI marks as tracked cases instead of preparing an
email. A learner creates a case from the relevant question in a completed
written mock exam and receives a reference in the form
`SBMR-YYYYMMDD-XXXXXXXXXXXX`.

## Learner experience

- Each eligible question offers its own report action, so the learner does not
  need to restate which answer is disputed.
- The learner's review list and individual case page show the reference,
  status, original mark and any decision. The case links back to the specific
  exam answer.
- A support decision creates an in-app notification linked to that case. The
  inbox supports read/unread state and loading older items; the navigation bell
  shows the unread count.
- These are source-level behaviours, not a deployment assertion. The
  notification migration and live staging checks were not verified during the
  1 November 2026 frontend documentation update.

See the [website guide](WEBSITE_GUIDE.md) and
[AI experience guide](../AI_FEATURES_GUIDE.md) for frontend states. Do not put
real learner answers, case identifiers or support decisions in public screenshots.

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
- The decision, its audit event and learner notification run in one database
  transaction with any mark change, recalculated paper total and applicable
  current subject-progress update.
- Progress is changed only when the reviewed paper is the learner's latest
  graded paper for that subject; historical corrections must not replace a
  newer result.

The case preserves snapshots of all evidence present when it was reported. Its
append-only event records retain the original score and the support decision.
Normal account-deletion cascades still remove cases and events belonging to the
deleted learner.
