import Link from "next/link";
import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import { SUPPORT_EMAIL } from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "8 September 2026";

export const metadata = createPageMetadata({
  title: "Content and Copyright Policy",
  description:
    "Learn how Study Buddy owns, licenses, reviews and corrects learning content, and how to report academic errors or copyright concerns.",
  path: "/content-policy",
});

const sections: PolicyDocumentSection[] = [
  {
    id: "scope",
    title: "Scope",
    content: (
      <p>
        This policy covers questions, explanations, mock exams, flashcards,
        textbooks, files, illustrations, AI messages, and other material made
        available through Study Buddy. It supplements our{" "}
        <Link href="/terms-of-service">Terms of Service</Link>.
      </p>
    ),
  },
  {
    id: "ownership",
    title: "Ownership and licences",
    content: (
      <p>
        Study Buddy and its licensors retain their rights in the service,
        software, branding, original explanations, illustrations, and learning
        materials. Third-party material remains owned by its respective owner.
        Nothing on the service transfers ownership to a user unless expressly
        stated in writing.
      </p>
    ),
  },
  {
    id: "permitted-use",
    title: "Permitted learning use",
    content: (
      <>
        <p>
          A user may access available content for personal, non-commercial study
          and revision. An authorised teacher or school may use content for the
          educational purpose permitted by its Study Buddy agreement.
        </p>
        <p>
          Unless the owner or law permits it, users may not republish, sell,
          scrape, systematically download, remove ownership notices from, create
          a competing database from, or distribute substantial parts of the
          content.
        </p>
      </>
    ),
  },
  {
    id: "user-content",
    title: "Material submitted by users",
    content: (
      <>
        <p>
          Users keep rights they hold in their own messages, answers, feedback,
          and uploads. By submitting material, a user gives Study Buddy the
          limited licence described in the Terms of Service to process it for the
          service.
        </p>
        <p>
          Do not submit material you do not have permission to use, including
          leaked examinations, paid textbooks, confidential school documents,
          personal information about another person, or content copied in a way
          that infringes copyright.
        </p>
      </>
    ),
  },
  {
    id: "exam-bodies",
    title: "Examination-body references",
    content: (
      <p>
        References to WAEC or another examination body identify the curriculum,
        examination style, source, or learning context. They do not by themselves
        mean that Study Buddy is sponsored, approved, licensed, or endorsed by
        that body. Any official relationship must be expressly identified.
      </p>
    ),
  },
  {
    id: "accuracy",
    title: "Reporting an academic error",
    content: (
      <p>
        To report an incorrect answer, explanation, mark scheme, topic mapping,
        or source label, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
        with the subject, topic, page, question identifier, and a short
        explanation. We will review credible reports and may correct, qualify, or
        remove content while it is checked.
      </p>
    ),
  },
  {
    id: "copyright-report",
    title: "Reporting copyright or rights concerns",
    content: (
      <>
        <p>
          A rights holder or authorised representative may email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with:
        </p>
        <ul>
          <li>their name, organisation, and contact details;</li>
          <li>identification of the protected work or other right;</li>
          <li>the Study Buddy location of the material concerned;</li>
          <li>the basis for believing the use is unauthorised;</li>
          <li>evidence of ownership or authority to act; and</li>
          <li>a statement that the report is accurate and made in good faith.</li>
        </ul>
        <p>
          Do not include identity documents unless we specifically request a
          proportionate form of verification.
        </p>
      </>
    ),
  },
  {
    id: "review-process",
    title: "How reports are handled",
    content: (
      <p>
        We may temporarily restrict disputed content while investigating, ask the
        uploader or source for evidence, correct attribution, remove material, or
        restore it if the report is unsupported. Repeated deliberate infringement
        may lead to account restrictions. We may preserve records needed to
        resolve the dispute or comply with law.
      </p>
    ),
  },
];

export default function ContentPolicyPage() {
  return (
    <PolicyDocumentPage
      title="Content and Copyright Policy"
      eyebrow="Responsible learning content"
      introduction="This policy explains how Study Buddy learning materials may be used and how to report an academic error, ownership concern, or unauthorised copy."
      icon="document"
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
