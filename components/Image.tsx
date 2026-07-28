/* eslint-disable @next/next/no-img-element */
"use client";

import {
  DEFAULT_OPTIMIZED_IMAGE_WIDTHS,
  getOptimizedImageSrcSet,
  getOptimizedImageUrl,
} from "@/lib/optimized-image";

interface ImageProps {
  src: string;
  alt: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  shadow?: "none" | "sm" | "md" | "lg";
  hoverZoom?: boolean;
  bordered?: boolean;
  className?: string;
  sizes?: string;
  widths?: number[];
  quality?: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
  dataChatAvatar?: boolean;
}

export default function Image({
  src,
  alt,
  rounded = "md",
  shadow = "none",
  hoverZoom = false,
  bordered = false,
  className = "",
  sizes = "100vw",
  widths = DEFAULT_OPTIMIZED_IMAGE_WIDTHS,
  quality,
  loading = "lazy",
  fetchPriority = "auto",
  width,
  height,
  dataChatAvatar = false,
}: ImageProps) {
  const roundedClasses: Record<NonNullable<ImageProps["rounded"]>, string> = {
    none: "",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  };

  const shadowClasses: Record<NonNullable<ImageProps["shadow"]>, string> = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  };

  const baseClasses =
    "object-cover w-full h-auto transition-transform duration-300";

  const classes = [
    baseClasses,
    roundedClasses[rounded],
    shadowClasses[shadow],
    hoverZoom ? "hover:scale-105" : "",
    bordered ? "border border-gray-200" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const safeWidths = widths.length > 0 ? widths : DEFAULT_OPTIMIZED_IMAGE_WIDTHS;
  const largestWidth = Math.max(...safeWidths);
  const srcSet = getOptimizedImageSrcSet({ src, widths: safeWidths, quality });
  const resolvedSrc = srcSet
    ? getOptimizedImageUrl(src, { width: largestWidth, quality })
    : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={classes}
      loading={loading}
      width={width}
      height={height}
      data-chat-avatar={dataChatAvatar ? "" : undefined}
      decoding="async"
      fetchPriority={fetchPriority}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
    />
  );
}
