"use client";

type Variant = "default" | "muted" | "success" | "warning" | "error" | "info";
type Align = "left" | "center" | "right" | "justify";
type Gutter = "none" | "sm" | "md" | "auto";

export type SmallProps = Readonly<
  {
    as?: React.ElementType; // default: "p"
    variant?: Variant; // default: "muted"
    align?: Align; // default: "left"
    gutter?: Gutter; // default: "auto"
    uppercase?: boolean; // from .upper
    mono?: boolean; // from .mono
    className?: string;
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLElement>
>;

const variantTokens: Record<Variant, string> = {
  default: "text-gray-800",
  muted: "text-gray-600",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

const alignTokens: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

const gutterDefault = "mb-2";
const gutterTokens: Record<Exclude<Gutter, "auto">, string> = {
  none: "mb-0",
  sm: "mb-1",
  md: "mb-3",
};

export default function Small(props: SmallProps) {
  const {
    as,
    variant = "muted",
    align = "left",
    gutter = "auto",
    uppercase = false,
    mono = false,
    className = "",
    children,
    ...rest
  } = props;

  const Tag = (as ?? "p") as React.ElementType;

  const classes = [
    "text-sm leading-normal",
    variantTokens[variant],
    alignTokens[align],
    gutter === "auto" ? gutterDefault : gutterTokens[gutter],
    uppercase ? "uppercase tracking-[0.08em]" : "",
    mono
      ? "font-mono"
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
