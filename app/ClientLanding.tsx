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
            <div className="mt-8 flex flex-col gap-4 min-[426px]:flex-row">
              <Button
                variant="primary"
                size="lg"
                loading={loadingStart}
                disabled={loadingStart}
                onClick={handleStart}
                className="w-full rounded-3xl min-[426px]:w-auto"
              >
                Get Started
              </Button>

              <Button
                variant="neutral"
                size="md"
                loading={loadingLearn}
                disabled={loadingLearn}
                onClick={handleLearn}
                className="w-full rounded-3xl pl-6 pr-6 min-[426px]:w-auto"
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

          <div className="space-y-7">

            {/* Card 1 */}
            <Card className="w-full !max-w-none overflow-hidden" padding="none" shadow="sm" hover>
              <div className="flex flex-col md:min-h-72 md:flex-row">
                <div className="flex items-center justify-center bg-primary-50 p-4 sm:p-6 md:w-[46%]">
                  <Image
                    src="/images/study-plan.svg"
                    alt="Student selecting activities for a personalised study plan"
                    width={3000}
                    height={2250}
                    rounded="none"
                    className="!h-auto !w-full !object-contain"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 md:py-10">
                  <Heading6 gutter="sm" weight="bold" className="text-left">
                    Personalized Study Plans
                  </Heading6>

                  <Paragraph variant="superMuted" className="max-w-xl text-left">
                    Get a study plan tailored to your learning style and pace, ensuring
                    you cover all the necessary material effectively.
                  </Paragraph>
                </div>
              </div>
            </Card>

            {/* Card 2 */}
            <Card className="w-full !max-w-none overflow-hidden" padding="none" shadow="sm" hover>
              <div className="flex flex-col md:min-h-72 md:flex-row-reverse">
                <div className="flex items-center justify-center bg-primary-50 p-4 sm:p-6 md:w-[46%]">
                  <Image
                    src="/images/practice-tests.svg"
                    alt="Student completing a timed online practice test"
                    width={3000}
                    height={2250}
                    rounded="none"
                    className="!h-auto !w-full !object-contain"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 md:py-10">
                  <Heading6 gutter="sm" weight="bold" className="text-left">
                    Comprehensive Practice Tests
                  </Heading6>

                  <Paragraph variant="superMuted" className="max-w-xl text-left">
                    Take full-length WAEC practice exams that replicate test-day conditions,
                    empowering you to build confidence, track progress, and improve your score.
                  </Paragraph>
                </div>
              </div>
            </Card>

            {/* Card 3 */}
            <Card className="w-full !max-w-none overflow-hidden" padding="none" shadow="sm" hover>
              <div className="flex flex-col md:min-h-72 md:flex-row">
                <div className="flex items-center justify-center bg-primary-50 p-4 sm:p-6 md:w-[46%]">
                  <Image
                    src="/images/expert-guidance.svg"
                    alt="Student following a guidance pathway towards success"
                    width={3000}
                    height={2250}
                    rounded="none"
                    className="!h-auto !w-full !object-contain"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 md:py-10">
                  <Heading6 gutter="sm" weight="bold" className="text-left">
                    Expert Guidance
                  </Heading6>

                  <Paragraph variant="superMuted" className="max-w-xl text-left">
                    Connect with experienced tutors and mentors who can provide
                    valuable insights and support throughout your preparation journey.
                  </Paragraph>
                </div>
              </div>
            </Card>

          </div>
        </section>
      </div>
    </>
  );
}
