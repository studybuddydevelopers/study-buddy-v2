"use client";

import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Heading3 from "@/components/Heading3";
import Paragraph from "@/components/Paragraph";
import Small from "@/components/Small";
import Caption from "@/components/Caption";

const LOREM =
  "Study Buddy helps you prepare for WAEC with step-by-step explanations, mock exams, and personalized recommendations so you can focus on the topics that matter most.";

export default function TypographyDemo() {
  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Typography Demo</Heading1>

      {/* Section: Basic paragraph scale */}
      <section className="space-y-4">
        <Heading2 gutter="md">Paragraph scale</Heading2>
        <Paragraph size="sm">(sm) {LOREM}</Paragraph>
        <Paragraph>(md) {LOREM}</Paragraph>
        <Paragraph size="lg">(lg) {LOREM}</Paragraph>
      </section>

      {/* Section: Variants & alignment */}
      <section className="space-y-3">
        <Heading2 gutter="md">Variants & alignment</Heading2>
        <Paragraph variant="default">{LOREM}</Paragraph>
        <Paragraph variant="muted">{LOREM}</Paragraph>
        <Paragraph variant="info" align="justify">
          {LOREM} {LOREM}
        </Paragraph>
        <Paragraph variant="success" align="center">
          Success message centered.
        </Paragraph>
        <Paragraph variant="warning" align="right">
          Warning aligned right.
        </Paragraph>
        <Paragraph variant="error" gutter="none">
          Error with no gutter below.
        </Paragraph>
      </section>

      {/* Section: Extras (fade-in, drop-cap, clamp, truncate) */}
      <section className="space-y-4">
        <Heading2 gutter="md">Extras</Heading2>

        <Paragraph fadeIn>
          This paragraph fades in on mount (motion-safe). {LOREM}
        </Paragraph>

        <Paragraph dropCap size="lg" leading="relaxed">
          {LOREM} {LOREM} {LOREM}
        </Paragraph>

        <Paragraph clamp={3}>
          This one is clamped to 3 lines. {LOREM} {LOREM} {LOREM} {LOREM}
        </Paragraph>

        <Paragraph truncate className="max-w-md">
          This one uses single-line truncate with an ellipsis: {LOREM} {LOREM}
        </Paragraph>
      </section>

      {/* Section: Small & Caption */}
      <section className="space-y-3">
        <Heading3 gutter="md">Small & Caption</Heading3>

        <Small>Secondary supporting text (default)</Small>
        <Small variant="muted" uppercase>
          Uppercased muted small text
        </Small>
        <Small variant="info" mono>
          Monospace small for metadata 12:30 UTC
        </Small>

        <Caption eyebrow>Eyebrow label</Caption>
        <br />
        <div className="rounded-md p-3 bg-gray-900 inline-block">
          <Caption variant="default" className="!text-white">
            White caption on dark
          </Caption>
        </div>
        <Caption as="kbd" kbd>
          ⌘K
        </Caption>
      </section>
    </div>
  );
}
