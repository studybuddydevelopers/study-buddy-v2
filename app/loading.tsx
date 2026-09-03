"use client";

import { SbEqualizerLoadingPattern } from "@/components/SbSequentialFillPreview";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <SbEqualizerLoadingPattern size={400} />
    </div>
  );
}
