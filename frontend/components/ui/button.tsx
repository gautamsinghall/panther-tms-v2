import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

/**
 * Enterprise Button Component:
 * - Primary: Royal indigo gradient (from-indigo-500 to-indigo-600), inner border, subtle depth,
 *   smooth 200ms micro-elevation (-translate-y-px on hover), accessible focus rings.
 * - Secondary / Outline: Clean white surface, slate-300 border, soft shadow, subtle hover lift.
 * - Danger / Destructive: Rich rose gradient (from-rose-500 to-rose-600), inner border, micro-elevation.
 * - Ghost: Transparent, smooth slate hover background.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold select-none " +
      "transition-all duration-200 ease-out " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      "disabled:opacity-50 disabled:pointer-events-none";

    const variantStyles = {
      primary:
        "bg-gradient-to-b from-indigo-500 to-indigo-600 " +
        "border border-indigo-700/40 text-white " +
        "shadow-[0_1px_2px_rgba(79,70,229,0.22),0_0_0_1px_rgba(79,70,229,0.10)] " +
        "hover:from-indigo-400 hover:to-indigo-500 " +
        "hover:shadow-[0_2px_8px_rgba(79,70,229,0.28),0_0_0_1px_rgba(79,70,229,0.14)] " +
        "hover:-translate-y-px " +
        "active:from-indigo-600 active:to-indigo-700 active:translate-y-0 active:shadow-[0_1px_2px_rgba(79,70,229,0.18)] " +
        "focus-visible:ring-indigo-500",
      secondary:
        "bg-white border border-slate-300/90 text-slate-700 " +
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)] " +
        "hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 " +
        "hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:-translate-y-px " +
        "active:bg-slate-100 active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.04)] " +
        "focus-visible:ring-slate-400",
      outline:
        "bg-white border border-slate-200/90 text-slate-700 " +
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)] " +
        "hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 hover:-translate-y-px " +
        "active:bg-slate-100 active:translate-y-0 " +
        "focus-visible:ring-slate-300",
      ghost:
        "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70 focus-visible:ring-slate-300 rounded-xl",
      danger:
        "bg-gradient-to-b from-rose-500 to-rose-600 " +
        "border border-rose-700/40 text-white " +
        "shadow-[0_1px_2px_rgba(225,29,72,0.22),0_0_0_1px_rgba(225,29,72,0.10)] " +
        "hover:from-rose-400 hover:to-rose-500 " +
        "hover:shadow-[0_2px_8px_rgba(225,29,72,0.28)] " +
        "hover:-translate-y-px " +
        "active:from-rose-600 active:to-rose-700 active:translate-y-0 " +
        "focus-visible:ring-rose-500",
      destructive:
        "bg-gradient-to-b from-rose-500 to-rose-600 " +
        "border border-rose-700/40 text-white " +
        "shadow-[0_1px_2px_rgba(225,29,72,0.22),0_0_0_1px_rgba(225,29,72,0.10)] " +
        "hover:from-rose-400 hover:to-rose-500 " +
        "hover:shadow-[0_2px_8px_rgba(225,29,72,0.28)] " +
        "hover:-translate-y-px " +
        "active:from-rose-600 active:to-rose-700 active:translate-y-0 " +
        "focus-visible:ring-rose-500",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-9 px-4 text-xs sm:text-sm font-semibold rounded-xl gap-2",
      lg: "h-10 px-5 text-sm font-semibold rounded-xl gap-2.5",
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
