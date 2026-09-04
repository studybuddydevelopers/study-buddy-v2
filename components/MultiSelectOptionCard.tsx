"use client"; // for Next.js App Router interactivity

import StudyBuddyIcon from "@/components/StudyBuddyIcon";

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
      {checked ? (
        <StudyBuddyIcon name="checkbox" size={26} className="mr-3 shrink-0" />
      ) : (
        <span className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-gray-400 bg-background p-2.5" />
      )}

      <span className="font-medium text-gray-800">{label}</span>
    </label>
  );
}
