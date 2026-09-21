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
        "bg-white rounded-card border border-slate-200/80 p-5 flex flex-col justify-between shadow-card hover:border-slate-300 hover:shadow-card-hover transition-all duration-200 group",
        className
      )}
    >
      {/* Label and Icon Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-control bg-slate-50 border border-slate-200/80 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-50/70 group-hover:border-indigo-200/60 transition-colors shrink-0 shadow-2xs">
            {icon}
          </div>
        )}
      </div>

      {/* Metric Value & Trend Context */}
      <div className="mt-3">
        <div className="text-2xl leading-8 font-bold text-slate-900 tabular-nums tracking-tight font-sans">
          {value}
        </div>

        {(trend || subtext) && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-md border",
                  trend.isPositive
                    ? "bg-emerald-50 border-emerald-200/70 text-emerald-800"
                    : "bg-rose-50 border-rose-200/70 text-rose-800"
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
              <span className="text-xs text-slate-500 font-normal">
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
