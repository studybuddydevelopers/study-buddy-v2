"use client";

interface ImageProps {
  src: string;
  alt: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  shadow?: "none" | "sm" | "md" | "lg";
  hoverZoom?: boolean;
  bordered?: boolean;
  className?: string;
}

export default function Image({
  src,
  alt,
  rounded = "md",
  shadow = "none",
  hoverZoom = false,
  bordered = false,
  className = "",
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

  return <img src={src} alt={alt} className={classes} />;
}
