"use client";

type Variant = "default" | "muted" | "primary" | "secondary" | "accent";
type Align = "left" | "center" | "right";
type Gutter = "none" | "sm" | "md" | "auto";

export type CaptionProps = Readonly<
  {
    as?: React.ElementType;               // default: "span"
    variant?: Variant;                    // default: "muted"
    align?: Align;                        // default: "left"
    uppercase?: boolean;                  // default: true
    eyebrow?: boolean;                    // optional eyebrow label style
    kbd?: boolean;                        // optional keyboard key style
    className?: string;
    gutter?: Gutter;                      // default: "auto"
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLElement>
>;

const variantTokens: Record<Variant, string> = {
  default: "text-gray-700",
  muted: "text-gray-500",
  primary: "text-primary-600",
  secondary: "text-secondary-500",
  accent: "text-accent-500",
};

const alignTokens: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const gutterDefault = "mb-2";
const gutterTokens: Record<Exclude<Gutter, "auto">, string> = {
  none: "mb-0",
  sm: "mb-1",
  md: "mb-3",
};

export default function Caption(props: CaptionProps) {
  const {
    as,
    variant = "muted",
    align = "left",
    uppercase = true,
    eyebrow = false,
    kbd = false,
    className = "",
    gutter = "auto",
    children,
    ...rest
  } = props;

  const Tag = (as ?? "span") as React.ElementType;

  const classes = [
    "text-xs",
    uppercase ? "uppercase tracking-wide" : "tracking-normal",
    variantTokens[variant],
    alignTokens[align],
    gutter === "auto" ? gutterDefault : gutterTokens[gutter],
    eyebrow ? "uppercase tracking-[0.12em]" : "",
    kbd
      ? "border border-black/15 rounded px-1 font-mono bg-black/5"
      : "",
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
