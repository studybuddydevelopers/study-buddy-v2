# AI experience guide

Last checked against the working tree: 1 November 2026.
Chat accessibility notes updated: 12 November 2026; no model/marking changes.
Conversation layout notes updated: 22 November 2026; no provider/credit changes.

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
- Search saved chat titles, including conversations beyond the initial history page.
- See pending, completed and failed generation states.
- Retry a failed reply without creating a second copy of their question.
- Report a completed tutor response and revisit its support-review status.
- Permanently delete a chat after explicit confirmation.

**New chat** opens an unsaved local draft. The first send creates its saved
conversation with any chosen title, subject and topic. Opening or changing
settings on an unsent draft makes no chat API write; leaving or refreshing it
does not add an empty conversation to history.

If the learner has not chosen a title, the first message also asks AI for a short
title describing its topic or learning goal. The saved title is returned with
the reply and appears in history. Naming runs alongside the answer and falls
back to the start of the learner's message if it fails. Later turns, retries and
older conversations are not automatically renamed, and a manual rename takes
precedence over a delayed AI title. This uses the existing chat provider and
token-budget controls; no database migration is required.

The ChatGPT-inspired workspace uses Study Buddy's purple palette, right-aligned
learner bubbles and unboxed tutor answers. White pencil/bin icons remain on
save/delete actions under **Chat settings**, alongside the subject/topic
selectors. History collapses on desktop and opens as a modal drawer below
1024px. Both versions include **New chat** and **Search chats** controls, with
Study Buddy panel-and-chevron icons for opening/closing history. Title search
is case-insensitive, offers more matches when available and has clear empty,
loading and retry states. It searches the learner's saved titles, not messages.
Search opens in a centred modal from 768px; phones keep it in the history drawer.
The tutor is named **AI Study Buddy Tutor**, including assistive labels. The
visible chat toolbar heading is removed while its accessible page name remains.
The existing AI avatar sits in a closer-fitting circle with a 3px black border
and less space above the head; complete
answers can be copied. Pending replies pair the animated SB volume-bar mark
with **Thinking through your question…**; reduced motion keeps the mark still.
Conversation loading uses the SB logo filled and cleared by purple splashes,
with a small grey caption below it. Reduced motion shows the filled logo.
The title-search focus indicator follows the complete outer field frame.

Conversation and chat-list panels have their own scroll areas. The growing
composer stays below the transcript; empty-state study suggestions prepare a
draft without making an AI request. Reading older messages pauses automatic
following, with a **Jump to latest message** action. Failed chat creation keeps
the unsent draft available for retry. Active sends/retries prevent switching
threads. These controls use the existing persistent-chat endpoints.

The composer has an accessible name and instructions for Enter/Shift+Enter;
the transcript is a named, keyboard-focusable scroll region. Automatic scrolling
uses instant movement when reduced motion is requested. Chat deletion uses a
native modal dialog with contained keyboard focus, Escape/backdrop dismissal
when idle and focus return on closing. During deletion, dismissal is blocked;
any failure is announced inside the dialog.

General saved-chat responses now allow more output and retain the provider's
completion reason. A response that hits the output limit is regenerated once
with a larger allowance using the same conversation context. Only the completed
answer is saved; a second cut-off or other incomplete result enters the existing
failed/retry state. This avoids splicing incomplete Markdown or maths and does
not create another learner turn. Each provider call retains the global token
budget guard; usage from both calls is combined when reported. This change does
not establish live answer quality or change the separate grounded-chat gate.

**Report response**, beside Copy, opens a reason/details form linked to the exact
saved response and its question. Submission returns a reference and pending
status; repeated submissions reuse the case. Support reviews cases through its
existing restricted workspace and saves a note. Learners reopen Report to see
the status and note. Reports are removed with their chat/account. See
[response-report operations](docs/CHAT_RESPONSE_REPORTS.md), including the
required migration before deployment.

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
- Repeated tables remain keyboard-scrollable, named groups without creating duplicate region landmarks.
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

The [12 November frontend record](docs/FRONTEND_BUG_AND_FIX_HISTORY.md#verification-for-the-accessibility-cleanup)
includes synthetic chat-dialog keyboard/browser checks. It does not establish
live deletion, generated-message announcements or screen-reader acceptance.
