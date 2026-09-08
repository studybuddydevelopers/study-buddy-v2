import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  PRIVACY_EMAIL,
  REGISTERED_OFFICE_ADDRESS,
  SECURITY_EMAIL,
} from "@/lib/legal-entity";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Learn what personal information Study Buddy collects, why it is used, who receives it, how long it is kept and how to exercise your privacy rights.",
  path: "/privacy-policy",
});

const LAST_UPDATED = "8 September 2026";

const summaryItems: {
  title: string;
  description: string;
  icon?: LucideIcon;
  proposal?: StudyBuddyIconName;
}[] = [
  {
    title: "We collect learning data",
    description:
      "Account details, study activity, mock results, saved answers, and AI-chat messages help the product work.",
    proposal: "database",
  },
  {
    title: "We do not sell personal data",
    description:
      "Study Buddy does not sell student data and does not use personal data for targeted advertising.",
    proposal: "shield",
  },
  {
    title: "Trusted services process data",
    description:
      "Supabase, OpenAI, Meta/WhatsApp, Paystack, Railway, and Cloudflare help us run the platform.",
    proposal: "lock",
  },
  {
    title: "You can make privacy requests",
    description:
      "You can ask to access, correct, delete, object to, or export eligible account data.",
    proposal: "privacyRequest",
  },
];

const navItems = [
  ["Who we are", "who-we-are"],
  ["Information we collect", "information-we-collect"],
  ["Why we use it", "how-we-use-data"],
  ["AI and personalisation", "ai-and-personalisation"],
  ["Who receives data", "third-party-services"],
  ["International transfers", "international-transfers"],
  ["Cookies and local storage", "cookies"],
  ["Children's privacy", "childrens-privacy"],
  ["Retention", "retention"],
  ["Your rights", "your-rights"],
  ["Security", "storage-and-security"],
  ["Changes", "changes"],
  ["Contact", "contact"],
] as const;

function PolicySection({
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

function ExternalPolicyLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary-600 hover:underline"
    >
      {children}
    </a>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 w-full">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1fr_320px] lg:items-end lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
              <StudyBuddyIcon name="shield" size={22} />
              Legal and privacy
            </div>
            <Heading1 gutter="sm">Privacy Policy</Heading1>
            <Paragraph
              size="lg"
              weight="medium"
              className="max-w-3xl leading-relaxed text-gray-800"
            >
              This policy explains what Study Buddy AI collects, why we collect
              it, how we protect it, and how you can contact us about your data.
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
              href={`mailto:${PRIVACY_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline"
            >
              <StudyBuddyIcon name="mail" size={22} />
              {PRIVACY_EMAIL}
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
                  <StudyBuddyIcon name={proposal} size={60} className="mb-3" />
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
            aria-label="Privacy policy sections"
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
          <PolicySection id="who-we-are" title="1. Who we are">
            <p>
              Study Buddy AI is an educational technology platform designed to
              help Nigerian secondary school students prepare for the West
              African Senior School Certificate Examination (WAEC) and related
              assessments. Study Buddy AI is operated by {LEGAL_ENTITY_NAME}, a
              Nigerian private company limited by shares with company
              registration number RC {COMPANY_REGISTRATION_NUMBER}. Our
              registered office is {REGISTERED_OFFICE_ADDRESS}.
            </p>
            <p>
              {LEGAL_ENTITY_NAME} is the data controller for personal data
              processed for accounts provided directly by us. If a school
              arranges your access, the school may also be a data controller for
              information it asks us to process. In that case, you should also
              read the school&apos;s privacy notice.
            </p>
            <p>
              For privacy questions or requests, contact us at{" "}
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
          </PolicySection>

          <PolicySection
            id="information-we-collect"
            title="2. Information we collect"
          >
            <p>Depending on how you use Study Buddy, we may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                <strong>Account and identity information:</strong> first name,
                optional middle names, last names, email address, phone number,
                authentication identifiers, and account status.
              </ListItem>
              <ListItem>
                <strong>Profile and study preferences:</strong> profile image,
                grade level, exam year, preferred subjects, school affiliation
                where applicable, low-data preference, and whether cloud draft
                saving is enabled.
              </ListItem>
              <ListItem>
                <strong>Study activity:</strong> questions you attempt, answers
                and drafts you submit, topics you practise, mock exam scores,
                flashcard or resource activity, recommendations, progress, and
                session timing.
              </ListItem>
              <ListItem>
                <strong>AI conversations:</strong> messages you send to our AI
                tutoring features and the responses generated, including model
                and token-usage information.
              </ListItem>
              <ListItem>
                <strong>WhatsApp information:</strong> your WhatsApp number or
                sender identifier and messages when you use the WhatsApp bot.
              </ListItem>
              <ListItem>
                <strong>Payment records:</strong> transaction reference, amount,
                currency, payment status, subscription plan, and dates. Paystack
                processes the card, bank, or other payment details needed to
                complete payment; Study Buddy does not store full card or bank
                account details.
              </ListItem>
              <ListItem>
                <strong>Support information:</strong> your name, email, subject,
                message, and any information you choose to include when you
                contact us.
              </ListItem>
              <ListItem>
                <strong>Device, usage, and security information:</strong> IP
                address, browser or device information, request timestamps,
                pages or features used, CAPTCHA results, security events, and
                rate-limit records produced by our app and hosting providers.
              </ListItem>
            </ul>
            <p>
              We receive this information from you, your use of the service,
              your parent, guardian, or school where applicable, and the service
              providers described below. Practice drafts may remain only in
              your browser unless you turn on cloud draft saving.
            </p>
          </PolicySection>

          <PolicySection
            id="how-we-use-data"
            title="3. Why we use your data and our lawful bases"
          >
            <p>
              We process personal data only when we have a lawful basis under
              applicable data-protection law:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                <strong>To provide the service and take requested steps:</strong>{" "}
                create and secure accounts; provide practice, mock exams,
                saved drafts, progress tracking, AI support, WhatsApp tutoring,
                subscriptions, and support. We rely on performance of our
                agreement with you or steps you request before entering it.
              </ListItem>
              <ListItem>
                <strong>For our legitimate interests:</strong> protect accounts,
                prevent fraud and misuse, maintain and troubleshoot the service,
                understand feature performance, and improve learning content.
                We balance these interests against your rights and expectations.
              </ListItem>
              <ListItem>
                <strong>To comply with law:</strong> keep required financial and
                compliance records, respond to lawful requests, and protect the
                rights and safety of users and others.
              </ListItem>
              <ListItem>
                <strong>With consent:</strong> where consent is the appropriate
                basis, including a parent&apos;s or guardian&apos;s valid consent for a
                child where required. You may withdraw consent, but this does
                not affect earlier lawful processing.
              </ListItem>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal data to third
              parties, and we do not use it for targeted advertising. We may use
              data that has been irreversibly anonymised or combined so it no
              longer identifies a person to understand and improve the service.
            </p>
          </PolicySection>

          <PolicySection
            id="ai-and-personalisation"
            title="4. AI and personalisation"
          >
            <p>
              When you use AI features, the prompt, relevant conversation
              history, and limited learning context may be sent to OpenAI to
              generate a response. Web and WhatsApp conversations may also be
              stored by Study Buddy so you can continue a conversation and so
              we can operate, secure, and improve the feature. OpenAI may keep
              API content and related logs under its own service terms and data
              controls.
            </p>
            <p>
              Study Buddy uses learning activity to produce progress summaries
              and recommendations. These features are intended to support study;
              they do not make admission, grading, employment, credit, or other
              decisions with legal or similarly significant effects. You may ask
              us to explain or review a personalised result. AI responses can be
              wrong, so do not rely on them as the only source for an important
              decision.
            </p>
            <p>
              Do not include passwords, payment-card details, health information,
              or other sensitive personal data in an AI or WhatsApp message. Do
              not submit another person&apos;s personal data unless you are allowed
              to do so.
            </p>
          </PolicySection>

          <PolicySection
            id="third-party-services"
            title="5. Who receives your data"
          >
            <p>
              We share data only as needed to provide, secure, and lawfully
              operate Study Buddy. Our main service providers are:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                <strong>Supabase</strong> for authentication and database
                hosting.{" "}
                <ExternalPolicyLink href="https://supabase.com/privacy">
                  Supabase privacy policy
                </ExternalPolicyLink>
              </ListItem>
              <ListItem>
                <strong>OpenAI</strong> for AI tutoring chatbot responses and
                recommendations. Relevant prompts and conversation context are
                transmitted for processing.{" "}
                <ExternalPolicyLink href="https://openai.com/policies/privacy-policy">
                  OpenAI privacy policy
                </ExternalPolicyLink>
              </ListItem>
              <ListItem>
                <strong>Meta/WhatsApp Cloud API</strong> if you use our
                WhatsApp tutoring bot. Meta receives message and account-routing
                information needed to deliver messages.{" "}
                <ExternalPolicyLink href="https://www.whatsapp.com/legal/privacy-policy">
                  WhatsApp privacy policy
                </ExternalPolicyLink>
              </ListItem>
              <ListItem>
                <strong>Paystack</strong> for subscription payments. We share
                only what Paystack requires for billing.{" "}
                <ExternalPolicyLink href="https://paystack.com/privacy">
                  Paystack privacy policy
                </ExternalPolicyLink>
              </ListItem>
              <ListItem>
                <strong>Railway</strong> for web application hosting. Railway
                may receive standard server and network logs, including IP
                addresses.{" "}
                <ExternalPolicyLink href="https://railway.com/legal/privacy">
                  Railway privacy policy
                </ExternalPolicyLink>
              </ListItem>
              <ListItem>
                <strong>Cloudflare</strong> for authoritative DNS, proxying,
                transport security, and network-abuse protection. Cloudflare may
                process IP addresses and request metadata needed to provide
                those services.{" "}
                <ExternalPolicyLink href="https://www.cloudflare.com/privacypolicy/">
                  Cloudflare privacy policy
                </ExternalPolicyLink>
              </ListItem>
              <ListItem>
                <strong>Cloudflare Turnstile or hCaptcha</strong> for bot and
                abuse prevention on account and recovery forms. The configured
                provider may receive device, browser, and network information.{" "}
                <ExternalPolicyLink href="https://www.cloudflare.com/privacypolicy/">
                  Cloudflare privacy policy
                </ExternalPolicyLink>{" "}
                and{" "}
                <ExternalPolicyLink href="https://www.hcaptcha.com/privacy">
                  hCaptcha privacy policy
                </ExternalPolicyLink>
              </ListItem>
            </ul>
            <p>
              If your account is connected to a school, authorised school staff
              may receive account, participation, or learning information within
              the school service. We may also disclose data when required by law,
              to protect users or the service, or as part of a business
              reorganisation with appropriate confidentiality safeguards. We do
              not share student data with advertisers.
            </p>
          </PolicySection>

          <PolicySection
            id="international-transfers"
            title="6. International data transfers"
          >
            <p>
              Some providers may process personal data outside Nigeria. The
              location can depend on our provider configuration and their
              infrastructure. Where Nigerian law requires it, we use a permitted
              transfer basis and appropriate safeguards, such as an adequacy
              decision, contractual protections, or another lawful mechanism.
              Contact us if you would like information about the safeguards
              relevant to your data.
            </p>
          </PolicySection>

          <PolicySection id="cookies" title="7. Cookies and local storage">
            <p>
              We use essential authentication and security cookies to keep you
              signed in and protect requests. The app can also use browser local
              storage to keep unfinished practice answers on your device. If you
              enable cloud draft saving, the draft is also stored with your
              account. CAPTCHA providers may use their own necessary technologies
              to assess abuse. Study Buddy does not currently use advertising or
              behavioural-tracking cookies. See our{" "}
              <Link
                href="/cookie-policy"
                className="font-medium text-primary-600 hover:underline"
              >
                Cookie and Local Storage Policy
              </Link>{" "}
              for more detail.
            </p>
          </PolicySection>

          <PolicySection id="childrens-privacy" title="8. Children's privacy">
            <p>
              Study Buddy is designed for secondary school learners, including
              children under 18. An account for a child must be authorised by a
              parent or guardian, or by an authorised school acting lawfully,
              where consent or authorisation is required. The adult or school
              should review these terms and this policy with the learner and
              supervise appropriate use. We may request reasonable evidence of
              age, relationship, or authority.
            </p>
            <p>
              We seek to limit children&apos;s data to what is reasonably needed for
              learning, account safety, and the service requested. We do not
              show targeted advertising or sell student data. If we learn that a
              child&apos;s data was collected without required authorisation, we may
              restrict the account and delete or anonymise the data unless a
              different lawful basis requires us to keep it.
            </p>
            <p>
              A parent or guardian may contact us to ask about, correct, or
              delete a child&apos;s data, subject to the child&apos;s own rights and any
              lawful school arrangement. Email{" "}
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {PRIVACY_EMAIL}
              </a>
              . Families can also read our shorter{" "}
              <Link
                href="/parent-student-privacy"
                className="font-medium text-primary-600 hover:underline"
              >
                Parent and Student Privacy Notice
              </Link>
              .
            </p>
          </PolicySection>

          <PolicySection id="retention" title="9. How long we keep data">
            <p>
              We keep personal data only for as long as reasonably necessary for
              the purpose for which it was collected, including providing the
              account, resolving disputes, preventing abuse, enforcing our
              agreements, and meeting legal, tax, accounting, or regulatory
              duties. The period depends on the type of data and why we hold it.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                Account, profile, learning, and AI-chat records are generally
                kept while the account or relevant feature remains active and
                until they are deleted, anonymised, or no longer needed.
              </ListItem>
              <ListItem>
                A chat deleted in the product is removed from account view.
                Related records may remain while we process deletion or where
                they are needed for security, disputes, backups, or law.
              </ListItem>
              <ListItem>
                Payment and transaction records may be kept for the period
                required by financial, tax, fraud-prevention, and consumer law.
              </ListItem>
              <ListItem>
                Local practice drafts remain on your device until submitted,
                cleared, or removed through browser controls.
              </ListItem>
            </ul>
            <p>
              When retention is no longer justified, we delete or anonymise the
              data. Anonymised statistics that cannot reasonably identify a
              person may be retained for research and service improvement.
              Providers may apply their own lawful retention periods.
            </p>
          </PolicySection>

          <PolicySection id="your-rights" title="10. Your privacy rights">
            <p>You have the right to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                be informed about processing and request access to your personal
                data;
              </ListItem>
              <ListItem>
                correct inaccurate or incomplete data;
              </ListItem>
              <ListItem>
                request deletion when the law allows it;
              </ListItem>
              <ListItem>
                object to or ask us to restrict certain processing;
              </ListItem>
              <ListItem>
                withdraw consent at any time where processing relies on consent;
              </ListItem>
              <ListItem>
                receive eligible data in a structured, commonly used,
                machine-readable format and ask for portability where applicable;
              </ListItem>
              <ListItem>
                request human review of a solely automated decision that has a
                legal or similarly significant effect; and
              </ListItem>
              <ListItem>
                complain to the Nigeria Data Protection Commission (NDPC).
              </ListItem>
            </ul>
            <p>
              To exercise a right, email{" "}
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {PRIVACY_EMAIL}
              </a>
              . Tell us what you are requesting and which account is involved.
              We may need to verify your identity or authority before acting. We
              will respond without undue delay and within the period required by
              applicable law. Some rights have lawful exceptions, which we will
              explain if they apply.
            </p>
            <p>
              You can also contact or complain to the{" "}
              <ExternalPolicyLink href="https://www.ndpc.gov.ng/contact/">
                Nigeria Data Protection Commission
              </ExternalPolicyLink>
              . We encourage you to contact us first so we can try to resolve
              the issue.
            </p>
          </PolicySection>

          <PolicySection
            id="storage-and-security"
            title="11. Data storage and security"
          >
            <p>
              Study Buddy uses Supabase for authentication and database
              services, Railway for application hosting, and Cloudflare for DNS,
              proxying, and network protection. We use measures designed to
              protect personal data, including HTTPS/TLS in transit, access
              controls, service authentication, rate limiting, and security
              monitoring. Supabase Auth manages password credentials; Study
              Buddy does not store plaintext passwords in its application
              database.
            </p>
            <p>
              No online service is completely secure. If we become aware of a
              personal-data breach, we will investigate and notify affected
              people and the NDPC when required by law. Contact us immediately
              if you suspect unauthorised access to your account.
            </p>
            <p>
              To report a suspected technical vulnerability, email{" "}
              <a
                href={`mailto:${SECURITY_EMAIL}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {SECURITY_EMAIL}
              </a>
              . Please do not include unnecessary personal data or publicly
              disclose an unresolved issue.
            </p>
          </PolicySection>

          <PolicySection id="changes" title="12. Changes to this policy">
            <p>
              We may update this policy from time to time. When we do, we will
              update the Last updated date above. If a change materially affects
              how we use personal data, we will provide an appropriate notice in
              the service or by email and request consent again where the law
              requires it.
            </p>
          </PolicySection>

          <PolicySection id="contact" title="13. Contact">
            <p>For privacy-related questions or requests:</p>
            <div className="rounded-lg border border-gray-200 bg-accent-50 p-5 text-sm">
              <p className="font-semibold text-gray-900">
                {LEGAL_ENTITY_NAME}
              </p>
              <p className="mt-1">RC {COMPANY_REGISTRATION_NUMBER}</p>
              <p className="mt-1">
                Email:{" "}
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {PRIVACY_EMAIL}
                </a>
              </p>
              <p className="mt-1">Registered office: {REGISTERED_OFFICE_ADDRESS}</p>
            </div>
          </PolicySection>

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
