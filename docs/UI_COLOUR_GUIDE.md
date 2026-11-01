# Study Buddy UI colour guide

Last checked against the working tree: 1 November 2026.

This is an inventory of the current colours, not a proposal to recolour the
site. Names such as “brand plum” are descriptive labels for this guide, not
official CSS colour names. Hex values and source references are authoritative.
“Why” describes the visible UI role; it does not claim a documented psychological
effect or invent a historical design decision.

The main identity is **purple + white + dark text**, with lavender supporting
surfaces, navy secondary actions, and small gold/brown illustration accents.
Red, green and amber communicate feedback, not the main brand identity.

## Scope and source of truth

- Theme definitions: [globals.css](../app/globals.css); Tailwind mappings: [tailwind.config.js](../tailwind.config.js).
- Shared icon artwork: [StudyBuddyIcon](../components/StudyBuddyIcon.tsx); logos, avatars and illustrations: [public/images](../public/images).
- Page-specific colours: the component references below.
- Standard utility values: the installed Tailwind CSS palette, rather than assuming every class uses the custom theme.
- Code highlighting: the GitHub Dark stylesheet imported by [the root layout](../app/layout.tsx).

The inventory includes all fixed hex colours found in the scanned first-party
frontend/SVG sources, all custom CSS colour tokens, the standard Tailwind
colours explicitly referenced by those sources, and the fixed imported
syntax-highlight palette. It includes declared-but-unreferenced tokens and
legacy remnants, clearly labelled; source presence does not prove that a
component/variant is currently mounted.

Images supplied by learners, raster-image pixels, emoji, operating-system
controls, generated content and runtime library defaults can introduce other
colours. Transparency and gradients also create blended pixels rather than
a finite extra palette. These are not presented as new brand swatches.
No browser-wide computed-style or contrast certification was performed.

## 1. The colours you will notice most

| Colour name | Hex | Predominant location | Why it is used |
| --- | --- | --- | --- |
| Brand plum purple | `#6C3483` | SB mark, Study Buddy wordmark, active bottom-nav labels, dashboard actions and activity bars. | Recognisable brand identity and emphasis for important actions. |
| UI primary purple | `#6247AA` | Shared primary buttons, desktop active/hover navigation, learner chat bubbles. | Consistent interactive colour across reusable controls. |
| UI strong purple | `#5A3F9A` | Progress fills/trend, selected answer states, links and primary badges. | Stronger emphasis within the primary scale. |
| UI dark purple | `#4A3480` | Links, labels, callout text and selected-state copy. | Darker purple text and emphasis on pale surfaces. |
| Deep illustration purple | `#3B2A56` | Dashboard continuation panels, profile header, icons/illustration details. | A dark brand-related surface with light text; visual depth. |
| White | `#FFFFFF` | Page/card surfaces, navigation, footer, avatar/favicon backing, text on dark buttons. | A clear reading surface and separation from coloured actions. |
| Charcoal / near-black | `#171717`, `#111827`, `#030712` | Default foreground, body text and prominent headings. | Readable hierarchy without colouring every line purple. |
| Muted grey | `#4B5563`, `#6B7280` | Descriptions, timestamps, helper copy and footer links. | Secondary information is quieter than headings and actions. |
| Lavender / pale plum | `#E9E6ED`, `#F7F0FA`, `#E2CFEA` | Icon backing, dashboard tracks, highlights, selected cards and borders. | Connects supporting surfaces to the brand without a solid purple block. |
| Deep navy | `#102B3F` | Secondary buttons and progress mock-completion markers. | Distinguishes secondary actions/data from the purple primary series. |
| Illustration gold | `#F6CE46` | Details in the shared contextual icon artwork. | Small warm highlights; not the general warning colour or current chart marker colour. |
| Warm brown | `#895033` | Shared icon details and the home student illustration. | Human/object shading and warmth within the illustration style. |

### Important distinctions

- `#6C3483` is the approved SB/wordmark colour; `primary-500` is **`#6247AA`**, not the same colour.
- The large home SVGs also contain `#513D96`, `#4F387D`, `#683E99` and other purples. Their embedded artwork palette is not identical to either UI primary or brand plum.
- `primary-50` is a pale neutral `#F8F9FA`, despite belonging to the primary scale.
- The theme family called `accent` is mostly white/grey, **not gold**.
- Semantic token names and component variants do not always map to the same hex: for example, `success` is `#10B981`, but the success Button uses `green-600`, `#16A34A`.

## 2. Where the palette appears across the website

| Area | Main colour treatment | Purpose / source |
| --- | --- | --- |
| Home | White/grey reading surfaces; primary-purple CTAs; multi-purple SVGs with lavender, brown and small colourful details. | [Landing page](../app/ClientLanding.tsx) — visual identity and readable feature explanations. |
| Top and bottom navigation | White backing; grey inactive links; primary-500 on desktop; brand plum for active bottom-nav labels. | [NavBar](../components/NavBar.tsx) and [BottomNav](../components/BottomNav.tsx) — distinguish location and available actions. |
| Dashboard | Brand plum actions and activity; deep-purple continuation panels; pale-plum supporting cards. | [Dashboard](../app/dashboard/DashboardClient.tsx) — put continuation and next actions ahead of secondary information. |
| Materials and exams | White/near-white cards, grey text, purple links/selection; feedback colours for outcomes. | [Materials](../app/materials/MaterialsClient.tsx) and [Exam instance](../app/exams/ExamInstanceClient.tsx) — calm study surfaces with clear interactions. |
| Progress | Purple question-activity line/fill; navy mock dots; grey chart grid/labels; purple range and carousel selection. | [Progress](../app/progress/ProgressClient.tsx) — separate kinds of activity and highlight the selected view. |
| Chat | Purple learner bubbles, pale-grey assistant bubbles, amber/red exceptional states; dark code blocks. | [Messages](../components/ChatMessage.tsx) and [Markdown](../components/ChatMarkdown.tsx) — distinguish speaker, response state and formatted content. |
| Profile and settings | Deep-purple profile hero, white avatar backing, pale-plum settings surfaces; red account-management emphasis. | [Profile](../app/profile/page.tsx) and [Settings](../app/settings/SettingsClient.tsx) — personal identity, account organisation and consequential actions. |
| Recovery and deletion | Very pale purple-tinted page surface, white panels, red warning/action regions, amber caveats, green successful outcomes. | [Reset alert](../app/account-security/password-reset-alert/PasswordResetAlertClient.tsx) and [Account status](../components/AccountLifecycleStatus.tsx) — separate warning, pending and completed states. |
| Public information / footer | White/near-white surfaces, dark text, grey supporting copy, purple links and contextual illustrations. | [Policy layout](../components/PolicyDocumentPage.tsx) and [Footer](../components/Footer.tsx) — prioritise reading and navigation. |


## 3. Complete custom theme tokens

All 36 tokens below are defined in [globals.css](../app/globals.css) and exposed
by [Tailwind configuration](../tailwind.config.js). A token can be referenced
through a utility such as `bg-primary-500`, `text-primary-700`, or directly with
`var(--primary-600)`. A declared token is not automatically a predominant colour.

### Base

| Token | Hex | Descriptive name | Current use / role |
| --- | --- | --- | --- |
| `background` | `#FFFFFF` | White | Page/navigation base; shared light text on coloured controls. |
| `foreground` | `#171717` | Charcoal | Default document text and the shared heading foreground variant. |

### Primary scale

| Token | Hex | Descriptive name | Current use / role |
| --- | --- | --- | --- |
| `primary-50` | `#F8F9FA` | Cool off-white | Subtle card, selection and callout backing; keeps large areas light. |
| `primary-100` | `#E2CFEA` | Pale lilac | Ghost-button hover, callout/selected borders and pale highlights. |
| `primary-200` | `#C4A0D6` | Soft lavender | Selected-response borders, soft fills and rings; also the chat blockquote border. |
| `primary-300` | `#A06CD5` | Medium lavender | Focus/hover rings and selected-option borders. |
| `primary-400` | `#8B5BC7` | Bright muted purple | Shared primary-button hover and input/button focus treatment. |
| `primary-500` | `#6247AA` | UI primary purple | Default primary Button, outline-button border, navigation emphasis and learner chat bubble. |
| `primary-600` | `#5A3F9A` | Strong purple | Links, primary Badge/ProgressBar, progress chart line/fill and selections. |
| `primary-700` | `#4A3480` | Dark purple | Stronger links, headings and callout/selected-state copy. |
| `primary-800` | `#3A2966` | Deep violet | Deep emphasis in private learner screens and response controls. |
| `primary-900` | `#2A1E4D` | Midnight violet | Very dark purple copy in chat and review controls. |

### Secondary scale

| Token | Hex | Descriptive name | Current use / role |
| --- | --- | --- | --- |
| `secondary-50` | `#F8F9FA` | Cool off-white | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `secondary-100` | `#E8F0F5` | Pale blue-grey | Pale secondary informational/feature surfaces; some light-on-dark copy. |
| `secondary-200` | `#C7D9E3` | Light blue-grey | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `secondary-300` | `#9BB8C7` | Muted blue-grey | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `secondary-400` | `#6B95A8` | Slate blue | Secondary Button focus ring. |
| `secondary-500` | `#102B3F` | Deep navy | Secondary Button, secondary heading/caption variants and mock-result chart dots. |
| `secondary-600` | `#0E2536` | Dark navy | Secondary Button hover; optional shared-heading gradient endpoint. |
| `secondary-700` | `#0C1F2D` | Deeper navy | Secondary Badge/ProgressBar and secondary data/callout text. |
| `secondary-800` | `#0A1924` | Midnight blue | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `secondary-900` | `#08131B` | Ink navy | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |

### Neutral accent scale

| Token | Hex | Descriptive name | Current use / role |
| --- | --- | --- | --- |
| `accent-50` | `#FEFEFE` | Almost white | Near-white content/card surfaces across materials, policy and learning pages. |
| `accent-100` | `#FDFDFD` | Paper white | Desktop active-nav backing and featured materials/exam cards. |
| `accent-200` | `#FBFBFB` | Soft white | Very faint card borders/dividers, light backing and bell hover. |
| `accent-300` | `#F8F8F8` | Pale neutral | Subtle image-placeholder/exam borders. |
| `accent-400` | `#F5F5F5` | Light neutral | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `accent-500` | `#FFFFFF` | White | White shell/footer/card surfaces and optional light-text variants. |
| `accent-600` | `#F0F0F0` | Light grey | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `accent-700` | `#E5E5E5` | Soft grey | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `accent-800` | `#D0D0D0` | Medium-light grey | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |
| `accent-900` | `#B0B0B0` | Medium grey | Declared shade; no explicit frontend consumer found in this static scan. Reserved within the family, not a claimed active use. |

### Semantic tokens

| Token | Hex | Descriptive name | Current use / role |
| --- | --- | --- | --- |
| `success` | `#10B981` | Emerald | Semantic text variants in Small/AbstractHeading; success emphasis, not every green component. |
| `warning` | `#F59E0B` | Amber | Semantic text variants in Small/AbstractHeading; caution emphasis, not every yellow component. |
| `error` | `#EF4444` | Red | Semantic text variants in Small/AbstractHeading; error emphasis. |
| `info` | `#3B82F6` | Blue | Informational text variants and hover links on email/password-recovery screens. |

## 4. Standard Tailwind colours actually referenced

These are installed Tailwind defaults, not custom CSS variables. The list below
includes every explicitly referenced shade found by the source scan; unused
shades from the much larger Tailwind palette are intentionally not listed.
“Examples” links to source consumers; a shared component may expose an optional
variant rather than displaying it in every instance.

### Gray

The everyday reading palette: light shades create surfaces/borders; dark shades carry text. This is distinct from the custom neutral accent scale.

| Utility colour | Hex | Descriptive name | Use and examples |
| --- | --- | --- | --- |
| `gray-50` | `#F9FAFB` | Mist white | background/fill; [ChatMarkdown.tsx](../components/ChatMarkdown.tsx), [Table.tsx](../components/Table.tsx) |
| `gray-100` | `#F3F4F6` | Very light grey | text, background/fill, border; [ChatMarkdown.tsx](../components/ChatMarkdown.tsx), [ChatMessage.tsx](../components/ChatMessage.tsx) |
| `gray-200` | `#E5E7EB` | Light border grey | border, background/fill, divider; [MultiSelectOptionCard.tsx](../components/MultiSelectOptionCard.tsx), [ChatMarkdown.tsx](../components/ChatMarkdown.tsx) |
| `gray-300` | `#D1D5DB` | Medium-light grey | border, background/fill; [ChatMarkdown.tsx](../components/ChatMarkdown.tsx), [Button.tsx](../components/Button.tsx) |
| `gray-400` | `#9CA3AF` | Muted grey | border, focus ring, text; [MultiSelectOptionCard.tsx](../components/MultiSelectOptionCard.tsx), [Button.tsx](../components/Button.tsx) |
| `gray-500` | `#6B7280` | Slate grey | text, outline; [ChatMarkdown.tsx](../components/ChatMarkdown.tsx), [CaptchaChallenge.tsx](../components/CaptchaChallenge.tsx) |
| `gray-600` | `#4B5563` | Dark grey | text; [ChatMarkdown.tsx](../components/ChatMarkdown.tsx), [Small.tsx](../components/Small.tsx) |
| `gray-700` | `#374151` | Charcoal grey | text; [ChatMarkdown.tsx](../components/ChatMarkdown.tsx), [Table.tsx](../components/Table.tsx) |
| `gray-800` | `#1F2937` | Deep charcoal | text; [MultiSelectOptionCard.tsx](../components/MultiSelectOptionCard.tsx), [Small.tsx](../components/Small.tsx) |
| `gray-900` | `#111827` | Near-black blue-grey | text; [ChatMessage.tsx](../components/ChatMessage.tsx), [Button.tsx](../components/Button.tsx) |
| `gray-950` | `#030712` | Ink blue-black | text, background/fill; [AccountLifecycleStatus.tsx](../components/AccountLifecycleStatus.tsx), [ChatClient.tsx](../app/chat/ChatClient.tsx) |

### Red

Validation, failed actions/replies, incorrect-answer feedback and destructive account controls. Pale backing pairs with darker text; colour should accompany explanatory copy.

| Utility colour | Hex | Descriptive name | Use and examples |
| --- | --- | --- | --- |
| `red-50` | `#FEF2F2` | Blush white | background/fill; [ChatMessage.tsx](../components/ChatMessage.tsx), [SelectField.tsx](../components/SelectField.tsx) |
| `red-100` | `#FEE2E2` | Pale blush | border, background/fill, focus ring; [ChatMessage.tsx](../components/ChatMessage.tsx), [AccountDeletionConfirmationClient.tsx](../app/account-deletion/confirm/AccountDeletionConfirmationClient.tsx) |
| `red-200` | `#FECACA` | Light rose | background/fill, border, focus ring; [ChatMessage.tsx](../components/ChatMessage.tsx), [AccountLifecycleStatus.tsx](../components/AccountLifecycleStatus.tsx) |
| `red-300` | `#FCA5A5` | Soft red | border; [TopicPracticeClient.tsx](../app/materials/practice/[topicId]/TopicPracticeClient.tsx), [AccountDeletionConfirmationClient.tsx](../app/account-deletion/confirm/AccountDeletionConfirmationClient.tsx) |
| `red-400` | `#F87171` | Coral red | focus ring, border; [Button.tsx](../components/Button.tsx), [ProfileDetailsClient.tsx](../app/settings/profile/ProfileDetailsClient.tsx) |
| `red-500` | `#EF4444` | Clear red | text, border, background/fill, outline; [SelectField.tsx](../components/SelectField.tsx), [Badge.tsx](../components/Badge.tsx) |
| `red-600` | `#DC2626` | Strong red | background/fill, text; [Button.tsx](../components/Button.tsx), [Paragraph.tsx](../components/Paragraph.tsx) |
| `red-700` | `#B91C1C` | Dark red | background/fill, text; [Button.tsx](../components/Button.tsx), [FormErrorMessage.tsx](../components/FormErrorMessage.tsx) |
| `red-800` | `#991B1B` | Deep red | text; [ChatMessage.tsx](../components/ChatMessage.tsx), [ClientLanding.tsx](../app/ClientLanding.tsx) |
| `red-900` | `#7F1D1D` | Wine red | text; [ChatMessage.tsx](../components/ChatMessage.tsx), [AccountDeletionConfirmationClient.tsx](../app/account-deletion/confirm/AccountDeletionConfirmationClient.tsx) |
| `red-950` | `#450A0A` | Blackened red | text; [AccountLifecycleStatus.tsx](../components/AccountLifecycleStatus.tsx), [AccountDeletionConfirmationClient.tsx](../app/account-deletion/confirm/AccountDeletionConfirmationClient.tsx) |

### Green

Successful saves/account outcomes, correct-answer feedback and resolved review states. Shared success Button and Badge variants use this family rather than the semantic emerald token.

| Utility colour | Hex | Descriptive name | Use and examples |
| --- | --- | --- | --- |
| `green-50` | `#F0FDF4` | Mint white | background/fill; [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx), [TopicPracticeClient.tsx](../app/materials/practice/[topicId]/TopicPracticeClient.tsx) |
| `green-100` | `#DCFCE7` | Pale mint | background/fill; [MarkingReviewsClient.tsx](../app/marking-reviews/MarkingReviewsClient.tsx), [MarkingReviewPanel.tsx](../app/exams/MarkingReviewPanel.tsx) |
| `green-200` | `#BBF7D0` | Light green | border; [AccountSettingsClient.tsx](../app/settings/account/AccountSettingsClient.tsx), [ProfileDetailsClient.tsx](../app/settings/profile/ProfileDetailsClient.tsx) |
| `green-400` | `#4ADE80` | Fresh green | focus ring; [Button.tsx](../components/Button.tsx) |
| `green-500` | `#22C55E` | Bright green | background/fill; [Badge.tsx](../components/Badge.tsx), [ProgressBar.tsx](../components/ProgressBar.tsx) |
| `green-600` | `#16A34A` | Strong green | background/fill, text; [Button.tsx](../components/Button.tsx), [Paragraph.tsx](../components/Paragraph.tsx) |
| `green-700` | `#15803D` | Dark green | background/fill, text; [Button.tsx](../components/Button.tsx), [GuardianPendingClient.tsx](../app/guardian-authorization-pending/GuardianPendingClient.tsx) |
| `green-800` | `#166534` | Forest green | text; [AccountSettingsClient.tsx](../app/settings/account/AccountSettingsClient.tsx), [ProfileDetailsClient.tsx](../app/settings/profile/ProfileDetailsClient.tsx) |
| `green-900` | `#14532D` | Deep forest green | text; [MarkingReviewsClient.tsx](../app/marking-reviews/MarkingReviewsClient.tsx), [MarkingReviewPanel.tsx](../app/exams/MarkingReviewPanel.tsx) |
| `green-950` | `#052E16` | Blackened green | text; [PasswordResetRecoveryClient.tsx](../app/account-security/password-reset-recovery/PasswordResetRecoveryClient.tsx), [PasswordResetAlertClient.tsx](../app/account-security/password-reset-alert/PasswordResetAlertClient.tsx) |

### Amber

Pending marking reviews, caution, limited/uncertain chat responses and incomplete account/email outcomes. It signals attention without treating every state as a failure.

| Utility colour | Hex | Descriptive name | Use and examples |
| --- | --- | --- | --- |
| `amber-50` | `#FFFBEB` | Cream | background/fill; [ReadNotificationOnOpen.tsx](../components/ReadNotificationOnOpen.tsx), [ChatMessage.tsx](../components/ChatMessage.tsx) |
| `amber-100` | `#FEF3C7` | Pale amber | border, background/fill; [ChatMessage.tsx](../components/ChatMessage.tsx), [MarkingReviewsClient.tsx](../app/marking-reviews/MarkingReviewsClient.tsx) |
| `amber-200` | `#FDE68A` | Light amber | border; [page.tsx](../app/terms-of-service/page.tsx) |
| `amber-300` | `#FCD34D` | Golden amber | border; [AccountLifecycleStatus.tsx](../components/AccountLifecycleStatus.tsx), [AccountDeletionConfirmationClient.tsx](../app/account-deletion/confirm/AccountDeletionConfirmationClient.tsx) |
| `amber-700` | `#B45309` | Burnt amber | text; [page.tsx](../app/terms-of-service/page.tsx) |
| `amber-800` | `#92400E` | Dark amber | text; [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) |
| `amber-900` | `#78350F` | Brown amber | text; [ChatClient.tsx](../app/chat/ChatClient.tsx), [MarkingReviewsClient.tsx](../app/marking-reviews/MarkingReviewsClient.tsx) |
| `amber-950` | `#451A03` | Blackened amber | text; [ReadNotificationOnOpen.tsx](../components/ReadNotificationOnOpen.tsx), [ChatMessage.tsx](../components/ChatMessage.tsx) |

### Yellow

Study-preference warnings plus shared warning Badge, ProgressBar and Paragraph variants. These are not the icon-artwork gold.

| Utility colour | Hex | Descriptive name | Use and examples |
| --- | --- | --- | --- |
| `yellow-50` | `#FEFCE8` | Lemon white | background/fill; [StudyPreferencesClient.tsx](../app/settings/study-preferences/StudyPreferencesClient.tsx) |
| `yellow-200` | `#FEF08A` | Pale yellow | border; [StudyPreferencesClient.tsx](../app/settings/study-preferences/StudyPreferencesClient.tsx) |
| `yellow-500` | `#EAB308` | Golden yellow | background/fill; [Badge.tsx](../components/Badge.tsx), [ProgressBar.tsx](../components/ProgressBar.tsx) |
| `yellow-600` | `#CA8A04` | Ochre | text; [Paragraph.tsx](../components/Paragraph.tsx) |
| `yellow-800` | `#854D0E` | Deep ochre | text; [StudyPreferencesClient.tsx](../app/settings/study-preferences/StudyPreferencesClient.tsx) |

### Blue

The standard blue text variant in Paragraph; the separate semantic info token uses a lighter blue.

| Utility colour | Hex | Descriptive name | Use and examples |
| --- | --- | --- | --- |
| `blue-600` | `#2563EB` | Strong blue | text; [Paragraph.tsx](../components/Paragraph.tsx) |

### White, black and non-colour keywords

| Value | Hex / behaviour | Where and why |
| --- | --- | --- |
| White | `#FFFFFF` | Most surfaces; light button/profile text; avatar/favicon backing. Same hex as background and accent-500. |
| Black | `#000000` | Used mainly with opacity for inline-code/keyboard-key backing and overlay treatment, not as a new brand colour. |
| transparent | No opaque swatch | Ghost controls, code-block resets and artwork with no fill. |
| currentColor / current | Inherits the current text colour | Eye/unfold SVGs, outlined badges and monochrome controls follow their surrounding UI. |
| inherit | Inherits the parent value | Outlined/shared typography variants keep context-appropriate text colour. |


## 5. Additional hard-coded UI colours

These are outside the named theme scale, although some repeat its visual
families. They explain why changing only primary-500 would not recolour the
whole website.

| Colour / name | Main location | Why / current role |
| --- | --- | --- |
| `#6C3483` — brand plum | [LogoName.tsx](../components/LogoName.tsx); [BottomNav.tsx](../components/BottomNav.tsx); [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Identity, active mobile labels, dashboard actions and activity. |
| `#3B2A56` — deep plum | [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx); [page.tsx](../app/profile/page.tsx) | Dark continuation/profile headers and illustration depth. |
| `#E9E6ED` — grey lavender | [StudyBuddyIcon.tsx](../components/StudyBuddyIcon.tsx); [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Illustration backing and unfilled dashboard progress tracks. |
| `#F7F0FA` — pale plum | [SettingsClient.tsx](../app/settings/SettingsClient.tsx); [ChatMarkdown.tsx](../components/ChatMarkdown.tsx) | Settings panels, dashboard highlights, button hover and chat table headers. |
| `#FCF9FD` — plum-tinted white | [page.tsx](../app/profile/page.tsx); [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Very subtle hover backing for linked cards. |
| `#FAF8FB` — lavender-tinted white | [AccountLifecycleStatus.tsx](../components/AccountLifecycleStatus.tsx); [PasswordResetAlertClient.tsx](../app/account-security/password-reset-alert/PasswordResetAlertClient.tsx) | Quiet page backing around high-priority account/security messages. |
| `#57296A` — dark brand plum | [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Hover state for solid brand-plum dashboard actions. |
| `#C7A6D5` — muted lilac | [ProfileDetailsClient.tsx](../app/settings/profile/ProfileDetailsClient.tsx); [page.tsx](../app/profile/page.tsx) | Hover/focus borders on profile, settings and dashboard controls. |
| `#E4D6EA` — pale lilac border | [SettingsClient.tsx](../app/settings/SettingsClient.tsx); [ProfileDetailsClient.tsx](../app/settings/profile/ProfileDetailsClient.tsx) | Borders around pale settings headers and profile-edit surfaces. |
| `#E9D8F0` — soft lilac | [page.tsx](../app/profile/page.tsx); [ProfileDetailsClient.tsx](../app/settings/profile/ProfileDetailsClient.tsx) | Supporting profile-header text and profile-edit focus rings. |
| `#F1E8F5` — light plum text | [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Supporting text on deep-purple continuation panels. |
| `#D7BFE2` — medium pale lilac | [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Border for the lower pale-plum dashboard callout. |
| `#FCFCFC` — paper white | [StudyBuddyIcon.tsx](../components/StudyBuddyIcon.tsx); [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Icon paper/book details and a nearly white dashboard card surface. |
| `#070405` — warm black ink | [StudyBuddyIcon.tsx](../components/StudyBuddyIcon.tsx) | Consistent outlines that make contextual illustrations legible. |
| `#895033` — warm brown | [StudyBuddyIcon.tsx](../components/StudyBuddyIcon.tsx) | Book/object/character details matching the main illustration style. |
| `#F6CE46` — warm gold | [StudyBuddyIcon.tsx](../components/StudyBuddyIcon.tsx) | Small accent details within icon artwork. |
| `#17131C` — plum-black | [ChatMarkdown.tsx](../components/ChatMarkdown.tsx) | Outer code-block surface, separate from the imported highlighting theme. |
| `#B42318` — brick red | [ChatMarkdown.tsx](../components/ChatMarkdown.tsx) | Configured maths-error colour for malformed expressions. |
| `#9CA3AF` — muted grey | [BottomNav.tsx](../components/BottomNav.tsx) | Inactive bottom-navigation labels; same value as gray-400. |
| `#E5E7EB`, `#D1D5DB`, `#6B7280` — chart greys | [ProgressClient.tsx](../app/progress/ProgressClient.tsx) | Chart grid, hover cursor and axis labels respectively; same values as gray-200/300/500. |


### Practice celebration colours

[TopicPracticeClient](../app/materials/practice/[topicId]/TopicPracticeClient.tsx)
cycles through these for small confetti pieces. Their purpose is celebration
and visual variety, not additional navigation or grading semantics.

| Hex | Descriptive name |
| --- | --- |
| `#6C3483` | Brand plum |
| `#2E86AB` | Ocean blue |
| `#F4D35E` | Soft gold |
| `#EE964B` | Warm orange |
| `#4CAF50` | Leaf green |
| `#E84855` | Coral red |


### Flashcard collection accents

| Collection | Base hex / name | Actual backing | Why |
| --- | --- | --- | --- |
| Community FlashCards | `#5EEAD4` — mint teal | `#5EEAD42E` | A light tinted icon container distinguishes the collection. |
| Standard FlashCards | `#38BDF8` — sky blue | `#38BDF82E` | A second light tint distinguishes the reviewed collection. |


The [flashcards client](../app/materials/flashcards/FlashcardsClient.tsx) appends
the alpha byte 2E (about 18% opacity). The rendered backing is translucent,
not a solid teal or blue card.

## 6. SVG illustration and avatar palette

These fixed colours are embedded in the assets themselves, so changing a
Tailwind token will not automatically change them. They predominantly create
purple clothing/books, pale backing/paper, brown figure/object shading and dark
outlines. Small green/red/blue/yellow details belong to the drawing, not the
website's success/error state system.

Asset locations:

| Asset | Predominant screen usage |
| --- | --- |
| [Home student illustration](../public/images/study-buddy-students.svg) | Home hero. |
| [Study plan](../public/images/study-plan.svg) | Home personalised-study feature. |
| [Practice tests](../public/images/practice-tests.svg) | Home practice-test feature. |
| [Expert guidance](../public/images/expert-guidance.svg) | Home guidance feature. |
| [AI avatar](../public/images/ai-tutor-avatar.svg) | Chat assistant and About AI-support illustration. |
| [Profile avatar](../public/images/profile-avatar.svg) | Navigation, profile/edit-profile fallback and learner chat avatar. |
| [SB mark](../public/images/study-buddy-mark.svg) | Small brand artwork, loaders/masks and About branding. |
| [Logo icon](../public/logo-icon.svg) / [favicon](../app/favicon.svg) | Browser/site identity on rounded white backing. |

| Hex | Descriptive name | Assets containing it |
| --- | --- | --- |
| `#030205` | Purple-black | [Practice tests](../public/images/practice-tests.svg) |
| `#030208` | Ink violet-black | [Study plan](../public/images/study-plan.svg) |
| `#040204` | Soft black ink | [Profile avatar](../public/images/profile-avatar.svg) |
| `#04B969` | Emerald green | [Study plan](../public/images/study-plan.svg) |
| `#070405` | Warm black ink | [AI avatar](../public/images/ai-tutor-avatar.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#076FDF` | Bright blue | [Expert guidance](../public/images/expert-guidance.svg) |
| `#0C0528` | Midnight violet | [Practice tests](../public/images/practice-tests.svg) |
| `#0E0D0C` | Warm charcoal | [Expert guidance](../public/images/expert-guidance.svg) |
| `#18101D` | Plum-black | [Study plan](../public/images/study-plan.svg) |
| `#201916` | Dark bark brown | [Profile avatar](../public/images/profile-avatar.svg) |
| `#221C1A` | Dark cocoa | [Practice tests](../public/images/practice-tests.svg) |
| `#22BC87` | Jade green | [Practice tests](../public/images/practice-tests.svg) |
| `#251B1A` | Dark espresso | [Expert guidance](../public/images/expert-guidance.svg) |
| `#281D18` | Espresso brown | [AI avatar](../public/images/ai-tutor-avatar.svg) |
| `#28B72D` | Bright leaf green | [Expert guidance](../public/images/expert-guidance.svg) |
| `#2B1F1B` | Dark warm cocoa | [Home hero](../public/images/study-buddy-students.svg) |
| `#3B2A56` | Deep plum | [Practice tests](../public/images/practice-tests.svg), [Study plan](../public/images/study-plan.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#3F2A6B` | Deep violet | [Profile avatar](../public/images/profile-avatar.svg) |
| `#4E3597` | Indigo violet | [Profile avatar](../public/images/profile-avatar.svg) |
| `#4F387D` | Deep illustration violet | [Expert guidance](../public/images/expert-guidance.svg), [Practice tests](../public/images/practice-tests.svg), [Study plan](../public/images/study-plan.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#503699` | Blue violet | [Profile avatar](../public/images/profile-avatar.svg) |
| `#513D96` | Illustration violet | [Expert guidance](../public/images/expert-guidance.svg), [Practice tests](../public/images/practice-tests.svg), [Study plan](../public/images/study-plan.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#54318D` | Rich violet | [Profile avatar](../public/images/profile-avatar.svg) |
| `#5B3295` | Profile violet | [Profile avatar](../public/images/profile-avatar.svg) |
| `#5C301C` | Dark reddish brown | [Study plan](../public/images/study-plan.svg) |
| `#5E3194` | Tutor violet | [AI avatar](../public/images/ai-tutor-avatar.svg) |
| `#60331A` | Dark chestnut | [Profile avatar](../public/images/profile-avatar.svg) |
| `#633894` | Study violet | [Study plan](../public/images/study-plan.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#653B22` | Dark warm brown | [AI avatar](../public/images/ai-tutor-avatar.svg) |
| `#683E99` | Medium illustration purple | [Practice tests](../public/images/practice-tests.svg), [Study plan](../public/images/study-plan.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#6C3483` | Brand plum | [Logo icon](../public/logo-icon.svg), [SB mark](../public/images/study-buddy-mark.svg), [Favicon](../app/favicon.svg) |
| `#7C3D1E` | Rust brown | [Study plan](../public/images/study-plan.svg) |
| `#895033` | Warm brown | [Home hero](../public/images/study-buddy-students.svg) |
| `#914E2B` | Chestnut brown | [AI avatar](../public/images/ai-tutor-avatar.svg) |
| `#964F2B` | Warm sienna | [Profile avatar](../public/images/profile-avatar.svg) |
| `#9B512C` | Sienna brown | [Profile avatar](../public/images/profile-avatar.svg) |
| `#9E92B0` | Muted mauve | [Expert guidance](../public/images/expert-guidance.svg), [Study plan](../public/images/study-plan.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#A0491E` | Burnt sienna | [Study plan](../public/images/study-plan.svg) |
| `#A4552B` | Terracotta brown | [Practice tests](../public/images/practice-tests.svg) |
| `#AE571F` | Copper brown | [Expert guidance](../public/images/expert-guidance.svg) |
| `#E9E6ED` | Grey lavender | [Expert guidance](../public/images/expert-guidance.svg), [Practice tests](../public/images/practice-tests.svg), [Study plan](../public/images/study-plan.svg), [Home hero](../public/images/study-buddy-students.svg) |
| `#EE2432` | Bright red | [Expert guidance](../public/images/expert-guidance.svg) |
| `#F8F7FA` | Lavender white | [Profile avatar](../public/images/profile-avatar.svg) |
| `#F9F7F6` | Warm paper white | [Expert guidance](../public/images/expert-guidance.svg) |
| `#FB797C` | Soft coral pink | [Study plan](../public/images/study-plan.svg) |
| `#FCB313` | Golden yellow | [Expert guidance](../public/images/expert-guidance.svg) |
| `#FCFCFC` | Paper white | [Home hero](../public/images/study-buddy-students.svg) |
| `#FDFCFC` | Warm near-white | [AI avatar](../public/images/ai-tutor-avatar.svg) |
| `#FDFDFD` | Paper white | [Practice tests](../public/images/practice-tests.svg), [Study plan](../public/images/study-plan.svg) |
| `#FFFFFF` | White | [Logo icon](../public/logo-icon.svg), [Profile avatar](../public/images/profile-avatar.svg), [Favicon](../app/favicon.svg) |

The common purples are shading variants, not separate user-interface states.
The shared icons intentionally use a simpler palette: ink `#070405`, plum
`#6C3483`, deep plum `#3B2A56`, lavender `#E9E6ED`, brown `#895033`, gold
`#F6CE46` and paper `#FCFCFC`.

The small eye/unfold icons in [public/icons](../public/icons) use currentColor,
not a fixed embedded hex; they are covered by the inheritance rules above.

## 7. Imported code-highlighting colours

The app imports highlight.js's GitHub Dark stylesheet. These colours are
restricted to syntax presentation in AI code samples, not a site-wide dark
theme. Exact visibility depends on the generated syntax classes and CSS
overrides in [ChatMarkdown](../components/ChatMarkdown.tsx).

| Hex | Descriptive name | Token / purpose |
| --- | --- | --- |
| `#0D1117` | Code black | Imported .hljs background. |
| `#C9D1D9` | Light code grey | Default highlighted text and substitutions. |
| `#FF7B72` | Salmon | Keywords, types and template constructs. |
| `#D2A8FF` | Light violet | Function/class titles. |
| `#79C0FF` | Sky blue | Numbers, attributes, literals, variables and operators. |
| `#A5D6FF` | Pale blue | Strings and regular expressions. |
| `#FFA657` | Apricot | Built-ins and symbols. |
| `#8B949E` | Muted steel grey | Comments and formula/code tokens. |
| `#7EE787` | Mint green | Tag names, quotes and selectors. |
| `#1F6FEB` | Strong blue | Section headings in highlighted content. |
| `#F2CC60` | Soft yellow gold | List bullets in highlighted content. |
| `#AFF5B4` | Pale green | Added lines in highlighted diffs. |
| `#033A16` | Deep green | Added-line backing. |
| `#FFDCD7` | Pale salmon | Deleted lines in highlighted diffs. |
| `#67060C` | Deep red | Deleted-line backing. |


The outer code container is separately `#17131C`; ordinary code text can also
inherit the component's gray-100. KaTeX and Streamdown's imported styles do not
add fixed hex literals in the installed CSS files scanned here; they can inherit
colours or use runtime/library variables.

## 8. Opacity, gradients and shadows

These are treatments of existing colours, not additional opaque brand colours.

- Progress area fill: primary-600 `#5A3F9A`, fading from 32% to 3% opacity; its active point has a white outline.
- Profile/dark-panel details use translucent white borders/backing. Chat's copy-code button also uses white at 10%/20%.
- Inline-code/keycap backing uses black at low opacity, such as 5%; keycap borders use 15%.
- Account/recovery panel shadow: `rgba(42,30,77,0.10)`, equivalent to primary-900 `#2A1E4D` at 10% alpha.
- Shared Button disabled/loading styling applies opacity to the whole control. It does not define a separate disabled brand hex.
- Shared heading effects can blend primary purple with secondary navy. Optional variants are not necessarily used on every page.
- Flashcard backing uses the explicit 8-digit hex values documented above.
- Standard Tailwind shadow/ring utilities also add translucent effects; their final pixels depend on the underlying surface and stacking.

## 9. Legacy / non-predominant colour remnants

These declarations remain in [globals.css](../app/globals.css), but no current
frontend use of their legacy selectors was found in this scan. Do not treat them
as part of the approved SB identity.

| Colour | Selector / reason it remains in the inventory |
| --- | --- |
| `#646CFFAA` — translucent periwinkle | Legacy .logo hover glow; RGB #646CFF with approximately 67% opacity. |
| `#61DAFBAA` — translucent cyan | Legacy .logo.react hover glow; RGB #61DAFB with approximately 67% opacity. |
| `#888888` — medium grey | Legacy .read-the-docs text. Stored in source as shorthand #888. |


The white ripple colour is stored as `#fff`, equivalent to `#FFFFFF`; it is
not another swatch. Old cube components and preview-only exports also remain
in source. Their palette references are not evidence of current navigation use.

## 10. Notable inconsistencies and maintenance notes

1. **Three purple layers coexist:** brand plum, UI primary scale and the
   detailed SVG palette. This document records them; it does not authorise
   consolidating or recolouring the approved designs.
2. **The progress chart's mock markers are navy, not gold.** The current fill
   and legend use secondary-500 `#102B3F`, although nearby explanatory copy says
   “Gold markers”. This is a copy/style mismatch in
   [ProgressClient](../app/progress/ProgressClient.tsx), not a reason to label
   the actual colour gold here.
3. **Semantic variants are not one-to-one tokens.** A success Button, success
   Badge, Paragraph and Small can resolve to different greens. Read their
   component mappings rather than assuming “success” always means `#10B981`.
4. **Near-whites overlap.** Background, accent-500 and literal white share
   `#FFFFFF`, while #FCFCFC/#FDFDFD/#FEFEFE are intentionally very close.
   Presence in code does not establish a perceptible difference on every display.
5. **Contrast depends on pairs and states.** A colour's inclusion is not an
   accessibility endorsement for arbitrary text/background combinations.
   Check the real size, background, opacity, hover/focus and disabled state.
   Retain text/icons as well as colour to communicate status.
6. **Keep this guide current.** Update it when tokens, hard-coded page colours,
   SVG fills or imported highlighting styles change. Follow the
   [frontend review checklist](DMCTN_UI_TASTE_GATE.md); document the result
   without changing unrelated artwork, dependencies or live configuration.

This was a documentation-only inventory. No UI colours were changed.
