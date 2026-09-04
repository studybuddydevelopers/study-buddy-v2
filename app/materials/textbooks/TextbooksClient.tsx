"use client";

import Link from "next/link";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
import type { MaterialsSubjectSection } from "../materials.types";

const TEXTBOOK_COLLECTIONS: {
  title: string;
  description: string;
  href: string;
}[] = [
  {
    title: "Most Popular",
    description: "Frequently used textbook picks for the subject.",
    href: "/materials/textbooks/most-popular",
  },
  {
    title: "Community Favourite",
    description: "Textbooks learners and tutors recommend most.",
    href: "/materials/textbooks/community-favourite",
  },
  {
    title: "Others",
    description: "Additional textbook options and references.",
    href: "/materials/textbooks/others",
  },
];

export default function TextbooksClient({
  subjects,
}: {
  subjects: MaterialsSubjectSection[];
}) {
  return (
    <div className="w-[90vw] max-w-6xl mx-auto py-10 space-y-10">
      <div className="space-y-10">
        <div>
          <Link
            href="/materials"
            prefetch={false}
            className="text-sm font-semibold text-primary-600 hover:underline"
          >
            Back to materials
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-normal text-gray-900">
            Textbooks
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Choose a subject, then pick a textbook collection.
          </p>
        </div>

        {subjects.length === 0 ? (
          <p className="rounded-lg border border-accent-200 bg-white p-4 text-sm text-gray-600">
            No subjects are configured yet.
          </p>
        ) : (
          <div className="space-y-10">
            {subjects.map((subject) => (
              <section key={subject.id} className="space-y-4">
                <h2 className="text-2xl font-bold tracking-normal text-gray-900">
                  {subject.displayName}
                </h2>
                <div className="grid gap-5 md:grid-cols-3">
                  {TEXTBOOK_COLLECTIONS.map((collection) => (
                    <CollectionCard
                      key={collection.href}
                      title={collection.title}
                      description={collection.description}
                      href={collection.href}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group min-h-48 rounded-lg border border-accent-200 bg-white p-5 text-gray-900 shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary-50">
            <StudyBuddyIcon name="textbook" size={48} />
          </div>
          <StudyBuddyIcon
            name="chevron"
            size={24}
            className="transition group-hover:translate-x-0.5"
          />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-normal">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
        </div>
      </div>
    </Link>
  );
}
