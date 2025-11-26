"use client";

import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Heading3 from "@/components/Heading3";
import Heading4 from "@/components/Heading4";
import Heading5 from "@/components/Heading5";
import Heading6 from "@/components/Heading6";

export default function HeadingsDemo() {
  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Headings Demo</Heading1>
      {/* Basic scale */}
      <section className="space-y-2">
        <Heading1>Heading 1 — Default</Heading1>
        <Heading2>Heading 2 — Default</Heading2>
        <Heading3>Heading 3 — Default</Heading3>
        <Heading4>Heading 4 — Default</Heading4>
        <Heading5>Heading 5 — Default</Heading5>
        <Heading6>Heading 6 — Default</Heading6>
      </section>

      {/* Colors */}
      <section className="space-y-4">
        <Heading2 color="primary">Primary color</Heading2>
        <Heading2 color="secondary">Secondary color</Heading2>
        {/* Accent needs dark background to be visible */}
        <div className="rounded-xl p-2 bg-foreground">
          <Heading2 color="accent" className="bg-foreground">Accent color</Heading2>
        </div>

        {/* White needs dark background to be visible */}
        <div className="rounded-xl p-2 bg-foreground">
          <Heading2 color="background" className="">White on dark background</Heading2>
        </div>
      </section>

      {/* Variants */}
      <section className="space-y-6">
        <Heading2 variant="gradient">Gradient variant</Heading2>

        <div className="rounded-xl p-6 bg-gray-900 overflow-auto">
          <Heading2 variant="outlined" /* outlined ignores solid color */>
            Outlined variant (best on dark bg)
          </Heading2>
        </div>

        <Heading2 variant="decorative">
          Decorative underline (hover me)
        </Heading2>
      </section>

      {/* Alignment + Weight + Size */}
      <section className="space-y-6">
        <Heading3 align="center">Centered heading</Heading3>
        <Heading3 weight="extrabold">Extra bold weight</Heading3>
        <Heading3 size="xl">XL size override</Heading3>
      </section>

      {/* Animated */}
      <section className="space-y-4">
        <Heading2 animated>Animated entrance (respects reduced motion)</Heading2>
        <Heading3 animated>Also animated — hover for subtle lift</Heading3>
      </section>

      {/* Polymorphic `as` (semantic h2 with h1 styling) */}
      <section className="space-y-2">
        <Heading1 as="h2">H1 styles rendered as &lt;h2&gt;</Heading1>
        <p className="text-sm text-gray-600">
          Useful when you need semantic structure but want consistent visual size.
        </p>
      </section>
    </div>
  );
}
