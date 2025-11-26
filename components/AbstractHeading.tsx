"use client"; 

import { useEffect } from "react";

type Level = 1 | 2 | 3 | 4 | 5 | 6;
type Align = "left" | "center" | "right";
type Variant = "default" | "gradient" | "outlined" | "decorative";
type Color = "default" | "primary" | "secondary" | "accent" | "background" | "foreground" | "success" | "warning" | "error" | "info";
type Size = "sm" | "md" | "lg" | "xl";
type Weight = "normal" | "medium" | "semibold" | "bold" | "extrabold";
type Gutter = "none" | "sm" | "md" | "lg" | "auto";

export type AbstractHeadingProps = Readonly<
  {
    level?: Level;
    as?: React.ElementType;
    variant?: Variant;
    color?: Color;
    size?: Size;
    weight?: Weight;
    align?: Align;
    animated?: boolean;
    gutter?: Gutter;
    className?: string;
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLElement>
>;

const sizeTokens: Record<Size, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

const defaultSizeByLevel: Record<Level, Size> = {
  1: "xl",
  2: "lg",
  3: "md",
  4: "sm",
  5: "sm",
  6: "sm",
};

const defaultWeightByLevel: Record<Level, Weight> = {
  1: "extrabold",
  2: "bold",
  3: "semibold",
  4: "semibold",
  5: "medium",
  6: "medium",
};

const weightTokens: Record<Weight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
};

const alignTokens: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const colorTokens: Record<Color, string> = {
  default: "text-gray-900",
  primary: "text-primary-500",
  secondary: "text-secondary-500",
  accent: "text-accent-500",
  background: "text-background",
  foreground: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

const defaultColorByLevel: Record<Level, Color> = {
  1: "default",
  2: "default",
  3: "default",
  4: "default",
  5: "default",
  6: "default",
};

const leadingByLevel: Record<Level, string> = {
  1: "leading-tight",
  2: "leading-snug",
  3: "leading-snug",
  4: "leading-snug",
  5: "leading-snug",
  6: "leading-normal",
};

const trackingByLevel: Record<Level, string> = {
  1: "tracking-tight",
  2: "tracking-tight",
  3: "tracking-normal",
  4: "tracking-normal",
  5: "tracking-normal",
  6: "tracking-wide",
};

const defaultGutterByLevel: Record<Level, string> = {
  1: "mb-6 lg:mb-8",
  2: "mb-5 lg:mb-6",
  3: "mb-4",
  4: "mb-4",
  5: "mb-3",
  6: "mb-2",
};

const gutterTokens: Record<Exclude<Gutter, "auto">, string> = {
  none: "mb-0",
  sm: "mb-2",
  md: "mb-4",
  lg: "mb-8",
};

export default function AbstractHeading(props: AbstractHeadingProps) {
  const {
    level = 1,
    as,
    variant = "default",
    color,
    size,
    weight,
    align = "left",
    animated = false,
    gutter = "auto",
    className = "",
    children,
    ...rest
  } = props;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("heading-keyframes")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "heading-keyframes";
    styleEl.textContent = `
      @keyframes headingSlideIn {
        from { opacity: 0; transform: translateY(-30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(styleEl);
  }, []);

  const Tag = (as ?? (`h${level}` as const)) as React.ElementType;

  const finalSize = size ?? defaultSizeByLevel[level];
  const finalWeight = weight ?? defaultWeightByLevel[level];
  const finalColor: Color = color ?? defaultColorByLevel[level];

  const desktopBump =
    level === 1
      ? "lg:text-6xl"
      : level === 2
      ? "lg:text-5xl"
      : level === 3
      ? "lg:text-4xl"
      : level === 4
      ? "lg:text-3xl"
      : level === 6
      ? "lg:text-lg"
      : "";

  const gutterClass =
    gutter === "auto" ? defaultGutterByLevel[level] : gutterTokens[gutter];

  const baseClasses = [
    sizeTokens[finalSize],
    desktopBump,
    weightTokens[finalWeight],
    alignTokens[align],
    leadingByLevel[level],
    trackingByLevel[level],
    gutterClass,
  ];

  const maybeColor = variant === "default" ? colorTokens[finalColor] : "";

  // Variants recreated in Tailwind
  const variantClasses: Record<Variant, string> = {
    default: "",
    gradient:
      "bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent animate-[gradientShift_3s_ease_infinite]",
    outlined:
      "text-transparent [text-shadow:0_0_0_#6247AA] [-webkit-text-stroke:1px_#6247AA]",
    decorative:
      "relative after:content-[''] after:absolute after:left-0 after:-bottom-[6px] after:h-[3px] after:w-0 after:rounded-full after:bg-gradient-to-r after:from-primary-600 after:to-[#102B3F] hover:after:w-full after:transition-all after:duration-200",
  };

  const animatedClasses = animated
    ? "will-change-[opacity,transform] animate-[headingSlideIn_0.8s_ease-out_both] hover:translate-y-[-5px] hover:transition-transform duration-200 focus:outline-2 focus:outline-primary-500 focus:outline-offset-4 focus:rounded"
    : "";

  const classes = [
    ...baseClasses,
    maybeColor,
    variantClasses[variant],
    animatedClasses,
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
