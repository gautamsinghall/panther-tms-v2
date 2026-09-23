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
  badge?: React.ReactNode;
}

/**
 * Enterprise KPI Card:
 * - Crisp slate border with subtle elevation
 * - Modern tabular-nums display typography
 * - Smooth hover lift effect
 * - Semantic trend indicator
 */
export function KpiCard({
  title,
  value,
  subtext,
  icon,
  trend,
  className,
  badge,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden",
        className
      )}
    >
      {/* Top subtle highlight gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Label and Icon Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors font-mono">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge}
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-200 group-hover:scale-105 transition-all shrink-0 shadow-2xs">
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Metric Value & Trend Context */}
      <div className="mt-3.5">
        <div className="text-2xl sm:text-[26px] leading-8 font-bold text-slate-900 tabular-nums tracking-tight font-sans">
          {value}
        </div>

        {(trend || subtext) && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md border font-mono",
                  trend.isPositive
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
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
