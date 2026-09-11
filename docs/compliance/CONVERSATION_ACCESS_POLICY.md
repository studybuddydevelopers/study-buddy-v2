# AI and WhatsApp Conversation Access Policy

Status: co-founder-approved policy; technical enforcement pending  
Approved by: Nick Efe Oni and Chijindu Oreh  
Last updated: 11 September 2026

## Rule

Study Buddy personnel do not routinely read individual AI or WhatsApp
conversations. During beta, only Nick Efe Oni and Chijindu Oreh may access
conversation content, and only when the access is necessary for one of the
permitted cases below. This authority does not create permission to browse,
sample, or monitor conversations generally.

## Permitted cases

Access is permitted only to:

1. resolve a support request where the user asks Study Buddy to examine a
   specific conversation;
2. investigate a user-reported harmful response or a credible child-safety or
   imminent-harm concern;
3. investigate suspected account compromise, fraud, abuse, or a security
   incident;
4. diagnose a specific technical failure when metadata and other less intrusive
   information are insufficient; or
5. comply with a valid court order, regulatory request, or other legal
   obligation after its validity and scope have been reviewed.

Access is prohibited for curiosity, marketing, general surveillance, routine
product improvement, employee monitoring, and review of identifiable or
non-opted-in conversations for AI training or evaluation. The approved future
AI-improvement plan applies only after its separate off-by-default choice,
de-identification, child-authorisation, withdrawal, DPIA, security, and audit
gates are implemented. It does not permit staff to browse raw conversations.

## Minimum controls

Each access must:

- have a case identifier, permitted reason, affected user, approver, reviewer,
  scope, start time, expiry time, and outcome;
- begin with metadata or redacted information and expose only the minimum
  messages necessary;
- be time-limited and automatically revoked;
- produce tamper-resistant audit events without copying message text into logs;
- remain within Study Buddy-approved systems and never be copied to personal
  email, devices, or tools;
- preserve confidentiality and be disclosed only to people necessary for the
  case; and
- be reviewed at closure and included in a monthly access-log review.

A proactive review requires the other co-founder's approval. An emergency
child-safety or imminent-harm review may begin without prior approval only when
delay would materially increase risk. The other co-founder must review that
access within 24 hours. A potentially unsafe parent or guardian must not be
notified merely because the user is a child; any notice must consider the
child's safety and applicable law.

## Current implementation status

The current product does not provide a general staff conversation-reading
screen. The dedicated break-glass approval, time-limited access, and audit
workflow has not yet been implemented. Until it exists, database or service
credentials must not be used for routine review. Genuine emergencies and valid
legal obligations must be documented manually in a restricted case record and
reviewed by both co-founders.

The engineering checklist and acceptance tests are maintained in
`NEXT_IMPLEMENTATION_TODOS.md`. This policy must be reviewed before adding any
staff-review interface or enabling conversation-based AI improvement, when the
joint privacy-lead or formal DPO arrangement changes, and after any material
change to AI providers, safety processes, or legal duties.
