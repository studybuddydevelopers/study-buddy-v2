import Link from "next/link";
import {
  ArrowRight,
  Database,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";

const LAST_UPDATED = "20 July 2026";
const CONTACT_EMAIL = "sbstudybuddy0@gmail.com";

const summaryItems = [
  {
    title: "We collect learning data",
    description:
      "Account details, study activity, mock results, saved answers, and AI-chat messages help the product work.",
    icon: Database,
  },
  {
    title: "We do not sell personal data",
    description:
      "Study Buddy does not sell student data and does not use personal data for targeted advertising.",
    icon: ShieldCheck,
  },
  {
    title: "Trusted services process data",
    description:
      "Supabase, OpenAI, Meta/WhatsApp, Paystack, and Vercel help us run the platform.",
    icon: LockKeyhole,
  },
  {
    title: "You can make privacy requests",
    description:
      "You can ask to access, correct, delete, object to, or export eligible account data.",
    icon: UserCheck,
  },
];

const navItems = [
  ["Who we are", "who-we-are"],
  ["Information we collect", "information-we-collect"],
  ["How we use data", "how-we-use-data"],
  ["Storage and security", "storage-and-security"],
  ["Third-party services", "third-party-services"],
  ["Cookies", "cookies"],
  ["Children's privacy", "childrens-privacy"],
  ["Your rights", "your-rights"],
  ["Retention", "retention"],
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
    <main className="flex-1 w-full">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1fr_320px] lg:items-end lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
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
              assessments. We operate the Study Buddy AI website and related
              messaging services, including a WhatsApp tutoring bot.
            </p>
            <p>
              For privacy questions, contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </PolicySection>

          <PolicySection
            id="information-we-collect"
            title="2. Information we collect"
          >
            <p>
              We collect only what is necessary to deliver and improve our
              service:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                <strong>Account information:</strong> first name, last names,
                email address, and phone number when you register.
              </ListItem>
              <ListItem>
                <strong>Study activity:</strong> questions you attempt, answers
                you submit, topics you practise, mock exam scores, and session
                timing.
              </ListItem>
              <ListItem>
                <strong>AI conversations:</strong> messages you send to our AI
                tutoring chatbot on the web platform or via WhatsApp.
              </ListItem>
              <ListItem>
                <strong>WhatsApp number:</strong> stored when you use the
                WhatsApp bot so we can link conversations to your account.
              </ListItem>
              <ListItem>
                <strong>Usage data:</strong> pages visited, features used,
                device type, browser, and IP address collected automatically by
                hosting infrastructure.
              </ListItem>
              <ListItem>
                <strong>Payment information:</strong> subscription payments are
                processed by Paystack. We do not store card numbers or bank
                details.
              </ListItem>
            </ul>
          </PolicySection>

          <PolicySection id="how-we-use-data" title="3. How we use your data">
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                Provide your personalised dashboard, progress tracking, and AI
                study recommendations.
              </ListItem>
              <ListItem>
                Generate AI tutoring responses through OpenAI.
              </ListItem>
              <ListItem>
                Send account emails, including verification, password reset,
                and important service notices.
              </ListItem>
              <ListItem>
                Improve our question bank, topic structure, and platform using
                anonymised aggregate data.
              </ListItem>
              <ListItem>
                Detect and prevent fraud, abuse, or unauthorised access.
              </ListItem>
              <ListItem>
                Comply with applicable Nigerian law and regulatory
                requirements.
              </ListItem>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal data to third
              parties, and we do not use your data for targeted advertising.
            </p>
          </PolicySection>

          <PolicySection
            id="storage-and-security"
            title="4. Data storage and security"
          >
            <p>
              Your data is stored in a PostgreSQL database hosted on Supabase,
              with servers currently located in the European Union. By using
              Study Buddy AI, you consent to this international transfer.
            </p>
            <p>We apply industry-standard protections:</p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                Passwords are never stored in plain text. Authentication is
                handled by Supabase Auth with bcrypt hashing.
              </ListItem>
              <ListItem>All data in transit is encrypted via HTTPS/TLS.</ListItem>
              <ListItem>
                Database access is restricted to application services. No direct
                public database access is permitted.
              </ListItem>
              <ListItem>
                We apply the principle of least privilege so each service
                accesses only the data it requires.
              </ListItem>
            </ul>
            <p>
              No online system is 100% secure. If you suspect unauthorised
              access to your account, contact us immediately.
            </p>
          </PolicySection>

          <PolicySection
            id="third-party-services"
            title="5. Third-party services"
          >
            <p>
              We use the following services to operate the platform. Each has
              its own privacy policy:
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
                recommendations. Messages you send to AI features are
                transmitted to OpenAI for processing.{" "}
                <ExternalPolicyLink href="https://openai.com/policies/privacy-policy">
                  OpenAI privacy policy
                </ExternalPolicyLink>
              </ListItem>
              <ListItem>
                <strong>Meta/WhatsApp Cloud API</strong> if you use our
                WhatsApp tutoring bot.{" "}
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
                <strong>Vercel</strong> for web application hosting. Vercel may
                receive standard server logs, including IP addresses.{" "}
                <ExternalPolicyLink href="https://vercel.com/legal/privacy-policy">
                  Vercel privacy policy
                </ExternalPolicyLink>
              </ListItem>
            </ul>
          </PolicySection>

          <PolicySection id="cookies" title="6. Cookies and local storage">
            <p>
              We use session cookies set by Supabase Auth to keep you logged in.
              These are strictly necessary. Without them, the platform cannot
              function. We do not use third-party tracking cookies or
              advertising cookies.
            </p>
          </PolicySection>

          <PolicySection id="childrens-privacy" title="7. Children's privacy">
            <p>
              Study Buddy AI is designed for secondary school students, some of
              whom may be under 18. We do not knowingly collect more personal
              data than is necessary to provide the service. We do not display
              advertising, and we do not share student data with advertisers.
            </p>
            <p>
              If you are a parent or guardian and believe your child has
              provided personal data without your consent, contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we will delete the data promptly.
            </p>
          </PolicySection>

          <PolicySection id="your-rights" title="8. Your rights">
            <p>You have the right to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <ListItem>
                <strong>Access:</strong> request a copy of the personal data we
                hold about you.
              </ListItem>
              <ListItem>
                <strong>Correction:</strong> ask us to correct inaccurate data.
              </ListItem>
              <ListItem>
                <strong>Deletion:</strong> request that we delete your account
                and associated data.
              </ListItem>
              <ListItem>
                <strong>Objection:</strong> object to processing you believe is
                unlawful.
              </ListItem>
              <ListItem>
                <strong>Portability:</strong> receive your study history and
                account data in a machine-readable format.
              </ListItem>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days.
            </p>
          </PolicySection>

          <PolicySection id="retention" title="9. Data retention">
            <p>
              We retain your account data for as long as your account is active.
              If you delete your account, we will remove your personal
              information within 30 days, except where we are required by law to
              retain certain records.
            </p>
            <p>
              Anonymised, aggregated study statistics, such as pass rates per
              topic, may be retained indefinitely to improve the platform.
            </p>
          </PolicySection>

          <PolicySection id="changes" title="10. Changes to this policy">
            <p>
              We may update this policy from time to time. When we do, we will
              update the Last updated date at the top of this page and, for
              material changes, notify you by email. Continued use of Study
              Buddy AI after the effective date constitutes your acceptance of
              the revised policy.
            </p>
          </PolicySection>

          <PolicySection id="contact" title="11. Contact">
            <p>For privacy-related questions or requests:</p>
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
          </PolicySection>

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
