"use client";

import { useState } from "react";
import SelectField from "../components/SelectField";
import Heading1 from "../components/Heading1";
import Heading2 from "../components/Heading2";

export default function SelectFieldDemo() {
  const [subject, setSubject] = useState("");

  const subjects = [
    { value: "math", label: "Mathematics" },
    { value: "eng", label: "English Language" },
    { value: "phy", label: "Physics" },
    { value: "bio", label: "Biology" },
  ];

  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">SelectField Demo</Heading1>

      {/* Basic Select */}
      <section className="space-y-4">
        <Heading2 gutter="md">Basic Select</Heading2>
        <SelectField
          label="Subject 1"
          options={subjects}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </section>

      {/* Error state */}
      <section className="space-y-4">
        <Heading2 gutter="md">Error State</Heading2>
        <SelectField
          label="Subject"
          options={subjects}
          value=""
          error="Please select a subject"
        />
      </section>

      {/* Disabled */}
      <section className="space-y-4">
        <Heading2 gutter="md">Disabled</Heading2>
        <SelectField
          label="Disabled Field"
          options={subjects}
          value=""
          disabled
        />
      </section>
    </div>
  );
}
