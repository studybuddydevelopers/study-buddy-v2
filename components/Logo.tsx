import LogoIcon from "./LogoIcon";
import LogoName from "./LogoName";

interface LogoProps {
  variant?: "full" | "icon" | "text";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "max";
  color?: "default" | "primary" | "secondary" | "accent" | "background" | "foreground" | "success" | "warning" | "error" | "info";
  animated?: boolean;
  animation?:
    | "float"
    | "floatReverse"
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
  // Tailwind-compatible animation mapping
  const animationClasses: Record<
    NonNullable<LogoProps["animation"]>,
    string
  > = {
    none: "",
    float: "animate-[logoFloat_0.8s_ease-in-out_infinite]",
    floatReverse: "animate-[logoFloatReverse_0.8s_ease-in-out_infinite]",
    slideIn: "animate-[logoSlideIn_1.4s_ease-out_infinite]",
    bounce: "animate-[logoBounce_0.8s_ease-out_infinite]",
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
