"use client";

import { useEffect } from "react";

type Variant =
  | "disabledPlain"
  | "secondary"
  | "outline"
  | "primary"
  | "success"
  | "link"
  | "destructive"
  | "ghost"
  | "neutral"
  | "icon";

type Size = "sm" | "md" | "lg";
type Shape = "rounded" | "pill" | "square";

export interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  shape?: Shape;
  icon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
}

export default function Button({
  children,
  onClick,
  variant: variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  shape = "rounded",
  icon,
  className = "",
  type = "button",
  ariaLabel,
}: ButtonProps) {
  useEffect(() => {
    const body = document.body;

    if (loading) {
      body.classList.add("cursor-wait");
    } else {
      body.classList.remove("cursor-wait");
    }

    return () => {
      body.classList.remove("cursor-wait");
    };
  }, [loading]);


  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 select-none";

  const variantClasses: Record<Variant, string> = {
    primary:
      "border-2 border-primary-500 bg-primary-500 hover:bg-primary-400 text-background shadow-md hover:shadow-lg focus:ring-primary-400",
    secondary:
      "bg-secondary-500 hover:bg-secondary-600 text-background shadow-md hover:shadow-lg focus:ring-secondary-400",
    outline:
      "border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-background focus:ring-primary-400",
    ghost:
      "bg-transparent text-primary-500 hover:bg-primary-100 focus:ring-primary-300",
    link:
      "bg-transparent text-primary-600 hover:underline px-0 py-0 focus:ring-0",
    destructive:
      "bg-red-600 hover:bg-red-700 text-background focus:ring-red-400",
    success:
      "bg-green-600 hover:bg-green-700 text-background focus:ring-green-400",
    neutral:
      "bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-400",
    disabledPlain:
      "bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none",
    icon:
      "bg-gray-100 hover:bg-gray-200 text-gray-800 focus:ring-gray-400 rounded-full",
  };

  const sizeClasses: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const iconSizeClasses: Record<Size, string> = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
  };

  const shapeClasses: Record<Shape, string> = {
    rounded: "rounded-lg",
    pill: "rounded-full",
    square: "rounded-none",
  };

  const isDisabled = disabled || loading || variant === "disabledPlain";
  const disabledClasses = isDisabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "cursor-pointer";

  const fullWidthClass = fullWidth ? "w-full" : "";

  const skipRipple = isDisabled;
  const rippleClass = skipRipple ? "" : "ripple";

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    variant === "icon" ? iconSizeClasses[size] : sizeClasses[size],
    shapeClasses[shape],
    disabledClasses,
    fullWidthClass,
    rippleClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          {children && <span>{children}</span>}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {children}
        </span>
      )}
    </button>
  );
}
