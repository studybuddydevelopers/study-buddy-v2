import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";
import {
  COMPANY_REGISTRATION_NUMBER,
  LEGAL_ENTITY_NAME,
  REGISTERED_OFFICE_ADDRESS,
  SUPPORT_EMAIL,
} from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description:
    "Read the rules for Study Buddy accounts, learning content, AI features, payments, acceptable use, service availability and dispute handling.",
  path: "/terms-of-service",
});

const LAST_UPDATED = "11 September 2026";

const summaryItems: {
  title: string;
  description: string;
  icon?: LucideIcon;
  proposal?: StudyBuddyIconName;
}[] = [
  {
    title: "Use Study Buddy for learning",
    description:
      "The platform is for lawful study, exam preparation, practice, revision, and progress tracking.",
    icon: BookOpen,
  },
  {
    title: "Keep accounts safe",
    description:
      "Do not share login details, access another account, scrape private data, or disrupt the service.",
    proposal: "shield",
  },
  {
    title: "AI is study support",
    description:
      "AI responses can help explain ideas, but they may be incomplete or wrong and should not replace teachers.",
    proposal: "support",
  },
  {
    title: "Paid features may change",
    description:
      "Where paid features are offered, billing is handled by payment providers such as Paystack.",
    proposal: "card",
  },
];

const navItems = [
  ["Agreement", "agreement"],
  ["Who may use it", "who-may-use-it"],
  ["The service", "the-service"],
  ["Accounts", "accounts"],
  ["Acceptable use", "acceptable-use"],
  ["Your content", "your-content"],
  ["AI features", "ai-features"],
  ["Study content", "study-content"],
  ["Payments", "payments"],
  ["Third-party services", "third-party-services"],
  ["Availability", "availability"],
  ["Ending access", "ending-access"],
  ["Liability", "liability"],
  ["Privacy", "privacy"],
  ["Changes", "changes"],
  ["Law and disputes", "law-and-disputes"],
  ["Contact", "contact"],
] as const;

function TermsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-gray-200 py-8">
      <Heading2 size="sm" gutter="sm">
        {title}
      </Heading2>
      <div className="space-y-4 text-[0.95rem] leading-relaxed text-gray-700">
        {children}
      </div>
    </section>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="pl-1">
      <span>{children}</span>
    </li>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="flex-1 w-full">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1fr_320px] lg:items-end lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
              <StudyBuddyIcon name="scale" size={22} />
              Product terms
            </div>
            <Heading1 gutter="sm">Terms of Service</Heading1>
            <Paragraph
              size="lg"
              weight="medium"
              className="max-w-3xl leading-relaxed text-gray-800"
            >
              These terms explain how students, parents, guardians, and other
              users may use Study Buddy AI&apos;s learning tools, practice materials,
              mock exams, progress features, and AI chat.
            </Paragraph>
          </div>

          <div className="rounded-lg border border-gray-200 bg-accent-50 p-5">
            <p className="text-xs font-semibold uppercase text-primary-600">
              Last updated
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {LAST_UPDATED}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline"
            >
              <StudyBuddyIcon name="mail" size={22} />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <section className="bg-accent-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-4 md:grid-cols-4">
            {summaryItems.map(({ title, description, icon: Icon, proposal }) => (
              <article
                key={title}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                {proposal ? (
                  <StudyBuddyIcon name={proposal} size={30} className="mb-3" />
                ) : Icon ? (
                  <Icon className="mb-3 h-5 w-5 text-primary-600" aria-hidden="true" />
                ) : null}
                <h2 className="text-sm font-bold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <nav
            aria-label="Terms of service sections"
            className="sticky top-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="mb-3 text-xs font-semibold uppercase text-gray-500">
              On this page
            </p>
            <ul className="space-y-2 text-sm">
              {navItems.map(([label, id]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-gray-700 transition hover:text-primary-700 hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-5 py-2 shadow-sm sm:px-8">
          <TermsSection id="agreement" title="1. Agreement to these terms">
            <p>
              By creating an account, visiting the website, using the chatbot,
              attempting practice questions, taking mock exams, or using related
              Study Buddy AI services, you agree to these Terms of Service and
              our{" "}
              <Link
                href="/privacy-policy"
                className="font-medium text-primary-600 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              These terms form an agreement between you and {LEGAL_ENTITY_NAME}
              (RC {COMPANY_REGISTRATION_NUMBER}), the Nigerian company that
              operates Study Buddy AI.
            </p>
            <p>
              If you do not agree, do not create an account or use the service.
              The current service does not provide school or teacher accounts;
              any future organisational service will require separate terms and
              privacy information before it is enabled.
            </p>
          </TermsSection>

          <TermsSection id="who-may-use-it" title="2. Who may use Study Buddy">
            <p>
              Study Buddy AI is currently intended for individual students and
              the parents or legal guardians involved in child authorisation. A
              learner must be at least 13 years old to create an account.
              Users aged 18 or over may create and activate their own account,
              provided they have the legal capacity needed to agree to these
              terms.
            </p>
            <p>
              A user aged 13–17 may register, but the account remains locked
              until a parent or legal guardian approves it through our expiring,
              one-time email process. The adult must review these terms and our
              privacy notices, confirm their authority, and separately choose
              whether to permit AI features. A school does not replace this
              approval. Study Buddy does not currently provide a school-managed
              account process or school-staff access to student information.
            </p>
            <p>
              We may restrict an account if the date of birth or adult authority
              appears inaccurate. A parent or legal guardian may withdraw an
              authorisation by emailing privacy@studybuddyng.com; we will verify
              identity and authority before changing the account.
            </p>
          </TermsSection>

          <TermsSection id="the-service" title="3. What the service provides">
            <p>
              Study Buddy provides exam preparation tools, practice questions,
              mock exams, progress tracking, settings for low-data use, and AI
              study support features. Some features may still be experimental or
              may change as the product improves.
            </p>
            <p>
              The platform is designed to support learning. It does not
              guarantee any exam score, admission result, certificate outcome, or
              academic decision.
            </p>
          </TermsSection>

          <TermsSection id="accounts" title="4. Accounts and security">
            <p>
              Give us accurate, current information and update it when needed.
              Each account is for one user and may not be transferred.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                Keep your password and login information private.
              </ListItem>
              <ListItem>
                Do not let another person use your account as their own.
              </ListItem>
              <ListItem>
                Tell us promptly if you suspect unauthorised access.
              </ListItem>
              <ListItem>
                Do not attempt to access, test, or change another user&apos;s
                account or data.
              </ListItem>
            </ul>
            <p>
              You are responsible for activity carried out through your account
              unless it results from our failure to use reasonable security or
              another circumstance for which the law makes us responsible.
            </p>
          </TermsSection>

          <TermsSection id="acceptable-use" title="5. Acceptable use">
            <p>Use Study Buddy for lawful study and revision. Do not:</p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                misuse AI tutoring or use it to cheat, impersonate someone, or
                produce harmful content;
              </ListItem>
              <ListItem>
                submit abusive, illegal, hateful, sexually explicit, or
                threatening content;
              </ListItem>
              <ListItem>
                scrape private data, overload the service, or bypass rate
                limits and security controls;
              </ListItem>
              <ListItem>
                upload malware, attempt prompt-injection abuse, or interfere
                with the operation of the platform;
              </ListItem>
              <ListItem>
                copy, resell, or redistribute platform content in a way that
                violates intellectual-property rights or these terms.
              </ListItem>
            </ul>
            <p>
              We may use proportionate technical and human measures to detect,
              investigate, and respond to suspected misuse.
            </p>
          </TermsSection>

          <TermsSection id="your-content" title="6. Your content">
            <p>
              You keep any ownership rights you have in messages, answers,
              profile content, feedback, and other material you submit. You give
              Study Buddy a limited, non-exclusive licence to host, copy,
              process, transmit, and display that content only as reasonably
              needed to provide, secure, support, and improve the service in
              accordance with our Privacy Policy. This licence ends when the
              content is deleted from our systems, except for lawful retention,
              backups, and anonymised information.
            </p>
            <p>
              You confirm that you have the rights and permissions needed to
              submit content. Do not submit confidential information, personal
              data about another person, copyrighted exam materials, or other
              protected content unless you are authorised to do so.
            </p>
          </TermsSection>

          <TermsSection id="ai-features" title="7. AI features">
            <p>
              Study Buddy includes AI study support. AI responses can be useful,
              but they may be incomplete, outdated, or wrong. You should check
              important answers against teachers, textbooks, official exam
              materials, or other reliable sources.
            </p>
            <p>
              The live chatbot is a persistent general AI study assistant.
              Features described as experimental, resource-grounded, cited, or
              advanced are available only when they are visibly enabled in the
              product. AI features do not replace a teacher, examiner, medical
              professional, lawyer, or other qualified adviser.
            </p>
            <p>
              AI prompts and relevant context are processed by providers such as
              OpenAI as explained in our Privacy Policy. Do not include passwords,
              payment-card details, health information, or other sensitive data.
              Saved AI and WhatsApp conversations remain available while your
              account is active unless you delete them. For each new response,
              we send only bounded recent context rather than your complete
              saved archive. Web chat deletion is permanent; WhatsApp users can
              start the chat-only deletion process by sending DELETE MY CHAT and
              must confirm the displayed instruction within 15 minutes.
              We may monitor AI usage patterns to protect the service and improve
              safety. Staff do not routinely read individual conversations;
              the narrow support, safety, security, technical, fraud/abuse, and
              legal exceptions are stated in our Privacy Policy. Do not try to
              make the AI reveal private instructions, credentials, account
              data, or unauthorised content.
            </p>
            <p>
              Conversation-based training or evaluation of Study Buddy&apos;s own
              AI is not active in the current beta. If introduced, it will be
              optional, off by default, and subject to the separate adult or
              parent/legal-guardian and student choices, safeguards, and
              withdrawal information described in our Privacy Policy.
            </p>
          </TermsSection>

          <TermsSection id="study-content" title="8. Study content and licences">
            <p>
              Practice questions, explanations, mock exams, flashcards,
              textbooks, and other materials are provided for study support. We
              try to keep content useful and accurate, but errors can happen.
            </p>
            <p>
              If you notice a question, answer, explanation, or topic mapping
              that appears incorrect, contact us with the subject, topic, and
              question details so we can review it.
            </p>
            <p>
              Study Buddy and its licensors own the service, software, branding,
              and platform content, except for content identified as belonging
              to someone else. We give you a limited, revocable, non-transferable
              licence to use the service and its content for personal,
              non-commercial learning. References to WAEC or other examination
              bodies describe the learning context and do not by themselves
              imply endorsement or affiliation.
            </p>
          </TermsSection>

          <TermsSection id="payments" title="9. Payments, renewals, and refunds">
            <p>
              If paid plans or subscriptions are available, prices, billing
              periods, taxes, plan limits, and any renewal terms will be shown
              before you pay. By completing checkout, you authorise the stated
              charge through a payment provider such as Paystack. When paid
              subscriptions are enabled, they will renew automatically for the
              billing period disclosed at checkout until cancelled. Before the
              first payment, we will clearly show the recurring price, billing
              frequency, expected renewal timing, and cancellation method and
              ask you to authorise recurring billing.
            </p>
            <p>
              We do not store card numbers or bank details. Payment providers
              process the information required to complete billing, while we
              retain transaction references, amounts, currency, status, and plan
              information. Essential payment, invoice, and transaction records
              are retained for seven years from the transaction date, including
              after account deletion where required for accounting and tax
              compliance. Longer retention applies only to a documented tax
              audit, chargeback, dispute, investigation, or legal hold.
            </p>
            <p>
              You may cancel a future automatic renewal under Settings →
              Subscription by selecting “Cancel subscription” and confirming
              the request before the next billing date. We will email a
              cancellation confirmation. If you cannot use the in-app control,
              email billing@studybuddyng.com from your account email address and
              include the payment reference. Cancellation stops the next
              renewal, and paid access ends on the cancellation date. Paid
              subscriptions will not be enabled until the refund or credit
              treatment for any unused prepaid period is clearly stated at
              checkout and in our Refund and Cancellation Policy. Refunds are
              available where required by Nigerian consumer law, including where
              a paid service is not supplied as agreed, and in any additional
              circumstances stated at checkout. Nothing in these terms removes
              a statutory cancellation, refund, or redress right. See our{" "}
              <Link
                href="/refund-policy"
                className="font-medium text-primary-600 hover:underline"
              >
                Refund and Cancellation Policy
              </Link>{" "}
              for the request process.
            </p>
          </TermsSection>

          <TermsSection
            id="third-party-services"
            title="10. Third-party services and links"
          >
            <p>
              Study Buddy relies on third parties for hosting, authentication,
              AI processing, messaging, CAPTCHA, and payments. Your use of a
              third-party service may also be governed by that provider&apos;s terms
              and privacy notice. We are responsible for choosing and managing
              our providers as required by law, but we do not control independent
              third-party websites, networks, or services.
            </p>
          </TermsSection>

          <TermsSection id="availability" title="11. Availability and changes">
            <p>
              We aim to keep Study Buddy available, but the service may be
              interrupted by maintenance, network issues, provider outages, or
              changes to third-party services. Features, content, pricing, and
              limits may change as the product develops. We will give reasonable
              notice before a change that materially reduces an active paid plan
              where it is practical and legally required.
            </p>
          </TermsSection>

          <TermsSection id="ending-access" title="12. Ending or limiting access">
            <p>
              We may suspend, restrict, or terminate access if an account
              violates these terms, creates security risk, abuses AI features,
              attempts unauthorised access, or harms other users or the service.
              Where reasonable, we will consider the seriousness of the issue and
              give notice or an opportunity to correct it before termination.
            </p>
            <p>
              You may stop using Study Buddy at any time. Settings offers a
              reversible account-deactivation option and a permanent-deletion
              request. Deactivation restricts access and signs you out
              immediately. Your submitted answers, practice and mock-exam
              results, and progress history remain preserved during the
              36-month deactivation period so they can be restored if you
              reactivate. Unless you reactivate, the account and that study
              history are automatically deleted after 36 months; we send
              notices 90, 60, 15, and 1 day before that deadline. A permanent
              request first requires a one-time email link and a deliberate
              confirmation on the linked page. The account remains active until
              that confirmation.
              Confirmation locks the account, starts a 15-day cancellation window, and schedules
              active-system personal data for deletion within 30 days, subject
              to records we must retain by law or under a documented legal hold;
              protected backup copies age out within 90 days of confirmation.
              You may cancel before the purge begins or contact
              privacy@studybuddyng.com during the 15-day window. For other
              privacy requests or access problems, email
              privacy@studybuddyng.com. If we discontinue a paid service before
              the end of a prepaid period for reasons unrelated to your breach,
              we will provide the remedy required by applicable law.
            </p>
          </TermsSection>

          <TermsSection id="liability" title="13. Service standards and liability">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <p className="text-sm leading-relaxed text-amber-950">
                  Study Buddy is a learning aid. It is not a substitute for
                  professional teaching, official exam guidance, or independent
                  judgement.
                </p>
              </div>
            </div>
            <p>
              We will provide the service with reasonable care and skill. We do
              not promise that every feature will always be available, uninterrupted,
              secure, or error-free, or that study content and AI output will
              always be accurate. You remain responsible for checking important
              information and meeting exam or school deadlines.
            </p>
            <p>
              To the extent permitted by law, Study Buddy is not responsible for
              losses that were not reasonably foreseeable, indirect or
              consequential losses, exam outcomes, or decisions made solely from
              unverified AI output. Nothing in these terms excludes or limits
              liability, remedies, warranties, or consumer rights that cannot
              lawfully be excluded or limited, including rights under the Federal
              Competition and Consumer Protection Act.
            </p>
          </TermsSection>

          <TermsSection id="privacy" title="14. Privacy">
            <p>
              Our{" "}
              <Link
                href="/privacy-policy"
                className="font-medium text-primary-600 hover:underline"
              >
                Privacy Policy
              </Link>{" "}
              explains what personal data we collect, our lawful bases, how AI
              and other providers process data, children&apos;s privacy, retention,
              international transfers, and how to exercise privacy rights.
              Students and families can also read the shorter{" "}
              <Link
                href="/parent-student-privacy"
                className="font-medium text-primary-600 hover:underline"
              >
                Parent and Student Privacy Notice
              </Link>
              .
            </p>
          </TermsSection>

          <TermsSection id="changes" title="15. Changes to these terms">
            <p>
              We may update these terms as the platform changes. When we do, we
              will update the Last updated date above. If a change is material,
              we will provide reasonable notice through the product or by email.
              Changes apply from their stated effective date. If you do not agree
              to a material change, you may stop using the service and cancel a
              future subscription renewal before it takes effect.
            </p>
          </TermsSection>

          <TermsSection id="law-and-disputes" title="16. Nigerian law and disputes">
            <p>
              These terms are governed by the laws of the Federal Republic of
              Nigeria. If a dispute arises, please contact us first so we can try
              to resolve it fairly. If it cannot be resolved, either party may
              use the courts with jurisdiction in Nigeria. This does not prevent
              you from making a complaint to a competent regulator or using any
              other remedy available under consumer or data-protection law.
            </p>
          </TermsSection>

          <TermsSection id="contact" title="17. Contact and complaints">
            <p>
              If you need help with your account or have questions about these
              terms, contact Study Buddy AI:
            </p>
            <div className="rounded-lg border border-gray-200 bg-accent-50 p-5 text-sm">
              <p className="font-semibold text-gray-900">
                {LEGAL_ENTITY_NAME}
              </p>
              <p className="mt-1">RC {COMPANY_REGISTRATION_NUMBER}</p>
              <p className="mt-1">
                Email:{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p className="mt-1">Registered office: {REGISTERED_OFFICE_ADDRESS}</p>
            </div>
            <p>
              Nigerian consumers may also use the{" "}
              <a
                href="https://fccpc.gov.ng/consumers/complaint-handling/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:underline"
              >
                Federal Competition and Consumer Protection Commission complaint
                process
              </a>
              .
            </p>
          </TermsSection>

          <div className="flex flex-col gap-3 py-8 sm:flex-row">
            <Link href="/contact-us">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                icon={<StudyBuddyIcon name="support" size={22} />}
              >
                Contact us
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                icon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
              >
                Create an account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
