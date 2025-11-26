"use client";

import React from "react";
import Image from "next/image";
import UnfoldIcon from "@/public/icons/unfold.svg"; // ✅ Next.js-friendly SVG import

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function SelectField({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  error,
  disabled = false,
  required = false,
  className = "",
}: SelectFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-gray-900">
          {label}{" "}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-transparent bg-gray-50 text-gray-900 text-[0.95rem] transition-all duration-200 cursor-pointer
            focus:border-primary-500 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary-300
            ${error ? "border-red-500 bg-red-50" : ""}
            ${disabled ? "bg-gray-300 cursor-not-allowed" : ""}
          `}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Arrow icon */}
        <Image
          src={UnfoldIcon}
          alt=""
          width={16}
          height={16}
          className="absolute right-4 pointer-events-none text-gray-500"
        />
      </div>

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
