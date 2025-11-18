"use client";

import ProgressBar from "../components/ProgressBar";
import Heading2 from "../components/Heading2";
import Heading1 from "../components/Heading1";

export default function ProgressBarDemo() {
  return (
    <div className="p-8 space-y-12 text-left">
      <Heading1 gutter="md">Progress Bar Demo</Heading1>

      {/* Example 1: Time Remaining */}
      <section className="space-y-4">
        <Heading2 gutter="md">Single Progress Bar (Time Remaining)</Heading2>
        <ProgressBar
          label="Time Remaining"
          percentage={65}
          helperText="1 hour 30 minutes"
          showPercentage={false}
        />
      </section>

      {/* Example 2: Stacked Subject Progress */}
      <section className="space-y-4">
        <Heading2 gutter="md">Multiple Subjects</Heading2>
        <ProgressBar label="Overall Progress" percentage={75} />
        <ProgressBar label="Mathematics" percentage={60} />
        <ProgressBar label="English Language" percentage={80} />
        <ProgressBar label="Physics" percentage={90} />
      </section>
    </div>
  );
}
