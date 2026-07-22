interface LogoNameProps {
  color?: "default" | "primary" | "secondary" | "accent" | "background" | "foreground" | "success" | "warning" | "error" | "info";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "max";
}

export default function LogoName({
  color = "default",
  size = "md",
}: LogoNameProps) {
  const sizeClasses: Record<NonNullable<LogoNameProps["size"]>, string> = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-md",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
    "6xl": "text-6xl",
    "max": "text-[23em]",
  };

  const colorClasses: Record<NonNullable<LogoNameProps["color"]>, string> = {
    default: "text-secondary-500",
    primary: "text-primary-500",
    secondary: "text-secondary-500",
    accent: "text-accent-500",
    background: "text-background-500",
    foreground: "text-foreground-500",
    success: "text-success-500",
    warning: "text-warning-500",
    error: "text-error-500",
    info: "text-info-500",
  };

  return (
    <span
      className={`font-bold tracking-normal ${sizeClasses[size]} ${colorClasses[color]}`}
    >
      Study Buddy
    </span>
  );
}
