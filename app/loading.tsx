"use client";

import { SbEqualizerLoadingPattern } from "@/components/SbSequentialFillPreview";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div aria-hidden="true"><SbEqualizerLoadingPattern size={400} /></div>
    </div>
  );
}
