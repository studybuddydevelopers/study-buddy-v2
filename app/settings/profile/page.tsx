import { redirect } from "next/navigation";
import ProfileDetailsClient from "./ProfileDetailsClient";
import { requireUser } from "@/lib/auth";
import {
  MATERIALS_SUBJECT_LABELS,
  MATERIALS_SUBJECT_ORDER,
} from "@/lib/materials-display";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Profile Details",
  description:
    "Update the personal and study details connected to your Study Buddy account.",
  index: false,
});

export default async function ProfileDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const auth = await requireUser();
  if ("errorResponse" in auth) redirect("/unauthorized");
  const cameFromProfile = (await searchParams).from === "profile";

  const [profile, subjects] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: auth.dbUser.id },
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
    prisma.subject.findMany({
      where: { examCode: { in: [...MATERIALS_SUBJECT_ORDER] } },
      select: { id: true, name: true, examCode: true },
    }),
  ]);

  const order = new Map(
    MATERIALS_SUBJECT_ORDER.map((examCode, index) => [examCode, index])
  );
  subjects.sort(
    (a, b) =>
      (order.get(a.examCode as (typeof MATERIALS_SUBJECT_ORDER)[number]) ?? 99) -
      (order.get(b.examCode as (typeof MATERIALS_SUBJECT_ORDER)[number]) ?? 99)
  );

  return (
    <ProfileDetailsClient
      backHref={cameFromProfile ? "/profile" : "/settings"}
      backLabel={cameFromProfile ? "Back to profile" : "Back to settings"}
      email={auth.user.email ?? ""}
      initialProfile={{
        firstName: profile?.firstName ?? "",
        middleNames: profile?.middleNames ?? "",
        lastNames: profile?.lastNames ?? "",
        phoneNumber: profile?.phoneNumber ?? "",
        gradeLevel: profile?.gradeLevel ?? "",
        examYear: profile?.examYear ?? null,
        preferredSubjects: profile?.preferredSubjects ?? [],
        avatarUrl: profile?.avatarUrl ?? null,
      }}
      subjects={subjects.map((subject) => ({
        id: subject.id,
        name:
          (subject.examCode && MATERIALS_SUBJECT_LABELS[subject.examCode]) ??
          subject.name,
      }))}
    />
  );
}
