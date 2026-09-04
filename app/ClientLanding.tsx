"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Heading6 from "@/components/Heading6";
import Paragraph from "@/components/Paragraph";
import Image from "@/components/Image";
import Card from "@/components/Card";

export default function ClientLanding() {
  const router = useRouter();
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingLearn, setLoadingLearn] = useState(false);

  const handleStart = () => {
    setLoadingStart(true);
    setTimeout(() => {
      router.push("/sign-up");
    }, 600);
  };

  const handleLearn = () => {
    setLoadingLearn(true);
    setTimeout(() => {
      setLoadingLearn(false);
    }, 600);
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-6 py-10">

        {/* HERO SECTION */}
        <section className="flex flex-col-reverse lg:flex-row-reverse items-center gap-12 mt-10">

          {/* Text Section */}
          <div className="w-full text-left lg:w-1/2">
            <Heading1>Ace your WAEC exams with Study Buddy</Heading1>

            <Paragraph size="lg">
              Prepare for your WAEC exams with our AI-powered learning platform. Get personalised study plans,
              realistic WAEC-style practice tests, and expert guidance designed to help Nigerian secondary school
              students master Mathematics and beyond. Study smarter, track your progress, and walk into
              exam day with confidence.
            </Paragraph>

            {/* Buttons */}
            <div className="flex gap-4 mt-8">
              <Button
                variant="primary"
                size="lg"
                loading={loadingStart}
                disabled={loadingStart}
                onClick={handleStart}
                className="rounded-3xl"
              >
                Get Started
              </Button>

              <Button
                variant="neutral"
                size="md"
                loading={loadingLearn}
                disabled={loadingLearn}
                onClick={handleLearn}
                className="rounded-3xl pl-6 pr-6"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Illustration */}
          <div className="flex w-full items-center justify-center rounded-3xl bg-primary-50 p-3 sm:p-6 lg:w-1/2">
            <Image
              src="/images/study-buddy-students.svg"
              alt="Two smiling Study Buddy students wearing purple and white shirts"
              width={1265}
              height={948}
              sizes="(min-width: 1024px) 50vw, 100vw"
              widths={[480, 768, 1265]}
              loading="eager"
              fetchPriority="high"
              rounded="xl"
              shadow="none"
              className="w-full object-contain"
            />
          </div>
        </section>

        {/* WHY CHOOSE SECTION */}
        <section className="mt-28">
          <Heading1 align="center" gutter="md" className="mb-10">
            Why Choose Study Buddy?
          </Heading1>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {/* Card 1 */}
            <Card className="h-full w-full" padding="xs" shadow="sm" hover>
              <Image
                src="/icon-audit/proposal-source/study-plan"
                alt="Student selecting activities for a personalised study plan"
                width={3000}
                height={2250}
                rounded="xl"
                className="mb-5 !h-40 !w-full bg-primary-50 object-contain"
              />

              <Heading6 gutter="sm" weight="bold" className="text-left">
                Personalized Study Plans
              </Heading6>

              <Paragraph variant="superMuted" className="text-left">
                Get a study plan tailored to your learning style and pace, ensuring 
                you cover all the necessary material effectively.
              </Paragraph>
            </Card>

            {/* Card 2 */}
            <Card className="h-full w-full" padding="xs" shadow="sm" hover>
              <Image
                src="/icon-audit/proposal-source/practice-tests"
                alt="Student completing a timed online practice test"
                width={3000}
                height={2250}
                rounded="xl"
                className="mb-5 !h-40 !w-full bg-primary-50 object-contain"
              />

              <Heading6 gutter="sm" weight="bold" className="max-w-48 text-left">
                Comprehensive Practice Tests
              </Heading6>

              <Paragraph variant="superMuted" className="text-left">
                Take full-length WAEC practice exams that replicate test-day conditions,
                empowering you to build confidence, track progress, and improve your score.
              </Paragraph>
            </Card>

            {/* Card 3 */}
            <Card className="h-full w-full" padding="xs" shadow="sm" hover>
              <Image
                src="/icon-audit/proposal-source/expert-guidance"
                alt="Student following a guidance pathway towards success"
                width={3000}
                height={2250}
                rounded="xl"
                className="mb-5 !h-40 !w-full bg-primary-50 object-contain"
              />

              <Heading6 gutter="sm" weight="bold" className="text-left">
                Expert Guidance
              </Heading6>

              <Paragraph variant="superMuted" className="text-left">
                Connect with experienced tutors and mentors who can provide 
                valuable insights and support throughout your preparation journey.
              </Paragraph>
            </Card>

          </div>
        </section>
      </div>
    </>
  );
}
