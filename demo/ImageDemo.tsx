"use client";

import Image from "../components/Image";
import Heading2 from "../components/Heading2";
import Heading1 from "../components/Heading1";

export default function ImageDemo() {
  return (
    <div className="p-8 space-y-12 text-left max-w-5xl">
      <Heading1 gutter="md">Image Component Demo</Heading1>
      {/* Basic */}
      <section className="space-y-4">
        <Heading2 gutter="md">Basic Image</Heading2>
        <Image
          src="https://picsum.photos/600/400"
          alt="Random placeholder"
        />
      </section>

      {/* Rounded */}
      <section className="space-y-4">
        <Heading2 gutter="md">Rounded Corners</Heading2>
        <div className="grid grid-cols-3 gap-4">
          <Image src="https://picsum.photos/200" alt="Rounded sm" rounded="sm" />
          <Image src="https://picsum.photos/200" alt="Rounded md" rounded="md" />
          <Image src="https://picsum.photos/200" alt="Rounded lg" rounded="lg" />
          <Image src="https://picsum.photos/200" alt="Rounded xl" rounded="xl" />
          <Image src="https://picsum.photos/200" alt="Rounded full" rounded="full" />
        </div>
      </section>

      {/* Shadows */}
      <section className="space-y-4">
        <Heading2 gutter="md">Shadows</Heading2>
        <div className="grid grid-cols-3 gap-4">
          <Image src="https://picsum.photos/201" alt="Shadow sm" shadow="sm" />
          <Image src="https://picsum.photos/202" alt="Shadow md" shadow="md" />
          <Image src="https://picsum.photos/203" alt="Shadow lg" shadow="lg" />
          <Image src="https://picsum.photos/203" alt="Shadow lg & Rounded xl" shadow="lg" rounded="xl"/>
        </div>
      </section>

      {/* Hover Zoom */}
      <section className="space-y-4">
        <Heading2 gutter="md">Hover Zoom</Heading2>
        <Image
          src="https://picsum.photos/600/300"
          alt="Hover zoom"
          hoverZoom
          shadow="md"
          rounded="lg"
        />
      </section>

      {/* Bordered */}
      <section className="space-y-4">
        <Heading2 gutter="md">Bordered</Heading2>
        <Image
          src="https://picsum.photos/400/250"
          alt="Bordered"
          bordered
          rounded="lg"
        />
      </section>
    </div>
  );
}
