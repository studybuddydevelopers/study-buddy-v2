"use client";

import { useState } from "react";
import SingleChoiceOption from "../components/SingleChoiceOption";
import MultiSelectOptionCard from "../components/MultiSelectOptionCard";
import Heading1 from "../components/Heading1";

export default function OptionsDemo() {
  const [singleChoice, setSingleChoice] = useState("A");
  const [multiChoices, setMultiChoices] = useState<string[]>([]);

  const handleMultiChange = (value: string, isChecked: boolean) => {
    setMultiChoices((prev) =>
      isChecked ? [...prev, value] : prev.filter((v) => v !== value)
    );
  };

  return (
    <div className="space-y-8 max-w-xl">
      <Heading1 gutter="md">Options Demo</Heading1>
      {/* Single-choice demo */}
      <div>
        <h2 className="text-lg font-bold mb-2">Single Choice</h2>
        <div className="space-y-2">
          <SingleChoiceOption
            label="A. 10"
            name="q1"
            value="A"
            checked={singleChoice === "A"}
            onChange={setSingleChoice}
          />
          <SingleChoiceOption
            label="B. 12"
            name="q1"
            value="B"
            checked={singleChoice === "B"}
            onChange={setSingleChoice}
          />
        </div>
      </div>

      {/* Multi-choice demo */}
      <div>
        <h2 className="text-lg font-bold mb-2">Multiple Choice</h2>
        <div className="space-y-2">
          <MultiSelectOptionCard
            label="A. 10"
            value="A"
            checked={multiChoices.includes("A")}
            onChange={handleMultiChange}
          />
          <MultiSelectOptionCard
            label="B. 12"
            value="B"
            checked={multiChoices.includes("B")}
            onChange={handleMultiChange}
          />
          <MultiSelectOptionCard
            label="C. 15"
            value="C"
            checked={multiChoices.includes("C")}
            onChange={handleMultiChange}
          />
        </div>
      </div>
    </div>
  );
}
