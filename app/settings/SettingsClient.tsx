import Link from "next/link";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";

const sections: Array<{
  title: string;
  description: string;
  href: string;
  icon: StudyBuddyIconName;
  tone?: "danger";
}> = [
  {
    title: "Profile details",
    description:
      "Update your name, phone number, school level, exam year and preferred subjects.",
    href: "/settings/profile",
    icon: "profile",
  },
  {
    title: "Study preferences",
    description:
      "Choose how practice drafts sync and reduce data use on slower connections.",
    href: "/settings/study-preferences",
    icon: "practice",
  },
  {
    title: "Account management",
    description:
      "Deactivate your account or begin the protected permanent-deletion process.",
    href: "/settings/account",
    icon: "shield",
    tone: "danger",
  },
];

const supportLinks = [
  {
    title: "Privacy and your data",
    description: "Read your privacy rights and learn how to make a request.",
    href: "/privacy-policy",
  },
  {
    title: "Contact Study Buddy",
    description: "Get help with an account or learning issue.",
    href: "/contact-us",
  },
  {
    title: "Terms of Service",
    description: "Review the rules that apply to your account.",
    href: "/terms-of-service",
  },
];

export default function SettingsClient() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 py-4 pb-24 sm:py-8 lg:pb-8">
      <header className="rounded-3xl border border-[#E4D6EA] bg-[#F7F0FA] p-5 sm:p-8">
        <Link
          href="/profile"
          className="text-sm font-bold text-[#6C3483] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
        >
          Back to profile
        </Link>
        <div className="mt-5 flex items-center gap-4">
          <StudyBuddyIcon
            name="settings"
            size={72}
            title="Settings"
            className="shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-[#6C3483]">Your account</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Manage the details, learning preferences and safety controls tied
              to your Study Buddy account.
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="settings-sections-heading">
        <div className="mb-4">
          <h2
            id="settings-sections-heading"
            className="text-xl font-bold text-gray-950"
          >
            Account settings
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose the area you want to review or change.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
            const danger = section.tone === "danger";
            return (
              <Link
                key={section.href}
                href={section.href}
                className={`group flex min-h-44 flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  danger
                    ? "border-red-200 hover:border-red-300 focus-visible:outline-red-500"
                    : "border-gray-200 hover:border-[#C7A6D5] focus-visible:outline-[#6C3483]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <StudyBuddyIcon name={section.icon} size={64} />
                  <StudyBuddyIcon
                    name="chevron"
                    size={26}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
                <h3
                  className={`mt-4 text-lg font-bold ${
                    danger ? "text-red-800" : "text-gray-950"
                  }`}
                >
                  {section.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {section.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="help-and-policies-heading"
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2
          id="help-and-policies-heading"
          className="text-xl font-bold text-gray-950"
        >
          Help, privacy and policies
        </h2>
        <div className="mt-4 divide-y divide-gray-200">
          {supportLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-20 items-center justify-between gap-4 py-4 first:pt-1 last:pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
            >
              <div>
                <h3 className="font-bold text-gray-950 group-hover:text-[#6C3483]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              </div>
              <StudyBuddyIcon
                name="chevron"
                size={24}
                className="shrink-0 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
