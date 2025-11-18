"use client";

interface ProgressBarProps {
  label?: string;           // e.g., "Mathematics"
  percentage: number;       // 0–100
  helperText?: string;      // e.g., "1 hour 30 minutes"
  showPercentage?: boolean; // toggle right-side %
  color?: "primary" | "secondary" | "success" | "warning" | "error";
}

export default function ProgressBar({
  label,
  percentage,
  helperText,
  showPercentage = true,
  color = "primary",
}: ProgressBarProps) {
  const colorClasses: Record<NonNullable<ProgressBarProps["color"]>, string> = {
    primary: "bg-primary-600",
    secondary: "bg-secondary-700",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
  };

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Header row: label + helper/percentage */}
      {(label || helperText || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="font-medium text-gray-900">{label}</span>}

          {helperText ? (
            <span className="font-medium text-gray-900">{helperText}</span>
          ) : (
            showPercentage && (
              <span className="font-medium text-gray-900">{percentage}%</span>
            )
          )}
        </div>
      )}

      {/* Progress bar track */}
      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-in-out ${colorClasses[color]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
