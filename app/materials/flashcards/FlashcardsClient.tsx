"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MaterialsSubjectSection } from "../materials.types";

const FLASHCARD_COLLECTIONS: {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  color: string;
}[] = [
  {
    title: "Community FlashCards",
    description: "Student and tutor-created flashcard sets.",
    href: "/materials/flashcards/community",
    Icon: MessageCircle,
    color: "#5EEAD4",
  },
  {
    title: "Standard FlashCards",
    description: "Study Buddy reviewed flashcard sets.",
    href: "/materials/flashcards/standard",
    Icon: ClipboardList,
    color: "#38BDF8",
  },
];

export default function FlashcardsClient({
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
            Flashcards
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Choose a subject, then pick a flashcard collection type.
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
                <div className="grid gap-5 md:grid-cols-2">
                  {FLASHCARD_COLLECTIONS.map((collection) => (
                    <CollectionCard
                      key={collection.href}
                      title={collection.title}
                      description={collection.description}
                      href={collection.href}
                      Icon={collection.Icon}
                      color={collection.color}
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
  Icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  color: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group min-h-48 rounded-lg border border-accent-200 bg-white p-5 text-gray-900 shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}2E` }}
          >
            <Icon size={32} style={{ color }} aria-hidden="true" />
          </div>
          <ChevronRight
            size={22}
            className="text-primary-500 transition group-hover:translate-x-0.5"
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
