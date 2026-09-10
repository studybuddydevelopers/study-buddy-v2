import Link from "next/link";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";

const sections: Array<{
  title: string;
  description: string;
  href: string;
  icon: StudyBuddyIconName;
}> = [
  {
    title: "Study preferences",
    description:
      "Manage cloud-saved drafts, question images, and low-data mode.",
    href: "/settings/study-preferences",
    icon: "practice",
  },
  {
    title: "Account management",
    description:
      "Deactivate your account or request permanent account deletion.",
    href: "/settings/account",
    icon: "shield",
  },
];

export default function SettingsClient() {
  return (
    <main className="mx-auto w-[90vw] max-w-3xl space-y-7 py-10">
      <div className="space-y-3">
        <Link
          href="/profile"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Back to profile
        </Link>
        <div className="flex items-center gap-4">
          <StudyBuddyIcon name="settings" size={64} title="Settings" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Choose a section to manage your Study Buddy experience.
            </p>
          </div>
        </div>
      </div>

      <section
        className="grid gap-4 sm:grid-cols-2"
        aria-label="Settings sections"
      >
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex min-h-48 flex-col rounded-2xl border border-accent-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          >
            <div className="flex items-start justify-between gap-3">
              <StudyBuddyIcon name={section.icon} size={56} />
              <StudyBuddyIcon
                name="chevron"
                size={28}
                className="transition-transform group-hover:translate-x-1"
              />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-gray-900">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {section.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
