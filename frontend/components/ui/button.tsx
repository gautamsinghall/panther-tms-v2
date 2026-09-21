import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

/**
 * Button per docs/design.md §5:
 * - Primary: filled --primary-600 (#4F46E5), white text, hover --primary-700 (#4338CA)
 * - Secondary / Outline: white bg, --gray-300 (#D0D5DD) border, --gray-700 (#344054) text, hover --gray-50 (#F8F9FB)
 * - Destructive: filled --danger-600 (#F04438), white text
 * - Ghost: no border/bg, text --gray-500 (#667085), hover --gray-100 (#F1F3F6), hover text --gray-900 (#101828)
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-control transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.99]";

    const variantStyles = {
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500 shadow-xs border border-indigo-700/50",
      secondary:
        "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 focus-visible:ring-slate-400 shadow-2xs",
      outline:
        "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-slate-300 shadow-2xs",
      ghost:
        "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-xs border border-rose-700/50",
      destructive:
        "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-xs border border-rose-700/50",
    };

    const sizeStyles = {
      sm: "h-8 px-2.5 text-xs gap-1.5",
      md: "h-9 px-3.5 text-xs font-semibold gap-2",
      lg: "h-10 px-4 text-sm font-semibold gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant] || variantStyles.primary, sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
