import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "@/components/Image";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";
import { requireUser } from "@/lib/auth";
import { MATERIALS_SUBJECT_LABELS } from "@/lib/materials-display";
import { prisma } from "@/lib/prisma";
import { getDailyAiCreditBalance } from "@/lib/security/rate-limit";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Learner Profile",
  description:
    "Review your Study Buddy account, study profile, plan and preferences.",
  index: false,
});

const quickActions: Array<{
  title: string;
  description: string;
  href: string;
  icon: StudyBuddyIconName;
}> = [
  {
    title: "Study preferences",
    description: "Control draft syncing and mobile data use.",
    href: "/settings/study-preferences?from=profile",
    icon: "practice",
  },
  {
    title: "Progress",
    description: "Review your coverage, accuracy and mock results.",
    href: "/progress",
    icon: "analytics",
  },
];

function formatPlan(plan: string | undefined) {
  if (!plan) return "Free";
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-gray-900">
        {value}
      </dd>
    </div>
  );
}

export default async function ProfilePage() {
  const auth = await requireUser();
  if ("errorResponse" in auth) redirect("/unauthorized");

  const { dbUser, user } = auth;
  const [profile, settings, subscription, aiCredits, subjects] =
    await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: dbUser.id },
        select: {
          firstName: true,
          middleNames: true,
          lastNames: true,
          phoneNumber: true,
          gradeLevel: true,
          examYear: true,
          preferredSubjects: true,
          avatarUrl: true,
        },
      }),
      prisma.userSettings.findUnique({ where: { userId: dbUser.id } }),
      prisma.subscription.findFirst({
        where: { userId: dbUser.id },
        orderBy: { startDate: "desc" },
        select: { plan: true, status: true },
      }),
      getDailyAiCreditBalance(dbUser.id),
      prisma.subject.findMany({
        select: { id: true, name: true, examCode: true },
      }),
    ]);

  const displayName = profile
    ? [profile.firstName, profile.middleNames, profile.lastNames]
        .filter(Boolean)
        .join(" ")
    : "Your profile";
  const subjectNamesById = new Map(
    subjects.map((subject) => [
      subject.id,
      (subject.examCode && MATERIALS_SUBJECT_LABELS[subject.examCode]) ??
        subject.name,
    ])
  );
  const preferredSubjects = (profile?.preferredSubjects ?? []).map(
    (subjectId) => subjectNamesById.get(subjectId) ?? subjectId
  );
  const planLabel = formatPlan(subscription?.plan);
  const planStatus = subscription?.status ?? "active";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 py-4 pb-24 sm:py-8 lg:pb-8">
      <header className="overflow-hidden rounded-3xl bg-[#3B2A56] text-white shadow-sm">
        <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#6C3483]/55"
            aria-hidden="true"
          />
          <div className="relative w-fit self-center rounded-full bg-white p-1.5 shadow-lg sm:self-auto">
            <Image
              src={profile?.avatarUrl || "/images/profile-avatar.svg"}
              alt={`${displayName} profile avatar`}
              width={112}
              height={112}
              sizes="112px"
              widths={[112, 224]}
              rounded="full"
              className="!h-28 !w-28 object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>

          <div className="relative min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#E9D8F0]">
              Learner profile
            </p>
            <h1 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl">
              {displayName}
            </h1>
            {user.email ? (
              <p className="mt-2 break-all text-sm text-white/80">
                {user.email}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/[0.12] px-3 py-1.5 text-xs font-semibold text-white">
                {profile?.gradeLevel || "School level not set"}
              </span>
              <span className="rounded-full bg-white/[0.12] px-3 py-1.5 text-xs font-semibold text-white">
                {profile?.examYear
                  ? `WAEC ${profile.examYear}`
                  : "Exam year not set"}
              </span>
            </div>
          </div>

          <div className="relative grid w-full shrink-0 gap-2 sm:w-40">
            <Link
              href="/settings/profile?from=profile"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#3B2A56] transition hover:bg-[#F7F0FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Edit profile
            </Link>
            <Link
              href="/settings"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/60 bg-white/[0.08] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      <section aria-labelledby="account-overview-heading">
        <div className="mb-4">
          <h2
            id="account-overview-heading"
            className="text-xl font-bold text-gray-950"
          >
            Account overview
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            The essentials for your current Study Buddy account.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Current plan</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">{planLabel}</p>
            <p className="mt-1 text-xs font-semibold capitalize text-green-700">
              {planStatus}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">AI credits today</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-gray-950">
              {dbUser.aiAccessAuthorized
                ? `${aiCredits.remaining} / ${aiCredits.limit}`
                : "Not enabled"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {dbUser.aiAccessAuthorized
                ? "Resets daily"
                : "AI access requires authorisation"}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Low Data Mode</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">
              {settings?.lowDataModeEnabled ? "On" : "Off"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {settings?.cloudPracticeDraftsEnabled
                ? settings.lowDataModeEnabled
                  ? "Cloud drafts paused"
                  : "Cloud drafts enabled"
                : "Local drafts only"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
        <section
          aria-labelledby="study-profile-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="study-profile-heading"
                className="text-xl font-bold text-gray-950"
              >
                Personal and study details
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                These details help Study Buddy organise your learning experience.
              </p>
            </div>
            <Link
              href="/settings/profile?from=profile"
              className="text-sm font-bold text-[#6C3483] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
            >
              Update details
            </Link>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <Detail
              label="School level"
              value={profile?.gradeLevel || "Not set"}
            />
            <Detail
              label="Target exam year"
              value={profile?.examYear ? String(profile.examYear) : "Not set"}
            />
            <Detail
              label="Phone number"
              value={profile?.phoneNumber || "Not set"}
            />
            <Detail
              label="Preferred subjects"
              value={
                preferredSubjects.length > 0
                  ? preferredSubjects.join(", ")
                  : "Not selected"
              }
            />
          </dl>
        </section>

        <section aria-labelledby="quick-actions-heading" className="space-y-3">
          <div>
            <h2
              id="quick-actions-heading"
              className="text-xl font-bold text-gray-950"
            >
              Quick actions
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Go straight to the part of your account you need.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#C7A6D5] hover:bg-[#FCF9FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3483]"
              >
                <StudyBuddyIcon
                  name={action.icon}
                  size={58}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-950">{action.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    {action.description}
                  </p>
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
      </div>
    </main>
  );
}
