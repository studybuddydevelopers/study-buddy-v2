import Link from "next/link";
import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "5 September 2026";
const CONTACT_EMAIL = "sbstudybuddy0@gmail.com";

export const metadata = createPageMetadata({
  title: "Parent and Student Privacy Notice",
  description:
    "A plain-language guide for students, parents and schools explaining what learner data Study Buddy uses, how AI chats work and what choices families have.",
  path: "/parent-student-privacy",
});

const sections: PolicyDocumentSection[] = [
  {
    id: "purpose",
    title: "What this notice is for",
    content: (
      <>
        <p>
          This is a shorter, student-friendly explanation of our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>. The full policy
          controls if the two documents differ.
        </p>
        <p>
          Students should read this notice with a parent, guardian, teacher, or
          another trusted adult. Ask us if any part is unclear.
        </p>
      </>
    ),
  },
  {
    id: "information",
    title: "What we know about a student",
    content: (
      <>
        <p>Study Buddy may keep:</p>
        <ul>
          <li>name, email address, phone number, and account details;</li>
          <li>grade, exam year, preferred subjects, and profile image;</li>
          <li>questions, answers, drafts, scores, progress, and study activity;</li>
          <li>messages sent to the Study Buddy AI or WhatsApp bot;</li>
          <li>school membership information, if the account is school-linked;</li>
          <li>subscription and payment-status records; and</li>
          <li>device, sign-in, security, and abuse-prevention information.</li>
        </ul>
        <p>
          We do not need a student&apos;s password, PIN, full payment-card number,
          medical history, or private family information in an AI chat. Students
          should not send those details.
        </p>
      </>
    ),
  },
  {
    id: "reasons",
    title: "Why we use it",
    content: (
      <>
        <p>We use student information to:</p>
        <ul>
          <li>provide and secure the account;</li>
          <li>save learning work and calculate progress;</li>
          <li>suggest topics and generate AI study support;</li>
          <li>connect and continue WhatsApp tutoring conversations;</li>
          <li>process subscriptions and respond to support requests;</li>
          <li>prevent cheating, abuse, fraud, and unauthorised access; and</li>
          <li>improve the service using appropriate safeguards.</li>
        </ul>
        <p>
          We do not sell student information or use it for targeted advertising.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "What happens in AI chat",
    content: (
      <>
        <p>
          A message sent to an AI feature, plus relevant conversation and
          learning context, may be sent to OpenAI so it can generate a response.
          Study Buddy may store the message and response so the conversation can
          continue and so we can operate and protect the feature.
        </p>
        <p>
          AI can misunderstand a question or give a wrong answer. A student
          should check important information with a teacher, textbook, or
          official source. AI does not decide school admission, official grades,
          or examination results.
        </p>
      </>
    ),
  },
  {
    id: "adults-and-schools",
    title: "What parents and schools may see",
    content: (
      <>
        <p>
          A parent or guardian may make a verified request about a child&apos;s
          account when they have legal authority to do so. We will consider the
          child&apos;s own privacy rights and safety before disclosing information.
        </p>
        <p>
          If a school arranges or manages access, authorised school staff may see
          information made available under the school&apos;s agreement, such as
          account membership, participation, or learning progress. Before a
          school-linked service is launched, the school and Study Buddy must
          clearly identify exactly which staff can see which fields. AI-chat
          content should not be made available to school staff by default unless
          a valid, clearly explained safeguarding or service basis applies.
        </p>
      </>
    ),
  },
  {
    id: "authorisation",
    title: "Authorising a child account",
    content: (
      <>
        <p>
          Where the law requires it, a parent, guardian, or authorised school
          must approve a child&apos;s use before the account is used. The adult should
          understand what information is collected, which features the child can
          use, and how to withdraw the authorisation.
        </p>
        <p>
          Study Buddy&apos;s verified parental-authorisation workflow is still being
          finalised. Until it is available, a parent, guardian, or authorised
          school should contact{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> before a child
          creates an independently managed account. This notice does not replace
          the verification and consent controls that must be built into the
          product.
        </p>
      </>
    ),
  },
  {
    id: "choices",
    title: "Student and parent choices",
    content: (
      <>
        <p>A student, parent, or guardian may ask us to:</p>
        <ul>
          <li>explain what information we hold and how we use it;</li>
          <li>provide a copy of eligible information;</li>
          <li>correct inaccurate information;</li>
          <li>stop or restrict certain uses;</li>
          <li>withdraw consent where processing depends on consent; or</li>
          <li>delete eligible information or close an account.</li>
        </ul>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We may
          ask for information needed to verify identity and parental, guardian,
          or school authority. You may also complain to the{" "}
          <a
            href="https://www.ndpc.gov.ng/contact/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nigeria Data Protection Commission
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "safety",
    title: "Getting help",
    content: (
      <p>
        Tell a trusted adult and contact us if an AI response feels unsafe, an
        account may have been accessed by someone else, or personal information
        was shared by mistake. If someone may be in immediate danger, contact
        local emergency services or a trusted adult immediately; Study Buddy is
        not an emergency service.
      </p>
    ),
  },
];

export default function ParentStudentPrivacyPage() {
  return (
    <PolicyDocumentPage
      title="Parent and Student Privacy Notice"
      eyebrow="Student-friendly privacy"
      introduction="A plain-language guide to what Study Buddy knows about a learner, why we use it, what happens in AI chat, and how students and families can ask for help."
      icon="learnerSuccess"
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
