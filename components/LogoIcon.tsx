"use client"; // ✅ for App Router (if interactive)

import { useEffect } from "react";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "max";
type Color = "default" | "primary" | "secondary" | "accent" | "background" | "foreground" | "success" | "warning" | "error" | "info";

interface LogoIconProps {
  animated?: boolean;
  size?: Size;
  color?: Color;
  className?: string;
  title?: string; // optional accessible title
}

export default function LogoIcon({
  animated = false,
  size = "md",
  color = "default",
  className = "",
  title = "Study Buddy Logo",
}: LogoIconProps) {
  // Inject custom keyframes once (same as the old CSS @keyframes)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("logo-float-keyframes")) {
      const styleEl = document.createElement("style");
      styleEl.id = "logo-float-keyframes";
      styleEl.textContent = `
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  const sizeClasses: Record<Size, string> = {
    xs: "h-5 w-5",
    sm: "h-5 w-5",
    md: "h-5 w-5",
    lg: "h-7 w-7",
    xl: "h-8 w-8",
    "2xl": "h-9 w-9",
    "3xl": "h-10 w-10",
    "4xl": "h-12 w-12",
    "5xl": "h-14 w-14",
    "6xl": "h-20 w-20",
    "max": "h-[25em] w-[25em]",
  };

  const colorClasses: Record<Color, string> = {
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1024"
      height="1024"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={title}
      key={animated ? "anim" : "no-anim"}
      className={`${sizeClasses[size]} ${colorClasses[color]} ${
        animated ? "animate-[logoFloat_3s_ease-in-out_infinite]" : ""
      } ${className}`}
    >
      {/* Paths use fill="currentColor" so Tailwind text-* colors apply */}
      <path
        fill="currentColor"
        transform="scale(2 2)"
        d="M255.729 57.5763C258.592 58.3128 272.34 65.1807 275.766 66.8299L319.203 87.6908L396.291 124.717C402.799 127.871 409.331 130.973 415.887 134.025C421.794 136.773 429.129 140.096 434.709 143.31C435.401 144.419 435.366 145.288 435.362 146.617C435.332 158.943 435.321 171.299 435.322 183.624L435.326 261.894L435.324 322.64C435.322 334.202 435.588 347.128 435.104 358.571C433.999 359.372 434.212 358.972 433.922 360.085C415.591 368.024 397.448 377.372 379.44 386.118L296.144 426.304L270.455 438.705C265.779 440.971 260.131 443.892 255.447 445.892L128.898 384.597L93.1306 367.274C87.2536 364.425 81.7192 361.418 75.7233 358.807C76.0112 353.31 75.7947 345.798 75.7953 340.175L75.7971 305.385L75.7917 200.076L75.7835 165.392C75.7827 158.521 75.6606 151.213 75.8836 144.368C78.2441 143.133 80.7978 142.102 83.1761 140.847C95.8391 134.163 108.853 128.066 121.75 121.817L194.925 86.3701C209.629 79.1657 224.393 72.0871 239.218 65.1352C242.618 63.5437 252.68 58.4754 255.729 57.5763ZM113.961 333.886L198.068 374.707L220.215 385.477C225.396 388.034 230.73 390.989 236.14 392.914C236.496 362.42 236.192 331.306 236.193 300.754L236.201 266.807C236.205 261.287 236.458 254.552 236.173 249.16C231.449 246.364 222.886 242.57 217.649 240.038L184.11 223.739L137.621 201.159C130.294 197.578 121.335 192.824 114.078 189.605C113.768 195.535 113.954 202.641 113.954 208.667L113.958 241.722L113.961 333.886ZM134.449 157.486C138.586 160.067 146.632 163.69 151.187 165.895L181.253 180.461L231.058 204.621C235.781 206.91 252.77 216.14 256.498 216.06C265.591 211.488 275.268 207.096 284.478 202.619L340.997 175.097C346.652 172.356 352.326 169.655 358.019 166.994C363.143 164.656 372.262 160.673 376.822 157.577C370.55 154.91 363.978 151.688 357.8 148.758C345.878 143.131 334.021 137.368 322.231 131.471C305.364 123.108 288.395 114.952 271.327 107.006C268.897 105.857 256.767 99.6137 255.171 99.5088C253.096 100.349 251.116 101.385 249.116 102.388C242.339 105.784 235.488 109.035 228.641 112.286L165.078 142.823C156.08 147.216 147.303 152.025 138.139 156.07C136.922 156.607 135.727 157.111 134.449 157.486Z"
      />
      <path
        fill="currentColor"
        fillOpacity="0.97254902"
        transform="scale(2 2)"
        d="M434.709 143.31C435.501 143.751 436.176 143.979 436.541 144.767C437.07 151.287 436.671 162.983 436.673 169.881L436.676 220.089L436.677 309.853C436.677 326.005 436.854 342.555 436.622 358.681C435.714 359.196 434.893 359.701 433.922 360.085C434.212 358.972 433.999 359.372 435.104 358.571C435.588 347.128 435.322 334.202 435.324 322.64L435.326 261.894L435.322 183.624C435.321 171.299 435.332 158.943 435.362 146.617C435.366 145.288 435.401 144.419 434.709 143.31Z"
      />
    </svg>
  );
}
