"use client";

import { useState } from "react";
import { LuEye, LuEyeClosed } from "react-icons/lu";

interface TextFieldProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function TextField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className = "",
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-gray-900">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl border border-transparent bg-gray-50 text-gray-900 text-[0.95rem] transition-all duration-200
            placeholder:text-gray-400
            focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300
            ${error ? "border-red-500 bg-red-50" : ""}
            ${disabled ? "bg-gray-200 cursor-not-allowed" : ""}
          `}
        />

        {/* Password toggle button */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className={`absolute right-3 flex items-center justify-center text-gray-500 transition-colors duration-200
              hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400
            `}
          >
            {showPassword ? <LuEye size={20} /> : <LuEyeClosed size={20} />}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
