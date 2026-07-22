import React from "react";

type Variant = "default" | "muted" | "superMuted" | "success" | "warning" | "error" | "info";
type Size = "sm" | "md" | "lg";
type Align = "left" | "center" | "right" | "justify";
type Leading = "snug" | "normal" | "relaxed" | "loose";
type Weight = "normal" | "medium" | "semibold";
type Gutter = "none" | "sm" | "md" | "lg" | "auto";

export type ParagraphProps = Readonly<
  {
    as?: React.ElementType;
    variant?: Variant;
    size?: Size;
    weight?: Weight;
    align?: Align;
    leading?: Leading;
    gutter?: Gutter;
    truncate?: boolean;
    fadeIn?: boolean;
    dropCap?: boolean;
    clamp?: 2 | 3 | 4 | 5 | 6;
    className?: string;
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLElement>
>;

const sizeTokens: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base lg:text-lg",
  lg: "text-lg lg:text-xl",
};

const weightTokens: Record<Weight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
};

const alignTokens: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

const leadingTokens: Record<Leading, string> = {
  snug: "leading-snug",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
  loose: "leading-loose",
};

const variantTokens: Record<Variant, string> = {
  default: "text-gray-800",
  muted: "text-gray-700",
  superMuted: "text-gray-600",
  success: "text-green-600",
  warning: "text-yellow-600",
  error: "text-red-600",
  info: "text-blue-600",
};

const gutterDefault = "mb-4";
const gutterTokens: Record<Exclude<Gutter, "auto">, string> = {
  none: "mb-0",
  sm: "mb-2",
  md: "mb-4",
  lg: "mb-8",
};

// simple motion-safe fade-in animation using Tailwind
const fadeInClass =
  "motion-safe:animate-[fadeIn_0.5s_ease-out_forwards] opacity-0 will-change-[opacity,transform]";

export default function Paragraph(props: ParagraphProps) {
  const {
    as,
    variant = "default",
    size = "md",
    weight = "normal",
    align = "left",
    leading = "relaxed",
    gutter = "auto",
    truncate = false,
    fadeIn = false,
    dropCap = false,
    clamp,
    className = "",
    children,
    ...rest
  } = props;

  const Tag = (as ?? "p") as React.ElementType;

  const classes = [
    sizeTokens[size],
    weightTokens[weight],
    alignTokens[align],
    leadingTokens[leading],
    variantTokens[variant],
    gutter === "auto" ? gutterDefault : gutterTokens[gutter],
    truncate ? "truncate" : "",
    fadeIn ? fadeInClass : "",
    dropCap ? "[&::first-letter]:float-left [&::first-letter]:text-[2.75em] [&::first-letter]:leading-[0.9] [&::first-letter]:pr-[0.1em] [&::first-letter]:text-[#6247AA]" : "",
    clamp ? `line-clamp-${clamp}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
