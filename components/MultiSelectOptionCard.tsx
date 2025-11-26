"use client"; // for Next.js App Router interactivity

interface MultiSelectOptionCardProps {
  label: string;
  value: string;
  checked?: boolean;
  onChange?: (value: string, checked: boolean) => void;
}

export default function MultiSelectOptionCard({
  label,
  value,
  checked = false,
  onChange,
}: MultiSelectOptionCardProps) {
  return (
    <label
      className={`flex items-center w-full border rounded-2xl px-4 py-3 cursor-pointer transition-all
        border-gray-200 hover:border-primary-300
        ${checked ? "border-primary-400 bg-accent-50" : ""}
      `}
    >
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={(e) => onChange?.(value, e.target.checked)}
        className="hidden"
      />

      {/* Custom checkbox square */}
      <span
        className={`mr-3 h-5 w-5 rounded-md border-2 p-2.5 flex items-center justify-center 
          ${checked ? "border-primary-500" : "bg-background border-gray-400 "}
        `}
      >
        <div className={checked? "border bg-primary-500 rounded-sm " : ""}>
          {checked && (
            <svg
              className="h-3 w-3 text-background"
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        
      </span>

      <span className="font-medium text-gray-800">{label}</span>
    </label>
  );
}
