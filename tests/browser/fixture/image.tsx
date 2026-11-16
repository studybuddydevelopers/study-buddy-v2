/* eslint-disable @next/next/no-img-element -- Next image optimization is not part of this UI fixture. */
import React from "react";
export default function Image({ src, alt = "", width, height, className }: {
  src: string | { src: string }; alt?: string; width?: number; height?: number; className?: string;
}) {
  return <img src={typeof src === "string" ? src : src.src} alt={alt} width={width} height={height} className={className} />;
}
