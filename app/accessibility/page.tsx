import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import { SUPPORT_EMAIL } from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "8 September 2026";

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
        Study Buddy wants students, parents, teachers, and school staff to use the
        service regardless of disability, device, connection quality, or assistive
        technology. We are working toward the Web Content Accessibility
        Guidelines (WCAG) 2.2 Level AA. This is an aim, not a claim that every
        page currently conforms.
      </p>
    ),
  },
  {
    id: "current-support",
    title: "Accessibility considered in the product",
    content: (
      <ul>
        <li>semantic headings, labels, links, buttons, and form messages;</li>
        <li>keyboard-accessible navigation and controls where implemented;</li>
        <li>visible focus treatment and readable colour contrast;</li>
        <li>responsive layouts for mobile and enlarged text;</li>
        <li>text alternatives or decorative treatment for meaningful imagery;</li>
        <li>plain-language instructions and error feedback; and</li>
        <li>low-data controls for slower or more expensive connections.</li>
      </ul>
    ),
  },
  {
    id: "limitations",
    title: "Known areas requiring further testing",
    content: (
      <>
        <p>
          We have not yet completed an independent WCAG 2.2 AA audit. The
          following areas require particular testing and remediation before we
          can make a formal conformance claim:
        </p>
        <ul>
          <li>dynamic AI-chat announcements and long conversation navigation;</li>
          <li>timed mock-exam controls and status updates;</li>
          <li>CAPTCHA and account-recovery experiences;</li>
          <li>charts, progress explanations, and complex learning graphics;</li>
          <li>uploaded PDFs, textbooks, and third-party learning resources;</li>
          <li>zoom, reflow, reduced-motion, and screen-reader behaviour; and</li>
          <li>keyboard operation across every authenticated workflow.</li>
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
        This statement will be reviewed after material interface changes and
        after each formal accessibility audit. The conformance target, tested
        pages, testing methods, unresolved failures, and review date should be
        updated once an independent audit has been completed.
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
