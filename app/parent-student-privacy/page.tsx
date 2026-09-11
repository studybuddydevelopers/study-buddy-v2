import Link from "next/link";
import PolicyDocumentPage, {
  type PolicyDocumentSection,
} from "@/components/PolicyDocumentPage";
import { PRIVACY_EMAIL } from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

const LAST_UPDATED = "12 September 2026";

export const metadata = createPageMetadata({
  title: "Parent and Student Privacy Notice",
  description:
    "A plain-language guide for students and parents explaining what learner data Study Buddy uses, how AI chats work and what choices families have.",
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
          <li>name, email address, phone number, date of birth, and account details;</li>
          <li>parent or legal guardian contact details and their authorisation decision if the student is aged 13–17;</li>
          <li>grade, exam year, preferred subjects, and profile image;</li>
          <li>questions, answers, drafts, scores, progress, and study activity;</li>
          <li>messages sent to the Study Buddy AI or WhatsApp bot;</li>
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
          Only a limited amount of recent relevant conversation is sent for a
          new answer. Study Buddy keeps the saved conversation while the account
          remains active so the student can revisit their study history.
        </p>
        <p>
          Study Buddy plans to use selected conversation data to test or improve
          its own AI later, but this does not happen in the current beta. Before
          it starts, it will be a separate choice that is switched off unless
          the family chooses it. For a student aged 13–17, their parent or legal
          guardian must approve and the student must also say yes. Saying no
          will not take away the normal Study Buddy service. Selected data must
          have identifying details removed and be checked to remove unnecessary
          private information.
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
    title: "Who can see a student’s information",
    content: (
      <>
        <p>
          A parent or guardian may make a verified request about a child&apos;s
          account when they have legal authority to do so. We will consider the
          child&apos;s own privacy rights and safety before disclosing information.
        </p>
        <p>
          Study Buddy does not currently provide accounts or a data-access area
          for schools or teachers. School staff cannot see a student&apos;s account,
          participation, learning progress, results, or AI chats through the
          current service. If Study Buddy develops a school service later, we
          will assess it separately and explain the exact access before enabling
          it.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "When information is handled outside Nigeria",
    content: (
      <>
        <p>
          Study Buddy uses some companies outside Nigeria to run the service.
          Our main Supabase database is in Stockholm, Sweden. Railway hosts the
          app, Cloudflare helps protect it, Resend sends important account
          emails, and OpenAI receives limited information when an approved AI
          feature is used. These companies or their approved service providers
          may handle limited information in other countries too.
        </p>
        <p>
          We send only what is needed for the requested feature and use
          contracts, encryption, access controls, and provider checks to protect
          it. Optional overseas processing needs a separate choice. A parent or
          legal guardian can ask us what safeguards apply or withdraw a consent-
          based choice by emailing{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. Some core
          features may no longer work if an overseas service that is necessary
          for that feature cannot be used.
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
          Study Buddy accounts are for people aged 13 and over. Someone aged 18
          or over may activate their own account. Someone aged 13–17 can fill in
          the sign-up form, but the account stays locked until a parent or legal
          guardian approves it. A school cannot approve instead in the current
          product.
        </p>
        <p>
          We email the named adult an expiring, one-time link. They confirm that
          they are the parent or legal guardian, read the current notices, and
          approve or deny the learning account. AI permission is a separate,
          optional choice. We record the decision and notice versions. The adult
          and student are not routinely asked for identity documents. We ask for
          minimal extra evidence only if the age or adult&apos;s authority is disputed,
          inconsistent, or appears suspicious, and delete that evidence after
          recording the result unless the law requires limited retention. The adult
          may later withdraw authorisation through a verified request to{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. Once verified,
          we sign the student out, restrict the account, stop new AI and WhatsApp
          activity, and notify both the student and the adult. Existing data is
          kept securely only while the adult chooses reauthorisation or permanent
          deletion, subject to any limited retention required by law.
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
          <li>delete a saved conversation, eligible information, or an account.</li>
        </ul>
        <p>
          An account holder can deactivate the account or request permanent
          deletion in Settings. For other requests, or if the account cannot be
          accessed, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          We may ask for information needed to verify identity and parental or
          guardian authority. A web AI chat has a permanent-delete control.
          WhatsApp users can send <strong>DELETE MY CHAT</strong> and confirm the
          displayed instruction within 15 minutes to delete only their saved
          WhatsApp conversation. Submitted answers, practice and mock-exam
          results, and progress history are kept while the account is active.
          A deactivated account and that study history are kept for 36 months so
          they can be restored if the student reactivates; we email warnings 90,
          60, 15, and 1 day before automatic deletion. A permanent request must
          be confirmed using a one-time account-email link. Confirmation locks
          the account, starts a 15-day cancellation window, removes active-system
          personal data within 30 days unless law requires limited retention,
          and ages protected backup copies out within 90 days. Essential payment
          and transaction records are separated from the ordinary account link
          and kept for seven years for financial and tax obligations. You may
          also complain to the{" "}
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
      contactEmail={PRIVACY_EMAIL}
    />
  );
}
