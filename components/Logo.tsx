"use client"; // ✅ required for animations/interactivity in Next.js App Router

import { useEffect } from "react";
import LogoIcon from "./LogoIcon";
import LogoName from "./LogoName";

interface LogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl" | "5xl";
  color?: "default" | "white" | "primary" | "secondary";
  animated?: boolean;
  animation?:
    | "float"
    | "slideIn"
    | "bounce"
    | "pulse"
    | "rotate"
    | "none";
  onClick?: () => void;
  className?: string;
}

export default function Logo({
  variant = "full",
  size = "md",
  color = "default",
  animated = false,
  animation = "none",
  onClick,
  className = "",
}: LogoProps) {
  // ✅ Inject keyframes into document head (since Tailwind can’t define custom keyframes at runtime)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("logo-keyframes")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "logo-keyframes";
    styleEl.textContent = `
      @keyframes logoFloat {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      @keyframes logoSlideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes logoBounce {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes logoPulse {
        0%,100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes logoRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleEl);
  }, []);

  // Tailwind-compatible animation mapping
  const animationClasses: Record<
    NonNullable<LogoProps["animation"]>,
    string
  > = {
    none: "",
    float: "animate-[logoFloat_3s_ease-in-out_infinite]",
    slideIn: "animate-[logoSlideIn_0.6s_ease-out]",
    bounce: "animate-[logoBounce_0.8s_ease-out]",
    pulse: "animate-[logoPulse_2s_infinite]",
    rotate: "animate-[logoRotate_2s_linear_infinite]",
  };

  const interactiveClasses = onClick
    ? "cursor-pointer hover:opacity-80 transition-opacity"
    : "";

  const iconBaseClasses = `
    inline-block align-middle leading-none focus:outline-2 focus:outline-primary-500 focus:outline-offset-2 rounded-sm
    hover:scale-110 transition-transform duration-200
    ${animationClasses[animation]}
  `;

  // ✅ Renders only the icon
  if (variant === "icon") {
    return (
      <div onClick={onClick} className={`${interactiveClasses} ${className}`}>
        <div className={iconBaseClasses}>
          <LogoIcon size={size} color={color} animated={animated} />
        </div>
      </div>
    );
  }

  // ✅ Renders only the text
  if (variant === "text") {
    return (
      <div onClick={onClick} className={`${interactiveClasses} ${className}`}>
        <div className={iconBaseClasses}>
          <LogoName size={size} color={color} />
        </div>
      </div>
    );
  }

  // ✅ Full logo (icon + text)
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-2 ${interactiveClasses} ${className}`}
    >
      <div className={iconBaseClasses}>
        <LogoIcon size={size} color={color} animated={animated} />
      </div>
      <LogoName size={size} color={color} />
    </div>
  );
}
