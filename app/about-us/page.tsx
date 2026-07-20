import Link from "next/link";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";

export default function AboutUsPage() {
  return (
    <main className="flex-1 w-full">
      <section className="relative overflow-hidden border-b border-accent-200">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-secondary-200/50 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 mb-3">
            Our story
          </p>
          <Heading1 gutter="sm">About us</Heading1>
          <Paragraph
            size="lg"
            weight="medium"
            className="text-gray-800 max-w-2xl mt-4 leading-relaxed"
          >
            Study Buddy AI is designed to make learning simple, affordable, and
            accessible for every student.
          </Paragraph>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-14 md:py-16 space-y-12">
        <article className="relative pl-5 md:pl-8 border-l-[3px] border-primary-400">
          <Paragraph className="text-gray-700 leading-relaxed text-lg">
            We understand that not everyone has access to great teachers or
            expensive tutoring. That&apos;s why we built a platform where
            students can ask questions, get clear explanations, and study at
            their own pace — anytime.
          </Paragraph>
        </article>

        <article className="rounded-2xl border border-accent-200 bg-accent-50/80 p-6 md:p-8 shadow-sm">
          <Heading2 size="md" gutter="sm" className="text-primary-700">
            Exams &amp; peace of mind
          </Heading2>
          <Paragraph variant="muted" className="leading-relaxed text-base">
            Our focus is helping Nigerian secondary school students prepare for
            WAEC and related exams, while creating a learning experience that is
            stress-free and easy to use.
          </Paragraph>
        </article>

        <article className="text-center md:text-left">
          <Paragraph
            size="lg"
            weight="medium"
            className="text-gray-900 leading-relaxed max-w-2xl mx-auto md:mx-0"
          >
            At its core, Study Buddy is about giving every student a fair chance
            to succeed, no matter their background.
          </Paragraph>
        </article>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
          <Link href="/sign-up">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Get started
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </div>

      <section
        className="mt-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white"
        aria-label="Call to action"
      >
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <Heading2
              color="foreground"
              className="!text-white mb-2"
              gutter="none"
            >
              Ready to study smarter?
            </Heading2>
            <Paragraph gutter="none" className="text-primary-100 max-w-md">
              Explore materials, practice mocks, and ask the AI whenever you are
              stuck.
            </Paragraph>
          </div>
          <Link href="/sign-up" className="shrink-0">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-primary-700 hover:bg-primary-50 border-0"
            >
              Start learning
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
