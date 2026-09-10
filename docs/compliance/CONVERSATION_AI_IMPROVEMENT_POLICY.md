# Conversation-Based AI Improvement Policy

Status: approved in principle; disabled pending implementation and review  
Approved by: Nick Efe Oni and Chijindu Oreh  
Last updated: 10 September 2026

## Decision and current state

Study Buddy intends to use selected conversation data to train or evaluate its
own AI systems in the future. This processing is not active in the current beta.
Current evaluation tooling uses purpose-built fixtures and must not be connected
to production user conversations.

The OpenAI API organisation's optional sharing for improvement of OpenAI's own
models is disabled. That decision is separate from Study Buddy's future use and
does not authorise fine-tuning, evaluation uploads, or training with any
provider.

## Participation rule

Conversation-based AI improvement must be voluntary and off by default:

- a user aged 18 or over must make a separate affirmative choice;
- for a user aged 13–17, a parent or legal guardian must authorise this specific
  purpose and the student must also affirmatively choose to participate;
- neither the core account nor ordinary AI tutoring may be withheld because a
  user declines or withdraws; and
- consent must be specific, informed, versioned, recorded, and as easy to
  withdraw as it was to give.

## Data rules

Only the minimum selected data may be used. Before it reaches an improvement
dataset, the pipeline must remove direct identifiers, screen for sensitive and
third-party personal data, and test the result for reasonable re-identification
risk. Source and derived datasets must be isolated from production, encrypted,
least-privilege, time-limited, and fully audited.

The no-routine-reading rule remains in force. This policy does not permit staff
to browse raw or identifiable conversations. Any exceptional access continues
to require a permitted case under `CONVERSATION_ACCESS_POLICY.md`.

## Withdrawal and deletion

Withdrawal must immediately prevent new collection and new training/evaluation
use. Dataset lineage and membership records must support removal of eligible
source and derived copies. Before any model training, the notice must explain
whether a contribution can be removed after it has been incorporated into a
trained model. Training must not begin unless the user or authorising adult has
accepted that exact notice.

## Activation gate

The feature must remain disabled until:

1. the revised children-and-AI DPIA and lawful-basis/consent assessment are
   signed by both co-founders and reviewed by a qualified Nigerian privacy
   adviser;
2. age-appropriate opt-in, withdrawal, deletion, dataset-lineage,
   de-identification, access/audit, retention, and provider controls are
   implemented and tested;
3. security, re-identification, memorisation, personal-data leakage, child
   safety, and bias evaluations pass approved thresholds;
4. the public notices match the tested production behaviour; and
5. monitoring, a kill switch, release approval, rollback, and incident response
   are operational.

The detailed engineering work and acceptance criteria are maintained in
`NEXT_IMPLEMENTATION_TODOS.md`.
