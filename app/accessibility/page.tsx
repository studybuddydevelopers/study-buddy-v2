import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import { SUPPORT_EMAIL } from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "26 November 2026";

export const metadata = createPageMetadata({
  title: "Accessibility Statement",
  description:
    "Read Study Buddy's accessibility commitments, known limitations, supported features and ways to request an accessible alternative or report a problem.",
  path: "/accessibility",
});

const sections: PolicyDocumentSection[] = [
  {
    id: "commitment",
    title: "Our commitment",
    content: (
      <p>
        Study Buddy wants students and families to use the service regardless
        of disability, device, connection quality, or assistive technology. We
        are working toward{" "}
        <a href="https://www.w3.org/TR/WCAG22/">WCAG 2.2 Level AA</a>.
        Independent conformance testing is pending.
      </p>
    ),
  },
  {
    id: "current-support",
    title: "Accessibility considered in the product",
    content: (
      <ul>
        <li>Page headings, labelled fields and form error messages</li>
        <li>Keyboard navigation and visible focus in core controls</li>
        <li>Form labels that identify the question in written practice</li>
        <li>Responsive layouts for smaller screens</li>
        <li>Text summaries of daily learning activity</li>
        <li>Low-data controls for selected images on slower connections</li>
      </ul>
    ),
  },
  {
    id: "limitations",
    title: "Known areas requiring further testing",
    content: (
      <>
        <p>
          Further testing is planned for the following parts of the service.
        </p>
        <ul>
          <li>Chat announcements and navigation through long conversations</li>
          <li>Timed mock exams and written marking reviews</li>
          <li>Bot checks and account recovery</li>
          <li>Text alternatives for practice diagrams and progress charts</li>
          <li>Zoom, reflow and reduced motion on different devices</li>
          <li>Screen-reader and keyboard operation across signed-in routes</li>
        </ul>
      </>
    ),
  },
  {
    id: "help",
    title: "Requesting an accessible alternative",
    content: (
      <p>
        If content or a feature is difficult to use, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Tell us the page
        or feature, what happened, the device or assistive technology used if you
        are comfortable sharing it, and the format or adjustment that would help.
        We will consider a reasonable accessible alternative while the issue is
        investigated.
      </p>
    ),
  },
  {
    id: "feedback",
    title: "Reporting an accessibility problem",
    content: (
      <p>
        Use the subject “Accessibility feedback” and avoid including unnecessary
        medical information. We will acknowledge the report, assess its impact,
        prioritise barriers that prevent access to core learning or account
        functions, and communicate the outcome or planned next step.
      </p>
    ),
  },
  {
    id: "review",
    title: "Reviewing this statement",
    content: (
      <p>
        We review this statement after material interface changes. After a
        formal audit, we will update it with the areas tested, the methods
        used, and any remaining barriers.
      </p>
    ),
  },
];

export default function AccessibilityPage() {
  return (
    <PolicyDocumentPage
      title="Accessibility Statement"
      eyebrow="Learning without barriers"
      introduction="This statement explains Study Buddy's accessibility aim, what the product already considers, where further testing is needed, and how to request help."
      icon="support"
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
