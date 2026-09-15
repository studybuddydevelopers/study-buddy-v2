import Link from "next/link";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
import { EXAM_CATEGORIES } from "./exam-categories";

export default function MockExamsHub() {
  return (
    <div className="mx-auto w-[90vw] max-w-6xl space-y-10 py-10">
      <div>
        <Heading1 gutter="sm">Mock exams</Heading1>
        <Paragraph variant="superMuted" className="max-w-3xl">
          Choose a full WAEC-format mock or match a shorter practice session to
          the time and energy you have today.
        </Paragraph>
      </div>

      <section className="space-y-5" aria-labelledby="exam-options-heading">
        <Heading2 id="exam-options-heading" gutter="sm">
          Choose your session
        </Heading2>
        <div className="grid gap-5 md:grid-cols-2">
          {Object.entries(EXAM_CATEGORIES).map(([slug, category]) => (
            <Link
              key={slug}
              href={`/exams/category/${slug}`}
              prefetch={false}
              className="group relative min-h-64 overflow-hidden rounded-lg border border-accent-200 bg-white p-5 text-gray-900 shadow-sm transition hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex h-full min-h-56 flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-normal">
                    {category.title}
                  </h3>
                  <p className="mt-3 max-w-72 text-sm font-medium leading-6 text-gray-600">
                    {category.cardDescription}
                  </p>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary-50 ring-1 ring-primary-100">
                    <StudyBuddyIcon name={category.icon} size={56} />
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-primary-500 transition group-hover:bg-primary-500 group-hover:text-background">
                    <StudyBuddyIcon name="chevron" size={24} />
                  </span>
                </div>
              </div>

              <div className="absolute bottom-8 right-9 h-28 w-3 rotate-45 bg-primary-100" />
              <div className="absolute right-16 top-24 h-20 w-3 -rotate-45 bg-secondary-100" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
