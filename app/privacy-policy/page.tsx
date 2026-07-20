import Link from "next/link";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";

const LAST_UPDATED = "20 July 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="space-y-3">
      <Heading2 size="sm" gutter="none" className="text-gray-900">
        {title}
      </Heading2>
      <div className="space-y-3 text-gray-700 leading-relaxed text-[0.95rem]">
        {children}
      </div>
    </article>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1 text-primary-500 shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 w-full">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-accent-200">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-secondary-200/50 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 mb-3">
            Legal
          </p>
          <Heading1 gutter="sm">Privacy Policy</Heading1>
          <Paragraph
            size="lg"
            weight="medium"
            className="text-gray-800 max-w-2xl mt-4 leading-relaxed"
          >
            We take your privacy seriously. This policy explains what data Study
            Buddy AI collects, why we collect it, and how we keep it safe.
          </Paragraph>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-14 md:py-16 space-y-12">

        <Section title="1. Who we are">
          <p>
            Study Buddy AI is an educational technology platform designed to help
            Nigerian secondary school students prepare for the West African Senior
            School Certificate Examination (WAEC) and related assessments. We
            operate the website at{" "}
            <span className="font-medium">Study Buddy AI</span> and related
            messaging services, including a WhatsApp tutoring bot.
          </p>
          <p>
            For any privacy questions contact us at{" "}
            <a
              href="mailto:sbstudybuddy0@gmail.com"
              className="text-primary-600 hover:underline"
            >
              sbstudybuddy0@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>We collect only what is necessary to deliver and improve our service:</p>
          <ul className="space-y-2 mt-2">
            <Li>
              <strong>Account information:</strong> First name, last names, email
              address, and phone number when you register.
            </Li>
            <Li>
              <strong>Study activity:</strong> Questions you attempt, answers you
              submit, topics you practise, mock exam scores, and session timing.
            </Li>
            <Li>
              <strong>AI conversations:</strong> Messages you send to our AI
              tutoring chatbot on the web platform or via WhatsApp.
            </Li>
            <Li>
              <strong>WhatsApp number:</strong> Stored when you use the WhatsApp
              bot so we can link conversations to your account.
            </Li>
            <Li>
              <strong>Usage data:</strong> Pages visited, features used, device
              type, browser, and IP address — collected automatically by our
              hosting infrastructure.
            </Li>
            <Li>
              <strong>Payment information:</strong> Subscription payments are
              processed by Paystack. We do not store card numbers or bank details.
            </Li>
          </ul>
        </Section>

        <Section title="3. How we use your information">
          <ul className="space-y-2">
            <Li>
              Provide your personalised dashboard, progress tracking, and AI study
              recommendations.
            </Li>
            <Li>
              Generate AI tutoring responses via OpenAI (see Section 5).
            </Li>
            <Li>
              Send account emails — email verification, password reset, and
              important service notices.
            </Li>
            <Li>
              Improve our question bank, topic structure, and platform using
              anonymised aggregate data.
            </Li>
            <Li>
              Detect and prevent fraud, abuse, or unauthorised access.
            </Li>
            <Li>
              Comply with applicable Nigerian law and regulatory requirements.
            </Li>
          </ul>
          <p>
            We do <strong>not</strong> sell your personal data to third parties
            and we do not use your data for targeted advertising.
          </p>
        </Section>

        <Section title="4. Data storage and security">
          <p>
            Your data is stored in a PostgreSQL database hosted on Supabase, with
            servers currently located in the European Union. By using Study Buddy
            AI you consent to this international transfer.
          </p>
          <p>We apply industry-standard protections:</p>
          <ul className="space-y-2 mt-2">
            <Li>
              Passwords are never stored in plain text — authentication is handled
              by Supabase Auth with bcrypt hashing.
            </Li>
            <Li>All data in transit is encrypted via HTTPS / TLS.</Li>
            <Li>
              Database access is restricted to application services only; no
              direct public access is permitted.
            </Li>
            <Li>
              We apply the principle of least privilege — each service accesses
              only the data it requires.
            </Li>
          </ul>
          <p>
            No online system is 100% secure. If you suspect unauthorised access
            to your account, contact us immediately.
          </p>
        </Section>

        <Section title="5. Third-party services">
          <p>
            We use the following services to operate the platform. Each has its
            own privacy policy:
          </p>
          <ul className="space-y-2 mt-2">
            <Li>
              <strong>Supabase</strong> — authentication and database hosting.{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Privacy policy ↗
              </a>
            </Li>
            <Li>
              <strong>OpenAI</strong> — powers our AI tutoring chatbot and
              recommendations. Messages you send to the AI are transmitted to
              OpenAI for processing.{" "}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Privacy policy ↗
              </a>
            </Li>
            <Li>
              <strong>Meta (WhatsApp Cloud API)</strong> — if you use our
              WhatsApp tutoring bot, messages pass through Meta&apos;s
              infrastructure.{" "}
              <a
                href="https://www.whatsapp.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Privacy policy ↗
              </a>
            </Li>
            <Li>
              <strong>Paystack</strong> — processes subscription payments. We
              share only what Paystack requires for billing.{" "}
              <a
                href="https://paystack.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Privacy policy ↗
              </a>
            </Li>
            <Li>
              <strong>Vercel</strong> — hosts and serves the web application.
              Vercel receives standard server logs including IP addresses.{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Privacy policy ↗
              </a>
            </Li>
          </ul>
        </Section>

        <Section title="6. Cookies and local storage">
          <p>
            We use session cookies set by Supabase Auth to keep you logged in.
            These are strictly necessary — without them the platform cannot
            function. We do not use third-party tracking cookies or advertising
            cookies.
          </p>
        </Section>

        <Section title="7. Children&apos;s privacy">
          <p>
            Study Buddy AI is designed for secondary school students, some of
            whom may be under 18. We do not knowingly collect more personal data
            than is necessary to provide the service. We do not display
            advertising and we do not share student data with advertisers.
          </p>
          <p>
            If you are a parent or guardian and believe your child has provided
            personal data without your consent, contact us at{" "}
            <a
              href="mailto:sbstudybuddy0@gmail.com"
              className="text-primary-600 hover:underline"
            >
              sbstudybuddy0@gmail.com
            </a>{" "}
            and we will delete the data promptly.
          </p>
        </Section>

        <Section title="8. Your rights">
          <p>You have the right to:</p>
          <ul className="space-y-2 mt-2">
            <Li>
              <strong>Access</strong> — request a copy of the personal data we
              hold about you.
            </Li>
            <Li>
              <strong>Correction</strong> — ask us to correct inaccurate data.
            </Li>
            <Li>
              <strong>Deletion</strong> — request that we delete your account and
              all associated data.
            </Li>
            <Li>
              <strong>Objection</strong> — object to processing you believe is
              unlawful.
            </Li>
            <Li>
              <strong>Portability</strong> — receive your study history and
              account data in a machine-readable format.
            </Li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a
              href="mailto:sbstudybuddy0@gmail.com"
              className="text-primary-600 hover:underline"
            >
              sbstudybuddy0@gmail.com
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="9. Data retention">
          <p>
            We retain your account data for as long as your account is active. If
            you delete your account we will remove your personal information
            within 30 days, except where we are required by law to retain certain
            records.
          </p>
          <p>
            Anonymised, aggregated study statistics (e.g. pass rates per topic)
            may be retained indefinitely to improve the platform.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. When we do, we will
            update the &ldquo;Last updated&rdquo; date at the top of this page
            and, for material changes, notify you by email. Continued use of
            Study Buddy AI after the effective date constitutes your acceptance of
            the revised policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>For privacy-related questions or requests:</p>
          <div className="rounded-xl border border-accent-200 bg-accent-50/80 p-5 mt-2 text-sm space-y-1">
            <p className="font-semibold text-gray-900">Study Buddy AI</p>
            <p>
              Email:{" "}
              <a
                href="mailto:sbstudybuddy0@gmail.com"
                className="text-primary-600 hover:underline"
              >
                sbstudybuddy0@gmail.com
              </a>
            </p>
            <p>Nigeria</p>
          </div>
        </Section>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-accent-200">
          <Link href="/contact-us">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Contact us
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Create an account
            </Button>
          </Link>
        </div>

      </div>
    </main>
  );
}
