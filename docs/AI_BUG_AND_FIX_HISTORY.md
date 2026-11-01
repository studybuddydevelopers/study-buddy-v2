# AI Bug and Fix History

Last reviewed: 1 November 2026. This is a public-safe record of AI-related
defects and corrections found in the tracked history of this checkout, plus
previously accepted review outcomes supplied for this project. Related commits
are grouped into incidents; this is not a claim that every past chat, test run,
or unrecorded report has been recovered. A commit or unit test proves source
history, not that a deployed environment was retested. The detailed historical
review artifacts are not all checked into this branch.

## How to read this register

- **Fixed in HEAD:** the cited correction is reachable from this branch's
  `HEAD`. Live behavior still needs release verification.
- **Other branch:** the cited correction is tracked in Git but is not in this
  branch's `HEAD`; do not treat it as deployed or inherited here.
- **Open:** the reported behavior or validation gap lacks a completed acceptance
  result for the current candidate.
- **Historical limitation:** a product capability was added, rather than a
  proven regression being repaired.

Commit IDs are local Git evidence (`git show <id>`). Test links identify
regression coverage, not a substitute for the runtime and human-review gates.
The [deployment/security register](DEPLOYMENT_SECURITY_FIX_HISTORY.md) covers
cross-cutting security incidents; this document does not repeat private
operational evidence or instructions for reproducing abuse.
Use the [AI change process](AI_CHANGE_PROCESS.md) when adding a fix or changing
an AI release decision.

## Chat, access, and lifecycle

| ID | Observed problem or limitation | Correction and evidence | Status |
| --- | --- | --- | --- |
| AI-001 | The original visible chat did not retain a conversation after refresh. | Stage 1 introduced persisted chats, messages, generation requests and an owned chat API (`eed49eb`); [service tests](../lib/ai/chats/chat-service.test.ts) cover the lifecycle. The separate legacy quick-chat endpoint remains stateless. | Historical limitation addressed in HEAD |
| AI-002 | Duplicate sends, pending generations and retries needed one logical user message and safe state transitions. | Transactional request creation, idempotency and conditional retry acquisition were added in Stage 1 (`eed49eb`); [tests](../lib/ai/chats/chat-service.test.ts) cover completed/pending duplicates, concurrent retries, invalid output and record ownership. | Fixed in HEAD |
| AI-003 | The client could lose the generation request reference after a failed send, making immediate retry unreliable. | Send/error responses now carry request metadata for both messages (`84d0328`); [chat service tests](../lib/ai/chats/chat-service.test.ts) and current client state handling cover retry. | Fixed in HEAD |
| AI-004 | Persisted turns could appear in the wrong order after a hard refresh. | Client ordering/state handling was corrected (`95fa0b3`), and the service supplies stable message ordering and separated timestamps (`84d0328`); [two-turn ordering test](../lib/ai/chats/chat-service.test.ts). | Fixed in HEAD |
| AI-005 | Subject/topic controls could change a conversation's classification after the first question. | The service reports started-chat state and rejects later classification changes while allowing rename (`84d0328`); [tests](../lib/ai/chats/chat-service.test.ts) cover empty and started chats. | Fixed in HEAD |
| AI-006 | Provider failures and validation codes appeared as raw-looking technical text in the chat UI. | Safe, learner-facing failure copy and clearer error handling were added (`7f80623`, `7cf1733`); [copy tests](../components/chatFailureCopy.test.ts). | Fixed in HEAD |
| AI-007 | Test-provider behavior could be confused with a deployable chat provider. | Production resolution now rejects the fake provider (`55923d2`); [fake-provider tests](../lib/ai/chat/fake-provider.test.ts) also cover controlled failure/invalid-output behavior. | Fixed in HEAD |
| AI-008 | A stale browser authentication key configuration prevented normal review-account login. | Public-key resolution and offline configuration tests were added (`14d8c64`, `94f6e31`). Ordinary login uses a public/publishable key, not an administrator key. Live provider settings must still be verified privately. | Fixed in HEAD; live config separate |
| AI-009 | AI routes needed a consistent authenticated-user check after account-access rules evolved. | The chat and legacy AI routes were updated to the shared AI-user requirement (representative commits `48d3a6b`, `44a9076`, `0d22420`); route tests cover access checks. | Fixed in HEAD |
| AI-010 | The progress view could show zero AI threads even after a saved chat had started. | The AI activity summary counts started persistent chats alongside legacy threads (`d25bf6c`); [summary tests](../lib/progress/ai-activity.test.ts). | Fixed in HEAD |
| AI-011 | Conversation deletion/retention behavior needed to match the approved privacy controls. | Chat and related lifecycle handling, UI confirmation and tests were updated (`a980071`); see [Stage 1 notes](AI_CHAT_STAGE_1_MIGRATION.md). Current chat deletion is permanent in the live database, not the original Stage 1 soft-delete design. | Fixed in HEAD; provider/backups separate |

## Chat presentation

| ID | Observed problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| AI-012 | Oversized avatars disrupted message alignment and narrow layouts. | Avatar sizing and bubble layout were constrained (`37f8a7e`, `8ed7b36`); current components are [ChatMessage](../components/ChatMessage.tsx) and [ChatMessageContainer](../components/ChatMessageContainer.tsx). | Fixed in HEAD; browser regression remains useful |
| AI-013 | Pending and failed replies were visually disconnected from the assistant turn. | Status-aware message rendering and loading presentation were improved (`740a3b7`, `8ed7b36`); failure copy is covered by [tests](../components/chatFailureCopy.test.ts). | Fixed in HEAD |
| AI-014 | Bullets, tables, code and some maths in AI answers were not rendered consistently. | Rich Markdown/KaTeX rendering and normalization were added and refined (`f265663`, `8b05be2`, `bc90a19`, `da74837`); [renderer](../components/ChatMarkdown.test.ts) and [math](../lib/markdown-math.test.ts) tests cover representative output. | Fixed in HEAD for covered formats; malformed model output remains a regression risk |
| AI-015 | Chat's page structure contained a duplicate main landmark. | The extra landmark was removed (`283bbdd`). | Fixed in HEAD |
| AI-016 | Chat table borders were hard to distinguish against white surfaces. | Table styling was adjusted (`a7e9f1c`); check desktop and mobile contrast during UI review. | Fixed in HEAD |

## Resources, retrieval, and evaluation infrastructure

| ID | Observed problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| AI-017 | Some DOCX content did not extract reliably. | Extraction handling was corrected (`85742cd`); [extraction tests](../lib/resources/extraction.test.ts). Extraction quality still requires human approval before retrieval eligibility. | Fixed in HEAD for covered files |
| AI-018 | Resource metadata could record an incorrect file byte count. | Resource-service assignment was corrected (`3351092`); [resource tests](../lib/resources/resource-service.test.ts). | Fixed in HEAD |
| AI-019 | Resource approval used the wrong user identifier in a service path. | The identifier mapping was corrected (`cd2b887`); [resource tests](../lib/resources/resource-service.test.ts). | Fixed in HEAD |
| AI-020 | A retrieval SQL operator was incompatible with the intended repository query. | The repository query was corrected (`f7ed085`); [search repository tests](../lib/resources/retrieval/postgres-resource-search-repository.test.ts). | Fixed in HEAD |
| AI-021 | Evaluation splits could include resources outside the selected case scope. | Resource selection and split filtering were tightened (`7e50d89`, `c1a31d5`); [runtime runner tests](../lib/ai/grounding/evaluation/runtime-runner.test.ts). This is evaluator isolation, not a change to student chat access. | Fixed in HEAD for covered splits |
| AI-022 | Evaluation setup did not always represent valid case metadata independently from selected resources. | Metadata/topology handling was added (`8be5f39`); [runner tests](../lib/ai/grounding/evaluation/runtime-runner.test.ts) cover setup without provider calls. Historical one-shot results stay consumed. | Fixed in HEAD for covered topology |
| AI-023 | A live database campaign was blocked by preflight/permission compatibility checks rather than completed AI-quality measurement. | Separate validation branches contain runner and database-access corrections (`92ba1af`, `dfddba4`, `6bec22b`). They are **not in this branch's HEAD**. No completed campaign result is recorded here. | Other branch; campaign open |

## Grounded answers and model quality

Grounded TEACH code and the Stage 4.1 capability pipeline are development
work. `AI_GROUNDED_CHAT_ENABLED=false` and the default production pipeline is
legacy; none of the entries below authorizes source-grounded claims to users.

| ID | Observed problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| AI-024 | A model could refuse despite sufficient selected evidence, or produce unsupported answer segments. | Grounded service handling and bounded repair/fail-closed tests were added (`94a95f7`, `eb0857a`); [grounding service tests](../lib/ai/chats/chat-service.test.ts). | Fixed in HEAD for covered cases; feature disabled |
| AI-025 | Related concepts, symbols and phrasing could be matched too loosely or too narrowly, causing wrong answers or false refusals. | Concept and symbol normalization were revised (`9416104`, `26df359`, `d042940`); [capability tests](../lib/ai/grounding/capability-model-refinement.test.ts) cover representative distinctions. | Improved in HEAD; fresh-holdout risk open |
| AI-026 | Multi-part/comparison requests could be answered from incomplete evidence. | Missing-side handling and scoped semantic rules were strengthened (`e5ceae7`, `2367e9e`); [answerability tests](../lib/ai/grounding/answerability/answerability-decider.test.ts). | Improved in HEAD; feature disabled |
| AI-027 | Numeric roles, units, formula symbols and method selection caused repeated false refusals or misleading calculations in development reviews. | Typed capability, requirement and calculation modules with tests were added across Stage 4.1 (representative commits `366003d`, `94784ca`, `4c9c469`). Later formula/discount corrections exist only on validation branches (`d099ffa`, `d655bef`, `2db6e42`). | Improved in HEAD; later fixes other branch; acceptance open |
| AI-028 | Disclosed suites repeatedly looked stronger than fresh synthetic holdouts. Previously accepted project reviews record failed/consumed holdouts through v8; the detailed reports are not all in this checkout and cannot be reused as fresh acceptance evidence. | The capability redesign, broader property tests and post-v8 remediation addressed classes of false refusals and unsafe acceptance. The current [Stage 4 guide](GROUNDED_CHAT_STAGE_4.md) records the gate. No fix is accepted merely because a disclosed suite passes. | Open: **DO_NOT_ENABLE** |
| AI-029 | A provider-free test pass did not establish answer quality, citation relevance or safe behavior against changed wording. | The evaluation harness includes separate runtime, adversarial and human-review paths under [evaluation](../lib/ai/grounding/evaluation/). The database-backed campaign and fresh acceptance gates remain incomplete for the current candidate. | Open validation gap |

## AI-assisted written marking

| ID | Observed problem | Correction and evidence | Status |
| --- | --- | --- | --- |
| AI-030 | A retried written-exam flow could charge or reserve AI marking credit twice. | Credit reservation was reused for the same attempt (`009291b`); [written-paper lifecycle tests](../app/api/v1/mock-exams/written-paper-lifecycle.e2e.test.ts). | Fixed in HEAD; live billing smoke test remains useful |
| AI-031 | Marking-review cases needed stronger linkage to the exact answer being disputed. | Case references and related tests were tightened (`40be323`); [review route tests](../app/api/v1/support/marking-reviews/[id]/route.test.ts). | Fixed in HEAD; current worktree has additional uncommitted review changes |
| AI-032 | Legacy AI-question and recommendation routes had uneven error handling and type safety. | Bounded validation and safe error handling were improved (`6045939`, `4b331de`, `c4c6890`); see [API reference](../app/api/v1/README.md). | Fixed in HEAD for covered routes |

## Remaining follow-up

1. Keep grounded chat disabled until the current candidate passes its required
   database-backed, adversarial, human-quality and fresh-holdout gates. Do not
   reinterpret a historical consumed holdout as a new pass.
2. Reconcile validation-branch-only changes before treating them as part of a
   release candidate. A clean test run on a different tree is not equivalence.
3. Preserve a separate private incident/evaluation record for case-level
   evidence, exact prompts, provider diagnostics and operational findings.
   This public register deliberately omits those details.
4. For each new AI defect, append a symptom, first observation, correcting
   commit, regression test, current-branch reachability and runtime status.
   Do not change a status to fixed solely from a passing unit test.
5. A verified recovery procedure for interrupted pending generations remains
   an operational follow-up; do not infer one from idempotency or retry tests.
