"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import type { MaterialsSubjectSection } from "./materials.types";

interface HubCard {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
}

const FEATURED_CARDS: HubCard[] = [
  {
    title: "Past Questions by Topic",
    description: "Practice Mathematics topics from the question bank.",
    href: "/materials/past-questions",
    Icon: ClipboardList,
  },
  {
    title: "Flashcards",
    description: "Community and standard flashcards by subject.",
    href: "/materials/flashcards",
    Icon: MessageCircle,
  },
  {
    title: "Textbooks",
    description: "Most-popular, community-favourite, and other textbooks.",
    href: "/materials/textbooks",
    Icon: BookOpen,
  },
];

export default function MaterialsClient({
  subjects,
}: {
  subjects: MaterialsSubjectSection[];
}) {
  const totalQuestions = subjects.reduce(
    (sum, subject) =>
      sum +
      subject.topics.reduce((topicSum, topic) => topicSum + topic.questionCount, 0),
    0
  );
  const touchedQuestions = subjects.reduce(
    (sum, subject) =>
      sum +
      subject.topics.reduce(
        (topicSum, topic) => topicSum + topic.questionsAttempted,
        0
      ),
    0
  );
  const progressPercentage =
    totalQuestions > 0 ? Math.round((touchedQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="w-[90vw] max-w-6xl mx-auto py-10 space-y-12">
      <div>
        <Heading1 gutter="sm">Study materials</Heading1>
        <Paragraph variant="superMuted" className="max-w-3xl">
          Pick a resource type, then choose a subject. Mathematics is available
          first while more subjects are prepared.
        </Paragraph>
      </div>

      {subjects.length === 0 ? (
        <Paragraph variant="muted">
          No subjects are configured yet. Run{" "}
          <code className="text-sm bg-accent-50 px-1 rounded">
            npx prisma db seed
          </code>{" "}
          after migrating so topics appear here.
        </Paragraph>
      ) : (
        <>
          <section className="space-y-5">
            <Heading2 gutter="sm">Ongoing</Heading2>
            <div className="grid gap-4 lg:grid-cols-3">
              <OngoingCard
                title="Mathematics Past Questions"
                href="/materials/past-questions"
                Icon={ClipboardList}
                completed={touchedQuestions}
                total={totalQuestions}
                progressPercentage={progressPercentage}
              />
              <OngoingCard
                title="Mathematics Flashcards"
                href="/materials/flashcards"
                Icon={MessageCircle}
                completed={0}
                total={0}
                progressPercentage={0}
              />
              <OngoingCard
                title="Mathematics Textbooks"
                href="/materials/textbooks"
                Icon={BookOpen}
                completed={0}
                total={0}
                progressPercentage={0}
              />
            </div>
          </section>

          <section className="space-y-5">
            <Heading2 gutter="sm">Featured</Heading2>
            <div className="grid gap-5 md:grid-cols-3">
              {FEATURED_CARDS.map((card) => (
                <FeaturedCard key={card.href} card={card} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function OngoingCard({
  title,
  href,
  Icon,
  completed,
  total,
  progressPercentage,
}: {
  title: string;
  href: string;
  Icon: LucideIcon;
  completed: number;
  total: number;
  progressPercentage: number;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="grid min-h-28 grid-cols-[80px_1fr] gap-4 rounded-lg border border-accent-200 bg-white p-3 text-gray-900 shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary-50">
        <Icon size={40} className="text-primary-500" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-bold text-gray-900">{title}</h3>
          <ChevronRight size={18} className="shrink-0 text-primary-500" />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-accent-100">
          <div
            className="h-full rounded-full bg-primary-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm font-semibold text-gray-600">
          <span>Total Progress</span>
          <span className="tabular-nums">
            {completed} / {total}
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedCard({ card }: { card: HubCard }) {
  const { title, description, href, Icon } = card;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative min-h-64 overflow-hidden rounded-lg border border-accent-200 bg-white p-5 text-gray-900 shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex h-full min-h-56 flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-normal">{title}</h3>
          <p className="mt-3 max-w-64 text-sm font-medium leading-6 text-gray-600">
            {description}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary-50 ring-1 ring-primary-100">
            <Icon size={44} className="text-primary-500" aria-hidden="true" />
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-primary-500 transition group-hover:bg-primary-500 group-hover:text-background">
            <ChevronRight size={22} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="absolute bottom-8 right-9 h-28 w-3 rotate-45 bg-primary-100" />
      <div className="absolute right-16 top-24 h-20 w-3 -rotate-45 bg-secondary-100" />
    </Link>
  );
}
