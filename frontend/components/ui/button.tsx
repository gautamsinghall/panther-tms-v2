import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gold" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-control transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.99]";

    const variantStyles = {
      // Primary Action per docs/design.md §3.1 & §20 (#172033 Dark Navy/Charcoal)
      primary:
        "bg-[#172033] text-white hover:bg-[#0F172A] focus-visible:ring-[#172033] shadow-xs",
      // Brand Gold for selective high-value CTAs per docs/design.md §18
      gold:
        "bg-[#C9A227] text-white hover:bg-[#A88416] focus-visible:ring-[#C9A227] shadow-xs",
      // Supporting Secondary
      secondary:
        "bg-[#F2F4F7] text-[#172033] hover:bg-[#E4E7EC] focus-visible:ring-slate-400 border border-transparent",
      // Clean Enterprise Outline
      outline:
        "border border-[#E4E7EC] bg-white text-[#172033] hover:bg-[#F7F8FA] hover:border-[#D0D5DD] focus-visible:ring-slate-300 shadow-xs",
      // Ghost / Low-emphasis
      ghost:
        "bg-transparent text-[#667085] hover:bg-[#F2F4F7] hover:text-[#172033] focus-visible:ring-slate-300",
      // Destructive
      danger:
        "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-rose-500 shadow-xs",
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
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
