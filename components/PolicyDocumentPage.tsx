import Link from "next/link";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";

export interface PolicyDocumentSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface PolicyDocumentPageProps {
  title: string;
  eyebrow: string;
  introduction: string;
  icon: StudyBuddyIconName;
  lastUpdated: string;
  sections: PolicyDocumentSection[];
}

const CONTACT_EMAIL = "sbstudybuddy0@gmail.com";

export default function PolicyDocumentPage({
  title,
  eyebrow,
  introduction,
  icon,
  lastUpdated,
  sections,
}: Readonly<PolicyDocumentPageProps>) {
  return (
    <main className="flex-1 w-full">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1fr_320px] lg:items-end lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
              <StudyBuddyIcon name={icon} size={22} />
              {eyebrow}
            </div>
            <Heading1 gutter="sm">{title}</Heading1>
            <Paragraph
              size="lg"
              weight="medium"
              className="max-w-3xl leading-relaxed text-gray-800"
            >
              {introduction}
            </Paragraph>
          </div>

          <div className="rounded-lg border border-gray-200 bg-accent-50 p-5">
            <p className="text-xs font-semibold uppercase text-primary-600">
              Last updated
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {lastUpdated}
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline"
            >
              <StudyBuddyIcon name="mail" size={22} />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <nav
            aria-label={`${title} sections`}
            className="sticky top-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="mb-3 text-xs font-semibold uppercase text-gray-500">
              On this page
            </p>
            <ul className="space-y-2 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-gray-700 transition hover:text-primary-700 hover:underline"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-5 py-2 shadow-sm sm:px-8">
          {sections.map((section, index) => (
            <section
              id={section.id}
              key={section.id}
              className="scroll-mt-24 border-b border-gray-200 py-8"
            >
              <Heading2 size="sm" gutter="sm">
                {index + 1}. {section.title}
              </Heading2>
              <div className="space-y-4 text-[0.95rem] leading-relaxed text-gray-700 [&_a]:font-medium [&_a]:text-primary-600 [&_a:hover]:underline [&_li]:pl-1 [&_strong]:text-gray-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {section.content}
              </div>
            </section>
          ))}

          <div className="flex flex-col gap-3 py-8 sm:flex-row">
            <Link
              href="/contact-us"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 font-semibold text-white transition hover:bg-primary-700"
            >
              <StudyBuddyIcon name="support" size={22} />
              Contact us
            </Link>
            <Link
              href="/privacy-policy"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary-600 px-5 py-3 font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              Read our Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
