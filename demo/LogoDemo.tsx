"use client";

import Logo from "@/components/Logo";
import Heading2 from "@/components/Heading2";
import Heading1 from "@/components/Heading1";

export default function LogoDemo() {
  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Logo Demo</Heading1>

      {/* Variants */}
      <section className="space-y-4">
        <Heading2 gutter="md">Variants</Heading2>
        <div className="flex gap-6 items-center flex-wrap">
          <Logo variant="full" />
          <Logo variant="icon" animated />
          <Logo variant="text" color="primary" />
        </div>
      </section>

      {/* Sizes */}
      <section className="space-y-4">
        <Heading2 gutter="md">Sizes</Heading2>
        <div className="flex gap-6 items-center flex-wrap">
          <Logo variant="full" size="sm" />
          <Logo variant="full" size="md" />
          <Logo variant="full" size="lg" />
          <Logo variant="full" size="xl" />
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-4">
        <Heading2 gutter="md">Colors</Heading2>
        <div className="flex gap-6 items-center flex-wrap bg-gray-900 p-6 rounded-xl">
          <Logo variant="full" color="white" />
          <Logo variant="full" color="primary" />
          <Logo variant="full" color="secondary" />
        </div>
      </section>

      {/* Interactive */}
      <section className="space-y-4">
        <Heading2 gutter="md">Interactive Logo</Heading2>
        <p className="text-sm text-gray-600">
          This one is clickable (simulates routing or navigation).
        </p>
        <Logo
          variant="full"
          size="lg"
          color="primary"
          animated
          onClick={() => alert("Logo clicked!")}
        />
      </section>
    </div>
  );
}

