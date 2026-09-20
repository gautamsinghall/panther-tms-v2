import React from "react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

/**
 * KpiCard conforming to docs/design.md §11 & §22:
 * Flat surface + subtle border + clear internal hierarchy with tabular numerals.
 */
export function KpiCard({
  title,
  value,
  subtext,
  icon,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-card border border-[#E4E7EC] p-5 shadow-card transition-all duration-150 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-control bg-[#F2F4F7] flex items-center justify-center text-[#172033] shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#172033] tabular-nums">
          {value}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "text-[11px] font-semibold px-1.5 py-0.5 rounded",
                trend.isPositive
                  ? "bg-[#ECFDF3] text-[#16A34A]"
                  : "bg-[#FEF2F2] text-[#DC2626]"
              )}
            >
              {trend.isPositive ? "+" : ""}{trend.value}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-[#667085]">
              {subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
