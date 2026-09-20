import React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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
 * KPI / Dashboard Cards per docs/design.md §5:
 * - White card, --gray-200 border, 20px padding
 * - Label above in Label style (12px, uppercase, --gray-500)
 * - Large tabular-nums number in Display size (28px/36px 600)
 * - Small trend indicator in success/danger color
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
        "bg-white rounded-card border border-[#E4E7EC] p-5 flex flex-col justify-between transition-colors",
        className
      )}
    >
      {/* Label and Icon Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.02em] text-[#667085]">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-control bg-[#F8F9FB] border border-[#E4E7EC] flex items-center justify-center text-[#4F46E5] shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Metric Value & Trend Context */}
      <div className="mt-3">
        <div className="text-[28px] leading-[36px] font-semibold text-[#101828] tabular-nums font-mono">
          {value}
        </div>

        {(trend || subtext) && (
          <div className="mt-1 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-[4px]",
                  trend.isPositive
                    ? "bg-[#ECFDF3] text-[#027A48]"
                    : "bg-[#FEF3F2] text-[#B42318]"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {trend.value}
              </span>
            )}
            {subtext && (
              <span className="text-xs text-[#667085]">
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
