"use client";

import { useState } from "react";

import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Heading6 from "@/components/Heading6";
import Paragraph from "@/components/Paragraph";
import Image from "@/components/Image";
import Card from "@/components/Card";

import { PiGraduationCapLight, PiShieldCheck } from "react-icons/pi";
import { HiOutlinePresentationChartBar, HiOutlineUserGroup } from "react-icons/hi";

export default function ClientLanding() {
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingLearn, setLoadingLearn] = useState(false);

  const handleStart = () => {
    setLoadingStart(true);
    setTimeout(() => {
      window.location.href = "/sign-up";
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
          <div className="text-left w-1/2">
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
          <div className="flex">
            <Image
              src="https://picsum.photos/600/600"
              alt="Students studying"
              rounded="xl"
              shadow="md"
              className="w-full min-w-[-webkit-fill-available]"
            />
          </div>
        </section>

        {/* WHY CHOOSE SECTION */}
        <section className="mt-28">
          <Heading1 align="center" gutter="md" className="mb-10">
            Why Choose Study Buddy?
          </Heading1>

          <div className="flex gap-6 justify-center flex-wrap lg:w-max left-[-3em] position-relative">

            {/* Card 1 */}
            <Card className="w-fit" padding="xs" shadow="sm" hover>
              <div className="flex items-center justify-center w-14 h-14 rounded-lg mb-4">
                <PiGraduationCapLight strokeWidth={10} size={40} />
              </div>

              <Heading6 gutter="sm" weight="bold" className="text-left">
                Personalized Study Plans
              </Heading6>

              <Paragraph variant="superMuted" className="w-56 text-left">
                Get a study plan tailored to your learning style and pace, ensuring 
                you cover all the necessary material effectively.
              </Paragraph>
            </Card>

            {/* Card 2 */}
            <Card className="w-fit" padding="xs" shadow="sm" hover>
              <div className="flex items-center justify-center w-14 h-14 rounded-lg mb-4">
                <HiOutlinePresentationChartBar size={40} />
              </div>

              <Heading6 gutter="sm" weight="bold" className="max-w-48 text-left">
                Comprehensive Practice Tests
              </Heading6>

              <Paragraph variant="superMuted" className="w-56 text-left">
                Take full-length WAEC practice exams that replicate test-day conditions,
                empowering you to build confidence, track progress, and improve your score.
              </Paragraph>
            </Card>

            {/* Card 3 */}
            <Card className="w-fit" padding="xs" shadow="sm" hover>
              <div className="flex items-center justify-center w-14 h-14 rounded-lg mb-4">
                <HiOutlineUserGroup size={40} />
              </div>

              <Heading6 gutter="sm" weight="bold" className="text-left">
                Expert Guidance
              </Heading6>

              <Paragraph variant="superMuted" className="w-56 text-left">
                Connect with experienced tutors and mentors who can provide 
                valuable insights and support throughout your preparation journey.
              </Paragraph>
            </Card>

            {/* Card 4 */}
            <Card className="w-fit" padding="xs" shadow="sm" hover>
              <div className="flex items-center justify-center w-14 h-14 rounded-lg mb-4">
                <PiShieldCheck strokeWidth={5} size={40} />
              </div>

              <Heading6 gutter="sm" weight="bold" className="text-left">
                Secure and Reliable
              </Heading6>

              <Paragraph variant="superMuted" className="mt-2 w-56 text-left">
                Our platform is built with security in mind, ensuring your data is 
                protected and your learning experience is seamless and reliable.
              </Paragraph>
            </Card>

          </div>
        </section>
      </div>
    </>
  );
}
