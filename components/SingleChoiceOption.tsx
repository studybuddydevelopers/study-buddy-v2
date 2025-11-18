"use client";

interface SingleChoiceOptionProps {
  label: string;
  name: string; // radio group name
  value: string;
  checked?: boolean;
  onChange?: (value: string) => void;
}

export default function SingleChoiceOption({
  label,
  name,
  value,
  checked = false,
  onChange,
}: SingleChoiceOptionProps) {
  return (
    <label
      className={`flex items-center w-full border rounded-2xl px-4 py-3 cursor-pointer transition-all border-gray-200 hover:border-primary-300 ${
        checked ? "border-primary-400 bg-accent-50" : ""
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange?.(value)}
        className="hidden"
      />

      {/* Custom radio circle */}
      <span
        className={`mr-3 h-5 w-5 rounded-full border-2 flex items-center justify-center border-gray-400 ${
          checked ? "border-primary-500" : ""
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-primary-500"></span>}
      </span>

      <span className="font-medium text-gray-800">{label}</span>
    </label>
  );
}
