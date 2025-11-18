"use client";

import { useState } from "react";
import MultiSelectField from "@/components/MultiSelectField";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";

export default function MultiSelectFieldDemo() {
  const [subjects, setSubjects] = useState<string[]>([]);

  const options = [
    { value: "math", label: "Mathematics" },
    { value: "eng", label: "English Language" },
    { value: "phy", label: "Physics" },
    { value: "bio", label: "Biology" },
    { value: "chem", label: "Chemistry" },
  ];

  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">MultiSelectField Demo</Heading1>

      {/* Basic */}
      <section className="space-y-4">
        <Heading2 gutter="md">Basic</Heading2>
        <MultiSelectField
          label="Subjects"
          options={options}
          value={subjects}
          onChange={setSubjects}
          placeholder="Select one or more subjects"
        />
      </section>

      {/* Error */}
      <section className="space-y-4">
        <Heading2 gutter="md">Error State</Heading2>
        <MultiSelectField
          label="Subjects"
          options={options}
          value={[]}
          error="Please select at least one subject"
        />
      </section>

      {/* Disabled */}
      <section className="space-y-4">
        <Heading2 gutter="md">Disabled</Heading2>
        <MultiSelectField
          label="Subjects"
          options={options}
          value={["math"]}
          disabled
        />
      </section>
    </div>
  );
}
