"use client";

import Card from "../components/Card";
import Heading2 from "../components/Heading2";
import Paragraph from "../components/Paragraph";
import Button from "../components/Button";
import Heading1 from "../components/Heading1";

export default function CardsDemo() {

  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Cards Demo</Heading1>
      {/* Variants */}
      <section className="space-y-4">
        <Heading2 gutter="md">Variants</Heading2>
        <div className="flex flex-wrap gap-6">
          <Card variant="default">
            <Paragraph>This is a default card.</Paragraph>
          </Card>
          <Card variant="elevated">
            <Paragraph>This card has elevation.</Paragraph>
          </Card>
          <Card variant="outlined">
            <Paragraph>This card is outlined.</Paragraph>
          </Card>
          <Card variant="filled">
            <Paragraph>This card is filled with a light background.</Paragraph>
          </Card>
          <Card variant="interactive" onClick={() => alert("Card clicked!")}>
            <Paragraph>Click me (interactive)</Paragraph>
          </Card>
        </div>
      </section>

      {/* Sizes */}
      <section className="space-y-4">
        <Heading2 gutter="md">Sizes</Heading2>
        <div className="flex flex-wrap gap-6">
          <Card size="sm">
            <Paragraph>Small card</Paragraph>
          </Card>
          <Card size="md">
            <Paragraph>Medium card</Paragraph>
          </Card>
          <Card size="lg">
            <Paragraph>Large card</Paragraph>
          </Card>
        </div>
      </section>

      {/* Padding */}
      <section className="space-y-4">
        <Heading2 gutter="md">Padding Options</Heading2>
        <div className="flex flex-wrap gap-6">
          <Card padding="none">
            <Paragraph>No padding</Paragraph>
          </Card>
          <Card padding="sm">
            <Paragraph>Small padding</Paragraph>
          </Card>
          <Card padding="lg">
            <Paragraph>Large padding</Paragraph>
          </Card>
        </div>
      </section>

      {/* Shadows + Hover */}
      <section className="space-y-4">
        <Heading2 gutter="md">Shadows & Hover</Heading2>
        <div className="flex flex-wrap gap-6">
          <Card shadow="none">
            <Paragraph>No shadow</Paragraph>
          </Card>
          <Card shadow="sm" hover>
            <Paragraph>Small shadow w/ hover</Paragraph>
          </Card>
          <Card shadow="xl" hover>
            <Paragraph>XL shadow w/ hover</Paragraph>
          </Card>
        </div>
      </section>

      {/* Header + Footer */}
      <section className="space-y-4">
        <Heading2 gutter="md">Header & Footer</Heading2>
        <Card
          header={<h3 className="font-bold text-lg">Card Header</h3>}
          footer={<Button size="sm">Action</Button>}
        >
          <Paragraph>
            This card has a header and a footer section.
          </Paragraph>
        </Card>
      </section>

      {/* With Images */}
      <section className="space-y-4">
        <Heading2 gutter="md">With Images</Heading2>
        <div className="flex flex-wrap gap-6">
          <Card
            image={{ src: "https://picsum.photos/400/200", alt: "Random" }}
            footer={<Paragraph>Footer content</Paragraph>}
          >
            <Paragraph>Card with top image</Paragraph>
          </Card>

          <Card
            image={{
              src: "https://picsum.photos/400/200",
              alt: "Random",
              position: "bottom",
            }}
            header={<h3 className="font-bold text-lg">Bottom Image</h3>}
          >
            <Paragraph>Card with bottom image</Paragraph>
          </Card>
        </div>
      </section>

      {/* Interactive example */}
      <section className="space-y-4">
        <Heading2 gutter="md">Interactive Card</Heading2>
        <Card
          variant="interactive"
          hover
          onClick={() => alert("You clicked the interactive card!")}
        >
          <Paragraph>
            This card is clickable and shows a hover shadow.
          </Paragraph>
        </Card>
      </section>

    </div>
  );
}
