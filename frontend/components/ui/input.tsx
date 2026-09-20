import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  requiredMarker?: boolean;
}

/**
 * Input component per docs/design.md §2 & §5:
 * Label above input, uppercase/label weight, required asterisk in --danger-600,
 * subtle --gray-200 border, --primary-600 focus ring, --danger-600 error.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, required, requiredMarker, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[#344054]"
          >
            {label}
            {(required || requiredMarker) && <span className="text-[#F04438] ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full rounded-control border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs sm:text-sm text-[#101828] placeholder:text-[#667085] transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4F46E5] focus-visible:border-[#4F46E5]",
            "disabled:cursor-not-allowed disabled:bg-[#F1F3F6] disabled:text-[#667085]",
            error && "border-[#F04438] focus-visible:ring-[#F04438]",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#F04438] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#667085]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
