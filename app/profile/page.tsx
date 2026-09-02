import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "@/components/Image";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const auth = await requireUser();
  if ("errorResponse" in auth) redirect("/unauthorized");

  const { dbUser, user } = auth;
  const profile = await prisma.userProfile.findUnique({
    where: { userId: dbUser.id },
    select: {
      firstName: true,
      middleNames: true,
      lastNames: true,
      gradeLevel: true,
      examYear: true,
      avatarUrl: true,
    },
  });

  const displayName = profile
    ? [profile.firstName, profile.middleNames, profile.lastNames]
        .filter(Boolean)
        .join(" ")
    : "Your profile";

  return (
    <div className="w-[90vw] max-w-3xl mx-auto py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Image
          src={profile?.avatarUrl || "/images/profile-avatar.svg"}
          alt={`${displayName} profile avatar`}
          width={96}
          height={96}
          sizes="96px"
          widths={[96, 192]}
          rounded="full"
          bordered
          shadow="sm"
          className="!h-24 !w-24 shrink-0 object-cover"
        />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-primary-600">Account</p>
          <h1 className="truncate text-3xl font-bold text-gray-900">
            {displayName}
          </h1>
          {user.email && (
            <p className="truncate text-sm text-gray-600">{user.email}</p>
          )}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/settings"
          className="rounded-lg border border-accent-200 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md"
        >
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Manage cloud drafts and low-data behavior.
          </p>
        </Link>

        <div className="rounded-lg border border-accent-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Study profile</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {profile?.gradeLevel ? `Grade ${profile.gradeLevel}` : "Grade not set"}
            {profile?.examYear ? ` - Exam year ${profile.examYear}` : ""}
          </p>
        </div>
      </section>
    </div>
  );
}
