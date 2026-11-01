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
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight"
          >
            {label}
            {(required || requiredMarker) && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors shadow-2xs",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-600",
            "disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-[#151620] disabled:text-slate-400 dark:disabled:text-slate-500 disabled:border-slate-200 dark:disabled:border-[#22232E]",
            error && "border-rose-400 focus-visible:ring-rose-500/20 focus-visible:border-rose-500",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-500 font-medium mt-1.5 leading-normal">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
