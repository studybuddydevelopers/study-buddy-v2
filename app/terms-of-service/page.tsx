import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CreditCard,
  Mail,
  MessageCircle,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";

const LAST_UPDATED = "20 July 2026";
const CONTACT_EMAIL = "sbstudybuddy0@gmail.com";

const summaryItems = [
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
    icon: ShieldCheck,
  },
  {
    title: "AI is study support",
    description:
      "AI responses can help explain ideas, but they may be incomplete or wrong and should not replace teachers.",
    icon: MessageCircle,
  },
  {
    title: "Paid features may change",
    description:
      "Where paid features are offered, billing is handled by payment providers such as Paystack.",
    icon: CreditCard,
  },
];

const navItems = [
  ["Agreement", "agreement"],
  ["Who may use it", "who-may-use-it"],
  ["The service", "the-service"],
  ["Accounts", "accounts"],
  ["Acceptable use", "acceptable-use"],
  ["AI features", "ai-features"],
  ["Study content", "study-content"],
  ["Payments", "payments"],
  ["Availability", "availability"],
  ["Ending access", "ending-access"],
  ["Liability", "liability"],
  ["Changes", "changes"],
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
    <main className="flex-1 w-full">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1fr_320px] lg:items-end lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
              <Scale className="h-4 w-4" aria-hidden="true" />
              Product terms
            </div>
            <Heading1 gutter="sm">Terms of Service</Heading1>
            <Paragraph
              size="lg"
              weight="medium"
              className="max-w-3xl leading-relaxed text-gray-800"
            >
              These terms explain how students, parents, schools, and other
              users may use Study Buddy AI&apos;s learning tools, practice
              materials, mock exams, progress features, and AI chat.
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
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <section className="bg-accent-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-4 md:grid-cols-4">
            {summaryItems.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <Icon className="mb-3 h-5 w-5 text-primary-600" aria-hidden="true" />
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
              If you do not agree with these terms, do not use the platform.
            </p>
          </TermsSection>

          <TermsSection id="who-may-use-it" title="2. Who may use Study Buddy">
            <p>
              Study Buddy AI is intended for students, parents or guardians,
              teachers, schools, and other users involved in exam preparation.
              Students under 18 should use the service with permission from a
              parent, guardian, or school where required.
            </p>
            <p>
              You are responsible for making sure the information you provide is
              accurate and that your use of the service is lawful where you are.
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
          </TermsSection>

          <TermsSection id="ai-features" title="6. AI features">
            <p>
              Study Buddy includes AI study support. AI responses can be useful,
              but they may be incomplete, outdated, or wrong. You should check
              important answers against teachers, textbooks, official exam
              materials, or other reliable sources.
            </p>
            <p>
              The live chatbot should currently be treated as a persistent
              general AI study assistant. Resource-grounded answers, citations,
              and advanced tutoring modes should not be treated as available
              until they are enabled in the product after validation.
            </p>
            <p>
              We may review AI usage patterns to protect the service, prevent
              misuse, and improve safety. Do not try to make the AI reveal
              private system instructions, credentials, account data, or content
              that you are not authorised to access.
            </p>
          </TermsSection>

          <TermsSection id="study-content" title="7. Study content">
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
          </TermsSection>

          <TermsSection id="payments" title="8. Payments and subscriptions">
            <p>
              If paid plans or subscriptions are available, prices, billing
              periods, plan limits, and renewal terms will be shown during the
              purchase flow. Payment processing may be handled by third-party
              providers such as Paystack.
            </p>
            <p>
              We do not store card numbers or bank details. Payment providers
              may process the information required to complete billing.
            </p>
          </TermsSection>

          <TermsSection id="availability" title="9. Availability and changes">
            <p>
              We aim to keep Study Buddy available, but the service may be
              interrupted by maintenance, network issues, provider outages, or
              changes to third-party services. Features, content, pricing, and
              limits may change as the product develops.
            </p>
          </TermsSection>

          <TermsSection id="ending-access" title="10. Ending or limiting access">
            <p>
              We may suspend, restrict, or terminate access if an account
              violates these terms, creates security risk, abuses AI features,
              attempts unauthorised access, or harms other users or the service.
            </p>
            <p>
              You may stop using Study Buddy at any time. For account deletion
              or privacy requests, contact us through the contact page or by
              email.
            </p>
          </TermsSection>

          <TermsSection id="liability" title="11. Important limitations">
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
              To the extent permitted by law, Study Buddy is provided as-is and
              we are not responsible for indirect loss, exam outcomes, missed
              deadlines, or decisions made only from platform output.
            </p>
          </TermsSection>

          <TermsSection id="changes" title="12. Changes to these terms">
            <p>
              We may update these terms as the platform changes. When we do, we
              will update the Last updated date on this page. If a change is
              material, we may provide additional notice through the product or
              by email.
            </p>
          </TermsSection>

          <TermsSection id="contact" title="13. Contact">
            <p>
              If you need help with your account or have questions about these
              terms, contact Study Buddy AI:
            </p>
            <div className="rounded-lg border border-gray-200 bg-accent-50 p-5 text-sm">
              <p className="font-semibold text-gray-900">Study Buddy AI</p>
              <p className="mt-1">
                Email:{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="mt-1">Nigeria</p>
            </div>
          </TermsSection>

          <div className="flex flex-col gap-3 py-8 sm:flex-row">
            <Link href="/contact-us">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                icon={<MessageCircle className="h-5 w-5" aria-hidden="true" />}
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
    </main>
  );
}
