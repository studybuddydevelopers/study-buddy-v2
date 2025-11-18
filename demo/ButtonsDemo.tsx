"use client";

import { useState } from "react";
import Button from "../components/Button";
import Heading2 from "../components/Heading2";
import Heading1 from "../components/Heading1";

export default function ButtonsDemo() {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    // Fake async task (simulate API call)
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Buttons Demo</Heading1>
      {/* Variants */}
      <section className="space-y-4">
        <Heading2 gutter="md">Main Variants</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="neutral">Neutral</Button>
        </div>
      </section>

      {/* Sizes */}
      <section className="space-y-4">
        <Heading2 gutter="md">Sizes</Heading2>
        <div className="flex gap-4 flex-wrap items-center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* Disabled state */}
      <section className="space-y-4">
        <Heading2 gutter="md">Disabled</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button disabled>Disabled Primary</Button>
          <Button variant="secondary" disabled>
            Disabled Secondary
          </Button>
          <Button variant="outline" disabled>
            Disabled Outline
          </Button>
        </div>
      </section>

      {/* Loading state */}
      <section className="space-y-4">
        <Heading2 gutter="md">Loading</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button loading>Loading...</Button>
          <Button variant="secondary" loading>
            Please wait
          </Button>
        </div>
      </section>

      {/* Ripple demo */}
      <section className="space-y-4">
        <Heading2 gutter="md">Ripple Effect</Heading2>
        <p className="text-sm text-gray-600">
          Click a button to see the ripple animation.
        </p>
        <div className="flex gap-4 flex-wrap">
          <Button>Click Me</Button>
          <Button variant="outline">Click Outline</Button>
        </div>
      </section>

      {/* Extra Variants */}
      <section className="space-y-4">
        <Heading2 gutter="md">Extra Variants</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="ghost">Ghost</Button>
          <Button variant="link" >Link</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="success">Save</Button>
        </div>
      </section>

      {/* Neutral buttons */}
      <section className="space-y-4">
        <Heading2 gutter="md">Neutral Buttons</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="neutral">Neutral</Button>
          <Button variant="neutral" icon={<span>➕</span>}>
            Add Item
          </Button>
        </div>
      </section>

      {/* Shapes */}
      <section className="space-y-4">
        <Heading2 gutter="md">Shapes</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button size="md" shape="pill">
            Pill Shape
          </Button>
          <Button size="md" variant="outline" shape="square">
            Square
          </Button>
        </div>
      </section>

      {/* Icon + Text buttons */}
      <section className="space-y-4">
        <Heading2 gutter="md">Icon + Text Buttons</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary" size="sm" icon={<span>🔍</span>}>
            Search
          </Button>
          <Button variant="secondary" size="sm" icon={<span>✖</span>}>
            Close
          </Button>
        </div>
      </section>

      {/* Icon-only buttons */}
      <section className="space-y-4">
        <Heading2 gutter="md">Icon-only Buttons</Heading2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="icon" size="sm" icon={<span>🔍</span>} ariaLabel="Search" />
          <Button variant="icon" size="md" icon={<span>⚙️</span>} ariaLabel="Settings" />
          <Button variant="icon" size="lg" icon={<span>❤️</span>} ariaLabel="Like" />
        </div>
      </section>

      {/* Disabled Plain */}
      <section className="space-y-4">
        <Heading2 gutter="md">Disabled Plain</Heading2>
        <Button variant="disabledPlain" disabled>
          Permanently Disabled
        </Button>
      </section>

      {/* Interactive Loading Button */}
      <section className="space-y-4">
        <Heading2 gutter="md">Interactive Loading</Heading2>
        <p className="text-sm text-gray-600">
          Click the button to simulate an async task (2s).
        </p>
        <Button
          variant="primary"
          loading={loading}
          disabled={loading}
          onClick={handleClick}
        >
          {loading ? "Processing..." : "Submit"}
        </Button>
      </section>
    </div>
  );
}
