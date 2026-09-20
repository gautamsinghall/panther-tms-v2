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
        "bg-[#4F46E5] text-white hover:bg-[#4338CA] focus-visible:ring-[#4F46E5] shadow-xs",
      secondary:
        "bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F8F9FB] hover:text-[#101828] focus-visible:ring-[#D0D5DD] shadow-xs",
      outline:
        "bg-white border border-[#E4E7EC] text-[#344054] hover:bg-[#F8F9FB] hover:border-[#D0D5DD] hover:text-[#101828] focus-visible:ring-slate-300 shadow-xs",
      ghost:
        "bg-transparent text-[#667085] hover:bg-[#F1F3F6] hover:text-[#101828] focus-visible:ring-slate-300",
      danger:
        "bg-[#F04438] text-white hover:bg-[#D92D20] focus-visible:ring-[#F04438] shadow-xs",
      destructive:
        "bg-[#F04438] text-white hover:bg-[#D92D20] focus-visible:ring-[#F04438] shadow-xs",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-xs font-semibold gap-2",
      lg: "h-10 px-5 text-sm font-semibold gap-2.5",
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
