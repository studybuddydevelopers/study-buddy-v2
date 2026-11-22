"use client"; // if used inside /app directory for interactivity

import { useState, useRef, useEffect, useId } from "react";
import Image from "next/image";
import UnfoldIcon from "@/public/icons/unfold.svg"; // ✅ proper Next.js import path

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFieldProps {
  label?: string;
  options: Option[];
  value?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function MultiSelectField({
  label,
  options,
  value = [],
  onChange,
  placeholder = "Select options",
  error,
  disabled = false,
  required = false,
  className = "",
}: MultiSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const valueId = `${fieldId}-value`;
  const optionsId = `${fieldId}-options`;
  const errorId = `${fieldId}-error`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleValue = (val: string) => {
    if (!onChange) return;
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1 relative ${className}`}
      ref={wrapperRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      {/* Label */}
      {label && (
        <label id={labelId} htmlFor={fieldId} className="text-sm font-semibold text-gray-900">
          {label}{" "}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Select box */}
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen && !disabled}
        aria-controls={optionsId}
        aria-labelledby={label ? `${labelId} ${valueId}` : valueId}
        aria-describedby={error ? errorId : undefined}
        className={`flex justify-between items-center px-4 py-3 text-left rounded-xl border border-transparent bg-gray-50 cursor-pointer transition-all duration-200 ${
          disabled
            ? "bg-gray-200 cursor-not-allowed"
            : "hover:bg-gray-100"
        } ${error ? "border-red-500 bg-red-50" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span
          id={valueId}
          className={
            value.length ? "text-gray-900" : "text-gray-500"
          }
        >
          {value.length
            ? value
                .map((v) => options.find((o) => o.value === v)?.label)
                .join(", ")
            : placeholder}
        </span>

        {/* ✅ Next.js Image for SVG */}
        <Image
          src={UnfoldIcon}
          alt=""
          width={18}
          height={18}
          className={`text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
        <div
          id={optionsId}
          hidden={!isOpen || disabled}
          role="group"
          aria-label={label ?? placeholder}
          className="absolute top-full left-0 right-0 mt-1 bg-background rounded-xl border border-gray-200 shadow-md max-h-52 overflow-y-auto z-20"
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex min-h-11 items-center gap-2 px-4 py-2 cursor-pointer text-xs text-gray-900 hover:bg-gray-100 focus-within:bg-primary-50"
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={value.includes(opt.value)}
                onChange={() => toggleValue(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

      {/* Error message */}
      {error && <p id={errorId} role="alert" className="text-sm text-red-700 mt-1">{error}</p>}
    </div>
  );
}
