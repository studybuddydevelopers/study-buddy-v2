"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  outlined?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = "primary",
  size = "md",
  outlined = false,
  className = "",
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold rounded-full whitespace-nowrap transition-all duration-200 ease-in-out";

  const sizeClasses: Record<NonNullable<BadgeProps["size"]>, string> = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
    primary: "bg-primary-600 text-background",
    secondary: "bg-secondary-700 text-background",
    success: "bg-green-500 text-background",
    warning: "bg-yellow-500 text-background",
    error: "bg-red-500 text-background",
  };

  const outlinedClasses = outlined
    ? "bg-transparent border-2 border-current text-inherit"
    : "";

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${
        outlined ? outlinedClasses : variantClasses[variant]
      } ${className}`}
    >
      {children}
    </span>
  );
}
