"use client";

interface LogoNameProps {
  color?: "default" | "white" | "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "xl";
}

export default function LogoName({
  color = "default",
  size = "md",
}: LogoNameProps) {
  const sizeClasses: Record<NonNullable<LogoNameProps["size"]>, string> = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const colorClasses: Record<NonNullable<LogoNameProps["color"]>, string> = {
    default: "text-secondary-500",
    white: "text-white",
    primary: "text-primary-500",
    secondary: "text-secondary-500",
  };

  return (
    <span
      className={`font-bold tracking-[-0.01em] ${sizeClasses[size]} ${colorClasses[color]}`}
    >
      Study Buddy
    </span>
  );
}
