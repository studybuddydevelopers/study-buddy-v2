import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import Image from "@/components/Image";

const productAreas = [
  {
    title: "Practice that feels close to exam day",
    description:
      "Students can work through topic-based past questions and mock exams while Study Buddy records scores, timing, and progress.",
    icon: BookOpen,
  },
  {
    title: "A chat space for study support",
    description:
      "The current AI chat keeps conversation history and helps students reason through questions. Grounded resource-backed tutoring stays disabled until it passes validation.",
    icon: MessageCircle,
  },
  {
    title: "Progress that is easy to read",
    description:
      "The dashboard and progress page show what a learner has practised, where they are improving, and where they should return next.",
    icon: BarChart3,
  },
];

const principles = [
  "Useful on low-bandwidth connections",
  "Clear about what the AI can and cannot do",
  "Built around WAEC-style learning workflows",
  "Designed to protect student data and account access",
];

export default function AboutUsPage() {
  return (
    <main className="flex-1 w-full">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
              <Image
                src="/images/proposed-sb-mark.svg"
                alt=""
                className="!h-5 !w-5"
                width={20}
                height={20}
                sizes="20px"
                widths={[20, 40]}
              />
              Study Buddy
            </div>
            <Heading1 gutter="sm">About Study Buddy</Heading1>
            <Paragraph
              size="lg"
              weight="medium"
              className="max-w-2xl leading-relaxed text-gray-800"
            >
              We are building a practical WAEC preparation companion for
              secondary school students who need affordable practice, clearer
              feedback, and a steady way to keep studying.
            </Paragraph>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  icon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
                >
                  Start learning
                </Button>
              </Link>
              <Link href="/materials">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Browse materials
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4">
                <Image
                  src="/images/ai-tutor-avatar.svg"
                  alt="Study Buddy AI tutor avatar"
                  rounded="full"
                  className="!h-14 !w-14 shrink-0 object-cover"
                  width={56}
                  height={56}
                  sizes="56px"
                  widths={[56, 112]}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Study session
                  </p>
                  <p className="text-sm text-gray-600">
                    Practice, review, then keep going.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-primary-50 p-3">
                  <p className="text-sm font-semibold text-primary-800">
                    Number and Numeration
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Topic practice, saved answers, and review after submission.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    Mock exam progress
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-2/3 rounded-full bg-primary-500" />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    AI chat
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Persistent conversations for general study help while
                    grounded tutoring remains under validation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-accent-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-4 md:grid-cols-4">
            {principles.map((principle) => (
              <div
                key={principle}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4"
              >
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium leading-relaxed text-gray-800">
                  {principle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="max-w-3xl">
            <Heading2 gutter="sm">Why we are building it</Heading2>
            <Paragraph className="leading-relaxed text-gray-700">
              Strong tutoring is not evenly available, and exam preparation can
              become expensive quickly. Study Buddy is meant to give students a
              steady place to practise, understand their results, and ask for
              help when they get stuck.
            </Paragraph>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {productAreas.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-accent-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-secondary-600 shadow-sm">
              <Wifi className="h-5 w-5" aria-hidden="true" />
            </div>
            <Heading2 gutter="sm">Built for real student conditions</Heading2>
            <Paragraph className="leading-relaxed text-gray-700">
              Study Buddy is being optimised for students who may study on
              mobile data, shared devices, or slower connections. Low-data
              settings, smaller payloads, and careful loading behaviour are part
              of the product direction.
            </Paragraph>
          </div>
          <div>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-secondary-600 shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <Heading2 gutter="sm">Careful with AI claims</Heading2>
            <Paragraph className="leading-relaxed text-gray-700">
              We are keeping the live chatbot as a persistent general AI study
              assistant. Resource-grounded answers, citations, and advanced
              tutoring modes will only be enabled after they pass safety and
              quality validation.
            </Paragraph>
          </div>
        </div>
      </section>

      <section className="bg-secondary-500 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <Heading2 gutter="sm" className="!text-white">
              Keep building better study habits.
            </Heading2>
            <Paragraph gutter="none" className="text-secondary-100">
              Start with a topic, take a mock exam, or open chat when you need a
              clearer explanation.
            </Paragraph>
          </div>
          <Link href="/dashboard" className="shrink-0">
            <Button
              variant="secondary"
              size="lg"
              className="border border-white bg-white text-secondary-700 hover:bg-secondary-100"
              icon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
            >
              Go to dashboard
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
