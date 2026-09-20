import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  requiredMarker?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, required, requiredMarker, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#172033]"
          >
            {label}
            {(required || requiredMarker) && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full rounded-control border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs sm:text-sm text-[#172033] placeholder:text-[#98A2B3] transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#172033] focus-visible:border-[#172033]",
            "disabled:cursor-not-allowed disabled:bg-[#F2F4F7] disabled:text-[#98A2B3]",
            error && "border-[#DC2626] focus-visible:ring-[#DC2626]",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#DC2626] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#667085]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
