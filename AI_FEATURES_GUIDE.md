# AI experience guide

Last checked against the working tree: 1 November 2026.

This guide covers the learner-facing experience and frontend integration, not
production credentials, privileged access configuration or adversarial test
payloads. Source availability is not proof of production activation.
For past defects and their current status, see the
[AI bug and fix history](docs/AI_BUG_AND_FIX_HISTORY.md).
Follow the [AI change process](docs/AI_CHANGE_PROCESS.md) for any change to
models, prompts, chat behavior, learning resources, evaluation, or AI claims.

## Saved study chat

The main `/chat` page uses [ChatClient](app/chat/ChatClient.tsx) and the persistent
`/api/v1/ai/chats` family. Learners can:

- Create/select saved chats with supported subject/topic context.
- Rename a chat using its title-save control.
- Reopen conversations after refresh and load paginated history.
- See pending, completed and failed generation states.
- Retry a failed reply without creating a second copy of their question.
- Permanently delete a chat after explicit confirmation.

White pencil/bin icons remain on save/delete actions. Conversation and chat-list
panels have their own scroll areas. Auto-scroll logic already exists; test
changes against long histories and learners reading older messages rather than
describing it as an entirely missing feature.

Reusable presentation lives in [ChatMessage](components/ChatMessage.tsx),
[ChatMessageContainer](components/ChatMessageContainer.tsx) and
[chatFailureCopy](components/chatFailureCopy.ts). Display safe user-facing copy,
not raw provider/server errors.

## Markdown and maths

[ChatMarkdown](components/ChatMarkdown.tsx) uses Streamdown, KaTeX,
GitHub-flavoured Markdown support and syntax highlighting.
[Math normalisation](lib/markdown-math.ts) prepares common model formatting.

- Test inline/display maths, `\cup`, `\cap`, fractions, escaped delimiters, mixed prose, lists, tables and code fences.
- Keep wide formulas, tables and code scrollable within their containers.
- Keep KaTeX's assistive-technology layer available without displaying a second visible copy.
- External image references render as text placeholders, not automatic downloads.
- Code blocks provide copying; external links identify that they open a new tab.
- Do not replace this pipeline with direct insertion of model-generated HTML.

Handling incomplete Markdown does not establish live token streaming. The
current renderer uses static mode and chat sends receive completed response
payloads. Malformed output still needs regression coverage; no renderer
guarantees that arbitrary broken maths can be repaired.

## General versus source-backed answers

The default described experience is persistent general study chat, not a
guarantee of grounding in approved resources. Conditional citation support
exists for the source-backed pipeline, but release requires the separate AI
acceptance process. Do not advertise citations, official WAEC answers,
guaranteed accuracy or tutor modes solely because the UI supports a future
response shape.

Model/provider selection is a server concern. Do not hard-code a production
model name into frontend copy or expose provider credentials in browser props,
public environment variables, logs or screenshots.

## Written mock-exam marking

[ExamInstanceClient](app/exams/ExamInstanceClient.tsx) presents written marking,
explanations and results. Paper 2 requires **5 AI credits per new attempt**;
repeating a template starts another chargeable attempt. Use server-supplied
eligibility/balance and display insufficient-credit and retry states clearly.

[MarkingReviewPanel](app/exams/MarkingReviewPanel.tsx) creates a case for the
specific answer the learner disputes. Review list/detail pages show the
reference, status, original/current scores and support decision. The locally
implemented notification centre reports resolved reviews; staging migration
and live checks are still pending.

AI marks are practice feedback, not official grades. Reporting a mark does not
replace marking-quality evaluation or communicating uncertainty.

## Recommendations and legacy interfaces

Persisted AI recommendations and legacy AiQuestion threads remain in the
backend. The legacy `/api/v1/ai/messages` endpoint is stateless; that description
must not be applied to today's saved-chat screen.

The dashboard uses its study-activity summary and topic recommendations.
Progress derives next actions from recorded learning evidence. Do not label
every dashboard/progress suggestion as a newly generated AI response.

## Frontend verification

Use synthetic study content for empty/long history, failed sends, retries,
lost connectivity, rename/delete confirmation, formula overflow and keyboard
focus. Check chat, exam and review screens at 320px and desktop widths.
Pending/read states must be understandable without animation or colour alone.

Relevant tests include [ChatMarkdown](components/ChatMarkdown.test.ts),
[math normalisation](lib/markdown-math.test.ts),
[chat failure copy](components/chatFailureCopy.test.ts) and notification/review
tests beside their implementations. Follow the
[website guide](docs/WEBSITE_GUIDE.md) and [UI checklist](docs/DMCTN_UI_TASTE_GATE.md).
