"use client";

import { useState } from "react";
import Button from "@/components/Button";
import Image from "@/components/Image";

interface LowDataImageProps {
  src: string;
  alt: string;
  className?: string;
  lowDataModeEnabled: boolean;
}

export default function LowDataImage({
  src,
  alt,
  className = "",
  lowDataModeEnabled,
}: LowDataImageProps) {
  const [userRequestedImage, setUserRequestedImage] = useState(false);

  if (lowDataModeEnabled && !userRequestedImage) {
    return (
      <div className="rounded-lg border border-dashed border-accent-300 bg-accent-50 p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUserRequestedImage(true)}
        >
          Load image
        </Button>
      </div>
    );
  }

  return <Image src={src} alt={alt} className={className} />;
}
