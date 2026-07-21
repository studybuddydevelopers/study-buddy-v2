import Link from "next/link";
import { redirect } from "next/navigation";
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
    },
  });

  const displayName = profile
    ? [profile.firstName, profile.middleNames, profile.lastNames]
        .filter(Boolean)
        .join(" ")
    : "Your profile";

  return (
    <div className="w-[90vw] max-w-3xl mx-auto py-10 space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary-600">Account</p>
        <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
        {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
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
