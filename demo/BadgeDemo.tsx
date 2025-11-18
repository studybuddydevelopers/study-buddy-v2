"use client";

import Badge from "../components/Badge";
import Heading1 from "../components/Heading1";
import Heading2 from "../components/Heading2";

export default function BadgeDemo() {
  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Badge Demo</Heading1>

      {/* Basic */}
      <section className="space-y-4">
        <Heading2 gutter="md">Basic Usage</Heading2>
        <Badge>Best Value</Badge>
      </section>

      {/* Variants */}
      <section className="space-y-4">
        <Heading2 gutter="md">Variants</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
        </div>
      </section>

      {/* Sizes */}
      <section className="space-y-4">
        <Heading2 gutter="md">Sizes</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </section>

      {/* Outlined */}
      <section className="space-y-4">
        <Heading2 gutter="md">Outlined</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Badge variant="primary" outlined>
            Primary
          </Badge>
          <Badge variant="success" outlined>
            Success
          </Badge>
        </div>
      </section>
    </div>
  );
}
